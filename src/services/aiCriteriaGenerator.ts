/**
 * AI Criteria Generator using Google Gemini
 * Generates CV evaluation criteria from a job description.
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

// Fallback chain: tries each model in order until one succeeds
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
          temperature: 0.4,
          topP: 0.95,
          maxOutputTokens: 2048,
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

/**
 * Generate CV evaluation criteria from a job description using Gemini AI.
 */
export async function generateCriteriaFromJobDescription(
  jobDescription: string
): Promise<GeneratedCriteria> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error(
      'Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.'
    );
  }

  const prompt = buildCriteriaPrompt(jobDescription);
  const errors: string[] = [];

  for (const model of GEMINI_MODELS) {
    try {
      console.log(`Trying Gemini model: ${model}`);
      const result = await callGemini(model, prompt, apiKey);
      console.log(`Success with model: ${model}`);
      return parseCriteriaResponse(result);
    } catch (err: any) {
      const msg = err.message || 'Unknown error';
      console.warn(`Model ${model} failed: ${msg}`);
      errors.push(`${model}: ${msg}`);

      const isRetryable =
        msg.includes('503') ||
        msg.includes('Service Unavailable') ||
        msg.includes('high demand') ||
        msg.includes('not found') ||
        msg.includes('404') ||
        msg.includes('not supported');

      if (!isRetryable) {
        throw new Error(msg);
      }
    }
  }

  throw new Error(
    `All Gemini models are currently unavailable. Please try again in a moment.\n\nDetails: ${errors.join(' | ')}`
  );
}

function buildCriteriaPrompt(jobDescription: string): string {
  return `You are an expert HR specialist and talent acquisition consultant. Analyze the following job description and generate a structured CV evaluation criteria set.

JOB DESCRIPTION:
${jobDescription}

Generate a JSON response with the following exact structure. Do not include any text outside the JSON block:

{
  "name": "string — a concise criteria set name based on the role (e.g., 'Senior Software Engineer Criteria')",
  "description": "string — a brief description of what this criteria set evaluates",
  "items": [
    {
      "criterion_name": "string — short name for the criterion (e.g., 'React Experience')",
      "criterion_description": "string — what to look for when evaluating this criterion",
      "weight": number — importance weight between 0.1 and 1.0,
      "criterion_type": "skill" | "experience" | "education" | "custom",
      "expected_value": "string — what the ideal candidate should have (e.g., '3+ years', 'Bachelor degree in CS')"
    }
  ]
}

Rules:
- Generate between 5 and 10 criteria items that best represent the role requirements
- Assign higher weights (0.8–1.0) to must-have requirements and lower weights (0.3–0.5) to nice-to-haves
- Use criterion_type "skill" for technical/soft skills, "experience" for work history, "education" for academic requirements, "custom" for anything else
- Make criterion_name concise (2–5 words)
- Make criterion_description specific and actionable for a recruiter
- Make expected_value concrete and measurable
- Ensure weights reflect the relative importance stated or implied in the job description
- Return ONLY valid JSON, no markdown code blocks, no extra text`;
}

function parseCriteriaResponse(raw: string): GeneratedCriteria {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON object from the response
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('Could not parse AI response as JSON. Please try again.');
    }
    parsed = JSON.parse(match[0]);
  }

  if (!parsed.name || !Array.isArray(parsed.items) || parsed.items.length === 0) {
    throw new Error('AI response is missing required fields. Please try again.');
  }

  const validTypes: CriterionType[] = ['skill', 'experience', 'education', 'custom'];

  const items: GeneratedCriteriaItem[] = parsed.items.map((item: any, index: number) => ({
    criterion_name: String(item.criterion_name || `Criterion ${index + 1}`),
    criterion_description: String(item.criterion_description || ''),
    weight: Math.min(1, Math.max(0.1, parseFloat(item.weight) || 0.5)),
    criterion_type: validTypes.includes(item.criterion_type) ? item.criterion_type : 'custom',
    expected_value: String(item.expected_value || ''),
  }));

  return {
    name: String(parsed.name),
    description: String(parsed.description || ''),
    items,
  };
}
