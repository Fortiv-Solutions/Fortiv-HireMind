/**
 * AI Criteria Generator using Google Gemini
 * Production-grade: model fallback chain, exponential backoff, robust JSON repair.
 */

import type { CriterionType } from '../types/database';

export interface GeneratedCriteriaItem {
  criterion_name: string;
  criterion_description: string;
  weight: number;
  criterion_type: CriterionType;
  expected_value: string;
}

export interface GeneratedCriteria {
  name: string;
  description: string;
  items: GeneratedCriteriaItem[];
}

// ─── Model registry ───────────────────────────────────────────────────────────
// Ordered by preference. Each entry carries its own retry budget and whether
// it supports the JSON MIME type constraint.
interface ModelConfig {
  id: string;
  supportsJsonMime: boolean;
  maxRetries: number;
}

const GEMINI_MODELS: ModelConfig[] = [
  { id: 'gemini-1.5-flash',      supportsJsonMime: true,  maxRetries: 2 },
  { id: 'gemini-1.5-pro',        supportsJsonMime: true,  maxRetries: 1 },
  { id: 'gemini-2.0-flash-lite', supportsJsonMime: true,  maxRetries: 2 },
  { id: 'gemini-2.5-flash',      supportsJsonMime: true,  maxRetries: 1 },
];

// ─── Error classification ─────────────────────────────────────────────────────
type ErrorKind =
  | 'HARD_FAIL'      // invalid key, quota exhausted — stop immediately
  | 'MODEL_SKIP'     // model gone / not supported — skip to next model
  | 'TRANSIENT'      // overload / rate-limit — retry with backoff
  | 'BAD_OUTPUT';    // model responded but JSON was malformed — skip to next model

function classifyError(message: string, status?: number): ErrorKind {
  const m = message.toLowerCase();

  if (
    status === 400 ||
    m.includes('api key') ||
    m.includes('invalid') ||
    m.includes('permission') ||
    m.includes('billing') ||
    m.includes('quota') ||
    m.includes('resource_exhausted')
  ) return 'HARD_FAIL';

  if (
    status === 404 ||
    m.includes('not found') ||
    m.includes('not supported') ||
    m.includes('no longer available') ||
    m.includes('deprecated')
  ) return 'MODEL_SKIP';

  if (
    status === 429 ||
    status === 503 ||
    m.includes('rate limit') ||
    m.includes('high demand') ||
    m.includes('overloaded') ||
    m.includes('service unavailable') ||
    m.includes('try again')
  ) return 'TRANSIENT';

  if (
    m.includes('json') ||
    m.includes('parse') ||
    m.includes('missing required') ||
    m.includes('unexpected token') ||
    m.includes('no response generated')
  ) return 'BAD_OUTPUT';

  // Unknown — treat as transient so we at least try the next model
  return 'TRANSIENT';
}

