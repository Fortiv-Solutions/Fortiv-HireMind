/**
 * AI Job Description Generator using Google Gemini
 * Tries multiple models in order until one succeeds.
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

// Fallback chain: tries each model in order until one works
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
];

async function callGemini(model: string, prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
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
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  const data = await response.json();

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No response generated');
  }

  return data.candidates[0].content.parts[0].text.trim();
}

/** Strip any residual markdown symbols the model may still produce */
function cleanMarkdown(text: string): string {
  return text
    // Remove bold/italic markers
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    // Remove heading hashes
    .replace(/^#{1,6}\s+/gm, '')
    // Replace markdown dashes/asterisk bullets with •
    .replace(/^[\s]*[-*]\s+/gm, '• ')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Collapse 3+ consecutive blank lines into 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function generateJobDescription(input: JobDescriptionInput): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.');
  }

  const prompt = buildPrompt(input);
  const errors: string[] = [];

  for (const model of GEMINI_MODELS) {
    try {
      console.log(`Trying Gemini model: ${model}`);
      const result = await callGemini(model, prompt, apiKey);
      console.log(`Success with model: ${model}`);
      return cleanMarkdown(result);
    } catch (err: any) {
      const msg = err.message || 'Unknown error';
      console.warn(`Model ${model} failed: ${msg}`);
      errors.push(`${model}: ${msg}`);

      // Only continue to next model on overload (503) or not-found (404) errors
      const isRetryable =
        msg.includes('503') ||
        msg.includes('Service Unavailable') ||
        msg.includes('high demand') ||
        msg.includes('not found') ||
        msg.includes('404') ||
        msg.includes('not supported');

      if (!isRetryable) {
        // Hard failure (e.g. invalid API key) — no point trying other models
        throw new Error(msg);
      }
    }
  }

  throw new Error(
    `All Gemini models are currently unavailable. Please try again in a moment.\n\nDetails: ${errors.join(' | ')}`
  );
}

function buildPrompt(input: JobDescriptionInput): string {
  const { title, department, location, jobType, experienceYears, education, skills } = input;
  const skillsList = skills.filter((s) => s.trim()).join(', ') || 'relevant technical skills';

  return `You are a professional HR specialist and job description writer. Create a comprehensive, professional, and engaging job description based on the following information:

Job Title: ${title}
${department ? `Department: ${department}` : ''}
${location ? `Location: ${location}` : ''}
Job Type: ${jobType}
Minimum Experience Required: ${experienceYears} year${experienceYears !== 1 ? 's' : ''}
${education ? `Education Requirement: ${education}` : ''}
Required Skills: ${skillsList}

Write a well-structured job description using PLAIN TEXT ONLY. Do not use any markdown formatting — no asterisks, no hashes, no dashes for bullets, no bold, no italics, no horizontal rules.

Use this exact structure with these exact section headings on their own line, followed by a blank line, then the content:

About the Role
[2-3 sentence compelling overview of the position and its impact]

Key Responsibilities
[List each responsibility on its own line, starting with a bullet point character •]

Required Skills & Qualifications
[List each qualification on its own line, starting with a bullet point character •]

Nice to Have
[2-3 nice-to-have items, each on its own line starting with •]

What Success Looks Like in This Role
[3-4 measurable outcomes, each on its own line starting with •]

Why Join Us
[3-4 reasons to join, each on its own line starting with •]

Rules:
- Use plain text only, no markdown symbols whatsoever
- Use • as the only bullet character
- Keep the tone professional, warm, and engaging
- Do not mention any company name — keep it generic
- Do not add any intro or outro text outside the sections above`;
}
