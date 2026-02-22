import { GoogleGenerativeAI } from '@google/generative-ai';

// --- Rate Limiter ---
// Separate trackers for image uploads (20/hr) and text analysis (100/hr)
const HOUR_MS = 60 * 60 * 1000;

/** @type {Map<string, number[]>} */
const imageTimestamps = new Map();
/** @type {Map<string, number[]>} */
const textTimestamps = new Map();

const LIMITS = {
    image: { max: 20, windowMs: HOUR_MS, label: 'screenshot uploads' },
    text: { max: 100, windowMs: HOUR_MS, label: 'text analyses' },
};

function checkRateLimit(ip, type) {
    const { max, windowMs } = LIMITS[type] || LIMITS.text;
    const store = type === 'image' ? imageTimestamps : textTimestamps;
    const now = Date.now();
    const timestamps = (store.get(ip) || []).filter(t => now - t < windowMs);
    if (timestamps.length >= max) {
        store.set(ip, timestamps);
        return { limited: true, remaining: 0, resetInMinutes: Math.ceil((timestamps[0] + windowMs - now) / 60000) };
    }
    timestamps.push(now);
    store.set(ip, timestamps);
    return { limited: false, remaining: max - timestamps.length };
}

const SHARED_PROMPT_RULES = (currentDate, year) => `
  IMPORTANT: Today's date is ${currentDate}. Use this as the reference for relative dates.
  Return a valid JSON object. No markdown, no code blocks — raw JSON only:
  {
    "events": [
      {
        "title": "Event Title",
        "date": "YYYY-MM-DD",
        "time": "HH:MM",
        "location": "Location or TBD",
        "description": "Brief description",
        "durationMinutes": 60,
        "recurrence": ["RRULE:FREQ=WEEKLY;BYDAY=MO"]
      }
    ],
    "confidence": 0.9
  }
  Rules:
  - Use ${currentDate} for relative dates ("tomorrow", "next week", etc.).
  - Missing year → assume ${year} or next occurrence.
  - Missing duration → default 60 minutes.
  - Recurring events → add valid RRULE in recurrence array.
  - No events found → return { "events": [], "confidence": 0 }.
`;

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    const { type, image, mimeType, text } = req.body;

    if (!type || (type === 'image' && !image) || (type === 'text' && !text)) {
        return res.status(400).json({ error: 'Invalid request body.' });
    }

    // Apply per-type rate limiting
    const rateResult = checkRateLimit(ip, type);
    if (rateResult.limited) {
        res.setHeader('Retry-After', String(rateResult.resetInMinutes * 60));
        return res.status(429).json({
            error: `Rate limit exceeded: too many ${LIMITS[type]?.label || 'requests'}. Try again in ${rateResult.resetInMinutes} minute(s).`,
            retryAfterMinutes: rateResult.resetInMinutes,
        });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY not set.' });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const today = new Date();
        const currentDate = today.toISOString().split('T')[0];
        const year = today.getFullYear();
        const rules = SHARED_PROMPT_RULES(currentDate, year);

        let result;

        if (type === 'image') {
            const prompt = `Analyze this image and extract any calendar events found.\n${rules}`;
            result = await model.generateContent([
                prompt,
                { inlineData: { data: image, mimeType: mimeType || 'image/png' } },
            ]);
        } else if (type === 'text') {
            const prompt = `Analyze this text and extract any calendar events found.\n${rules}\nText to analyze:\n${text}`;
            result = await model.generateContent(prompt);
        } else {
            return res.status(400).json({ error: 'Unknown type. Use "image" or "text".' });
        }

        const responseText = result.response.text();
        const jsonString = responseText.replace(/```json\n?|\n?```/g, '').trim();
        const data = JSON.parse(jsonString);
        return res.status(200).json(data);

    } catch (err) {
        console.error('[api/analyze] Error:', err?.message || err);
        if (err instanceof SyntaxError) {
            return res.status(502).json({ error: 'Failed to parse AI response.' });
        }
        return res.status(500).json({ error: err?.message || 'Internal server error.' });
    }
}