// ─── Sleep helper ─────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Gemini API call ──────────────────────────────────────────────────────────
async function callGemini(
  model: ModelConfig,
  prompt: string,
  apiKey: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${apiKey}`;

  const generationConfig: Record<string, unknown> = {
    temperature: 0.3,
    topP: 0.95,
    maxOutputTokens: 2048,
  };

  if (model.supportsJsonMime) {
    generationConfig.responseMimeType = 'application/json';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData?.error?.message || `HTTP ${response.status} ${response.statusText}`;
    const err = new Error(message) as any;
    err.status = response.status;
    throw err;
  }

  const data = await response.json();

  if (!data.candidates?.length) {
    throw new Error('No response generated');
  }

  const text: string | undefined = data.candidates[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from model');

  return text.trim();
}

// ─── JSON repair & parse ──────────────────────────────────────────────────────
function extractJson(raw: string): string {
  let s = raw.trim();

  // Strip markdown fences
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // If it starts with { it's probably already clean
  if (s.startsWith('{')) return s;

  // Try to extract the first {...} block
  const match = s.match(/\{[\s\S]*\}/);
  if (match) return match[0];

  return s;
}

// ─── Response parser ──────────────────────────────────────────────────────────
function parseCriteriaResponse(raw: string): GeneratedCriteria {
  const cleaned = extractJson(raw);

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`JSON parse failed — model returned malformed output`);
  }

  if (!parsed.name || !Array.isArray(parsed.items) || parsed.items.length === 0) {
    throw new Error('Missing required fields in AI response');
  }

  const validTypes: CriterionType[] = ['skill', 'experience', 'education', 'custom'];

  const items: GeneratedCriteriaItem[] = parsed.items.map((item: any, i: number) => ({
    criterion_name: String(item.criterion_name || `Criterion ${i + 1}`).slice(0, 100),
    criterion_description: String(item.criterion_description || '').slice(0, 500),
    weight: Math.min(1, Math.max(0.1, parseFloat(item.weight) || 0.5)),
    criterion_type: validTypes.includes(item.criterion_type) ? item.criterion_type : 'custom',
    expected_value: String(item.expected_value || '').slice(0, 200),
  }));

  return {
    name: String(parsed.name).slice(0, 150),
    description: String(parsed.description || '').slice(0, 500),
    items,
  };
}

// ─── Prompt builder ───────────────────────────────────────────────────────────
function buildCriteriaPrompt(jobDescription: string): string {
  return `You are an expert HR specialist. Analyze the job description below and return a JSON object — nothing else, no markdown, no explanation.

JOB DESCRIPTION:
${jobDescription.slice(0, 8000)}

Return this exact JSON structure:
{
  "name": "concise criteria set name (e.g. Senior Software Engineer Criteria)",
  "description": "brief description of what this criteria set evaluates",
  "items": [
    {
      "criterion_name": "short name (2-5 words)",
      "criterion_description": "what to look for when evaluating this criterion",
      "weight": 0.8,
      "criterion_type": "skill",
      "expected_value": "concrete measurable expectation"
    }
  ]
}

Rules:
- 5 to 10 items only
- weight: 0.8-1.0 for must-haves, 0.3-0.5 for nice-to-haves
- criterion_type must be one of: skill, experience, education, custom
- Return ONLY the JSON object, no other text`;
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function generateCriteriaFromJobDescription(
  jobDescription: string
): Promise<GeneratedCriteria> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error(
      'Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.'
    );
  }

  if (!jobDescription?.trim()) {
    throw new Error('Job description cannot be empty.');
  }

  const prompt = buildCriteriaPrompt(jobDescription);
  const attemptLog: string[] = [];

  for (const model of GEMINI_MODELS) {
    let attempt = 0;

    while (attempt <= model.maxRetries) {
      try {
        console.log(`[Gemini] Trying ${model.id} (attempt ${attempt + 1})`);
        const raw = await callGemini(model, prompt, apiKey);
        const result = parseCriteriaResponse(raw);
        console.log(`[Gemini] Success with ${model.id}`);
        return result;
      } catch (err: any) {
        const msg: string = err?.message || 'Unknown error';
        const status: number | undefined = err?.status;
        const kind = classifyError(msg, status);

        console.warn(`[Gemini] ${model.id} attempt ${attempt + 1} — ${kind}: ${msg}`);
        attemptLog.push(`${model.id}[${attempt + 1}]: ${msg}`);

        if (kind === 'HARD_FAIL') {
          // No point trying anything else
          throw new Error(friendlyMessage(msg));
        }

        if (kind === 'MODEL_SKIP' || kind === 'BAD_OUTPUT') {
          // Move on to the next model immediately
          break;
        }

        // TRANSIENT — wait and retry
        attempt++;
        if (attempt <= model.maxRetries) {
          const backoff = Math.min(1000 * 2 ** attempt, 8000);
          console.log(`[Gemini] Retrying in ${backoff}ms...`);
          await sleep(backoff);
        }
      }
    }
  }

  console.error('[Gemini] All models exhausted:', attemptLog);
  throw new Error(
    'Unable to generate criteria right now. All AI models are busy or unavailable. Please try again in a moment.'
  );
}

// ─── User-friendly error messages ─────────────────────────────────────────────
function friendlyMessage(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('api key') || m.includes('invalid')) {
    return 'Your Gemini API key is invalid. Please check your .env file.';
  }
  if (m.includes('quota') || m.includes('resource_exhausted')) {
    return 'Your Gemini API quota has been exceeded. Please check your Google AI Studio usage.';
  }
  if (m.includes('billing')) {
    return 'Billing is not enabled for your Gemini API account. Please check Google AI Studio.';
  }
  return raw;
}
