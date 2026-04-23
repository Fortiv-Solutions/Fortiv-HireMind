/**
 * AI Job Description Generator using Google Gemini
 * Production-grade: model fallback chain, exponential backoff, clean output.
 */

interface JobDescriptionInput {
  title: string;
  department?: string;
  location?: string;
  jobType: string;
  experienceYears: number;
  education?: string;
  skills: string[];
}

// ─── Model registry ───────────────────────────────────────────────────────────
interface ModelConfig {
  id: string;
  maxRetries: number;
}

const GEMINI_MODELS: ModelConfig[] = [
  { id: 'gemini-1.5-flash',      maxRetries: 2 },
  { id: 'gemini-1.5-pro',        maxRetries: 1 },
  { id: 'gemini-2.0-flash-lite', maxRetries: 2 },
  { id: 'gemini-2.5-flash',      maxRetries: 1 },
];

// ─── Error classification ─────────────────────────────────────────────────────
type ErrorKind = 'HARD_FAIL' | 'MODEL_SKIP' | 'TRANSIENT';

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

  return 'TRANSIENT';
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Gemini API call ──────────────────────────────────────────────────────────
async function callGemini(model: ModelConfig, prompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
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

  if (!data.candidates?.length) throw new Error('No response generated');

  const text: string | undefined = data.candidates[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from model');

  return text.trim();
}

// ─── Markdown cleaner ─────────────────────────────────────────────────────────
function cleanMarkdown(text: string): string {
  return text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[\s]*[-*]\s+/gm, '• ')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Prompt builder ───────────────────────────────────────────────────────────
function buildPrompt(input: JobDescriptionInput): string {
  const { title, department, location, jobType, experienceYears, education, skills } = input;
  const skillsList = skills.filter((s) => s.trim()).join(', ') || 'relevant technical skills';

  return `You are a professional HR specialist. Create a comprehensive job description using PLAIN TEXT ONLY — no markdown, no asterisks, no hashes, no dashes for bullets.

Job Title: ${title}
${department ? `Department: ${department}` : ''}
${location ? `Location: ${location}` : ''}
Job Type: ${jobType}
Minimum Experience: ${experienceYears} year${experienceYears !== 1 ? 's' : ''}
${education ? `Education: ${education}` : ''}
Required Skills: ${skillsList}

Use this exact structure with section headings on their own line:

About the Role
[2-3 sentence overview]

Key Responsibilities
[Each item on its own line starting with •]

Required Skills & Qualifications
[Each item on its own line starting with •]

Nice to Have
[2-3 items starting with •]

What Success Looks Like in This Role
[3-4 measurable outcomes starting with •]

Why Join Us
[3-4 reasons starting with •]

Rules:
- Plain text only, use • as the only bullet character
- Professional, warm, engaging tone
- Do not mention any company name
- No intro or outro text outside the sections above`;
}

// ─── Skills prompt builder ────────────────────────────────────────────────────
function buildSkillsPrompt(input: JobDescriptionInput, description?: string): string {
  const { title, department, jobType, experienceYears, education } = input;

  return `You are an expert HR specialist. Based on the job details below, return a JSON array of required skills — nothing else, no markdown, no explanation.

Job Title: ${title}
${department ? `Department: ${department}` : ''}
Job Type: ${jobType}
Minimum Experience: ${experienceYears} year${experienceYears !== 1 ? 's' : ''}
${education ? `Education: ${education}` : ''}
${description ? `Job Description:\n${description.slice(0, 4000)}` : ''}

Return ONLY a JSON array of skill strings, e.g.:
["React", "TypeScript", "Node.js", "REST APIs", "Git"]

Rules:
- 6 to 12 skills only
- Each skill is a short, specific term (1-4 words)
- Include both technical and soft skills relevant to the role
- Return ONLY the JSON array, no other text`;
}

// ─── Skills response parser ───────────────────────────────────────────────────
function parseSkillsResponse(raw: string): string[] {
  let s = raw.trim();

  // Strip markdown fences
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Extract first [...] block
  const match = s.match(/\[[\s\S]*\]/);
  if (match) s = match[0];

  let parsed: any;
  try {
    parsed = JSON.parse(s);
  } catch {
    throw new Error('JSON parse failed — model returned malformed skills output');
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Expected a non-empty array of skills from AI response');
  }

  return parsed
    .map((item: any) => String(item).trim())
    .filter((item) => item.length > 0)
    .slice(0, 12);
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

// ─── Public API ───────────────────────────────────────────────────────────────
export async function generateJobDescription(input: JobDescriptionInput): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error(
      'Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.'
    );
  }

  const prompt = buildPrompt(input);
  const attemptLog: string[] = [];

  for (const model of GEMINI_MODELS) {
    let attempt = 0;

    while (attempt <= model.maxRetries) {
      try {
        console.log(`[Gemini] Trying ${model.id} (attempt ${attempt + 1})`);
        const raw = await callGemini(model, prompt, apiKey);
        console.log(`[Gemini] Success with ${model.id}`);
        return cleanMarkdown(raw);
      } catch (err: any) {
        const msg: string = err?.message || 'Unknown error';
        const status: number | undefined = err?.status;
        const kind = classifyError(msg, status);

        console.warn(`[Gemini] ${model.id} attempt ${attempt + 1} — ${kind}: ${msg}`);
        attemptLog.push(`${model.id}[${attempt + 1}]: ${msg}`);

        if (kind === 'HARD_FAIL') {
          throw new Error(friendlyMessage(msg));
        }

        if (kind === 'MODEL_SKIP') {
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
    'Unable to generate job description right now. All AI models are busy or unavailable. Please try again in a moment.'
  );
}

// ─── Public API: Skills Generator ─────────────────────────────────────────────
export async function generateSkillsFromInput(
  input: JobDescriptionInput,
  description?: string
): Promise<string[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error(
      'Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.'
    );
  }

  if (!input.title.trim()) {
    throw new Error('Please enter a job title before generating skills.');
  }

  const prompt = buildSkillsPrompt(input, description);
  const attemptLog: string[] = [];

  for (const model of GEMINI_MODELS) {
    let attempt = 0;

    while (attempt <= model.maxRetries) {
      try {
        console.log(`[Gemini Skills] Trying ${model.id} (attempt ${attempt + 1})`);
        const raw = await callGemini(model, prompt, apiKey);
        const skills = parseSkillsResponse(raw);
        console.log(`[Gemini Skills] Success with ${model.id}`);
        return skills;
      } catch (err: any) {
        const msg: string = err?.message || 'Unknown error';
        const status: number | undefined = err?.status;
        const kind = classifyError(msg, status);

        console.warn(`[Gemini Skills] ${model.id} attempt ${attempt + 1} — ${kind}: ${msg}`);
        attemptLog.push(`${model.id}[${attempt + 1}]: ${msg}`);

        if (kind === 'HARD_FAIL') {
          throw new Error(friendlyMessage(msg));
        }

        if (kind === 'MODEL_SKIP') {
          break;
        }

        // TRANSIENT — wait and retry
        attempt++;
        if (attempt <= model.maxRetries) {
          const backoff = Math.min(1000 * 2 ** attempt, 8000);
          console.log(`[Gemini Skills] Retrying in ${backoff}ms...`);
          await sleep(backoff);
        }
      }
    }
  }

  console.error('[Gemini Skills] All models exhausted:', attemptLog);
  throw new Error(
    'Unable to generate skills right now. All AI models are busy or unavailable. Please try again in a moment.'
  );
}
