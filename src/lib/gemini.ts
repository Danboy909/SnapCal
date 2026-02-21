import type { ExtractionResult, CalendarEvent } from '../types';

const API_URL = '/api/analyze';

async function callApi(body: object): Promise<ExtractionResult> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `API error ${res.status}`);
  }

  return res.json() as Promise<ExtractionResult>;
}

export async function extractEventFromImage(imageBase64: string): Promise<ExtractionResult> {
  // Strip the data URI prefix to get raw base64
  const base64Data = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');
  const mediaTypeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
  const mimeType = mediaTypeMatch ? mediaTypeMatch[1] : 'image/jpeg';

  return callApi({ type: 'image', image: base64Data, mimeType });
}

export async function extractEventFromText(text: string): Promise<ExtractionResult> {
  return callApi({ type: 'text', text });
}

export async function refineEventWithAI(currentEvent: CalendarEvent, instructions: string): Promise<CalendarEvent> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'refine', event: currentEvent, instructions }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `API error ${res.status}`);
  }

  return res.json() as Promise<CalendarEvent>;
}
