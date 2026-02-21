import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
// Load .env first, then .env.local (which takes precedence)
config({ path: resolve(root, '.env') });
config({ path: resolve(root, '.env.local'), override: true });

import express from 'express';
import analyzeHandler from './analyze.js';

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(express.json({ limit: '20mb' })); // large limit for base64 images

app.post('/api/analyze', analyzeHandler);
app.options('/api/analyze', analyzeHandler); // handle CORS preflight

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
    console.log(`[api] Server running on http://localhost:${PORT}`);
    if (!process.env.GEMINI_API_KEY && !process.env.VITE_GEMINI_API_KEY) {
        console.warn('[api] WARNING: GEMINI_API_KEY is not set in .env.local!');
    }
});
