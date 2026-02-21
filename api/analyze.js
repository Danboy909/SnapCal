import { GoogleGenerativeAI } from '@google/generative-ai';

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10;

/** @type {Map<string, number[]>} */
const ipTimestamps = new Map();

function isRateLimited(ip) {
    const now = Date.now();
    const timestamps = (ipTimestamps.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (timestamps.length >= RATE_LIMIT_MAX) {
        ipTimestamps.set(ip, timestamps);
        return true;
    }
    timestamps.push(now);
    ipTimestamps.set(ip, timestamps);
    return false;
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

export async function analyzeHandler(req, res) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';

    if (isRateLimited(ip)) {
        return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY not set.' });
    }

    const { type, image, mimeType, text } = req.body;

    if (!type || (type === 'image' && !image) || (type === 'text' && !text)) {
        return res.status(400).json({ error: 'Invalid request body.' });
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
                { inlineData: { data: image, mimeType: mimeType || 'image/jpeg' } },
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
        return res.json(data);
    } catch (err) {
        console.error('[api/analyze] Error:', err?.message || err);
        if (err instanceof SyntaxError) {
            return res.status(502).json({ error: 'Failed to parse AI response.' });
        }
        return res.status(500).json({ error: err?.message || 'Internal server error.' });
    }
}
