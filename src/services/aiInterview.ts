import { supabase } from '../lib/supabase';
import type {
  AiInterviewInvite,
  AiInterviewMessage,
  AiInterviewQuestion,
  AiInterviewRecommendation,
  AiInterviewSession,
  AiInterviewSet,
  Candidate,
  CvEvaluation,
  HiringProject,
  InterviewAnalysis,
} from '../types/database';

interface ModelConfig {
  id: string;
  maxRetries: number;
}

const OPENAI_MODELS: ModelConfig[] = [
  { id: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini', maxRetries: 1 },
  { id: 'gpt-4o-mini', maxRetries: 1 },
];

const DEFAULT_QUESTIONS = [
  {
    question_text: 'Please introduce yourself and summarize the most relevant experience you bring for this role.',
    question_type: 'intro',
    position: 1,
    expected_signal: 'Clear career summary, relevance to role, confidence, and communication.',
  },
  {
    question_text: 'Walk me through one project or responsibility from your resume that best matches this job description.',
    question_type: 'experience',
    position: 2,
    expected_signal: 'Evidence of hands-on ownership, measurable outcomes, and resume authenticity.',
  },
  {
    question_text: 'Which required skills for this role are your strongest, and where would you need support or ramp-up time?',
    question_type: 'role_fit',
    position: 3,
    expected_signal: 'Self-awareness, skill alignment, and honesty about gaps.',
  },
  {
    question_text: 'Tell me about a time you handled a difficult stakeholder, deadline, or ambiguity.',
    question_type: 'behavioral',
    position: 4,
    expected_signal: 'Problem solving, collaboration, resilience, and structured thinking.',
  },
  {
    question_text: 'Why are you interested in this role, and what would make you successful in the first 90 days?',
    question_type: 'closing',
    position: 5,
    expected_signal: 'Motivation, role clarity, and practical success plan.',
  },
] as const;

export interface AiInterviewInviteRow extends AiInterviewInvite {
  candidate?: Candidate;
  hiring_project?: HiringProject;
  interview_set?: AiInterviewSet | null;
  session?: AiInterviewSession | null;
}

export interface InterviewContext {
  invite: AiInterviewInvite;
  candidate: Candidate;
  project: HiringProject;
  cvEvaluation: CvEvaluation | null;
  interviewSet: AiInterviewSet | null;
  questions: AiInterviewQuestion[];
  messages: AiInterviewMessage[];
  session: AiInterviewSession | null;
}

export interface OpenAIInterviewTurnInput {
  context: InterviewContext;
  messages: AiInterviewMessage[];
  currentQuestion?: AiInterviewQuestion;
}

function getApiKey() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_OPENAI_API_KEY_HERE') {
    throw new Error('OpenAI API key is not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
  }
  return apiKey;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function isHardConfigError(status: number, message: string) {
  return (
    status === 401 ||
    status === 403 ||
    /api key|invalid key|billing|quota|insufficient_quota|permission/i.test(message)
  );
}

function extractOpenAIText(data: unknown) {
  if (!data || typeof data !== 'object') return '';
  const responseData = data as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ type?: string; text?: unknown }> }>;
  };

  if (typeof responseData.output_text === 'string') return responseData.output_text.trim();
  const output = responseData.output ?? [];
  for (const item of output) {
    const content = item.content ?? [];
    for (const part of content) {
      if (part.type === 'output_text' && typeof part.text === 'string') return part.text.trim();
      if (typeof part.text === 'string') return part.text.trim();
    }
  }
  return '';
}

async function callOpenAI(prompt: string, options: { json?: boolean; temperature?: number; maxOutputTokens?: number } = {}) {
  const apiKey = getApiKey();
  const errors: string[] = [];
  const modelIds = Array.from(new Set(OPENAI_MODELS.map((model) => model.id)));

  for (const modelId of modelIds) {
    const model = OPENAI_MODELS.find((entry) => entry.id === modelId) ?? { id: modelId, maxRetries: 1 };
    for (let attempt = 0; attempt <= model.maxRetries; attempt += 1) {
      try {
        const response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model.id,
            input: prompt,
            temperature: options.temperature ?? 0.55,
            max_output_tokens: options.maxOutputTokens ?? 1200,
            ...(options.json ? { text: { format: { type: 'json_object' } } } : {}),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const message = errorData?.error?.message || `HTTP ${response.status} ${response.statusText}`;
          errors.push(`${model.id}: ${message}`);
          if (response.status === 404) break;
          if (isHardConfigError(response.status, message)) {
            throw new Error(message);
          }
          await sleep(Math.min(800 * 2 ** attempt, 4000));
          continue;
        }

        const data = await response.json();
        const text = extractOpenAIText(data);
        if (!text) throw new Error('Empty response from OpenAI.');
        return text;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown OpenAI error';
        errors.push(`${model.id}: ${message}`);
        if (/api key|invalid key|billing|quota|insufficient_quota|permission/i.test(message)) throw new Error(message);
        if (attempt < model.maxRetries) await sleep(Math.min(800 * 2 ** attempt, 4000));
      }
    }
  }

  throw new Error(`Unable to reach OpenAI right now. ${errors.at(-1) ?? ''}`.trim());
}

function parseJson<T>(raw: string, fallback: T): T {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  try {
    return JSON.parse(match ? match[0] : cleaned) as T;
  } catch {
    return fallback;
  }
}

function buildToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function buildInviteUrl(token: string) {
  return `${window.location.origin}/ai-interview/invite/${token}`;
}

export async function fetchAiInterviewInvites(): Promise<AiInterviewInviteRow[]> {
  const { data, error } = await supabase
    .from('ai_interview_invites')
    .select(`
      *,
      candidate:candidates (*),
      hiring_project:hiring_projects (*),
      interview_set:ai_interview_sets (*)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as AiInterviewInviteRow[];
  const withSessions = await Promise.all(
    rows.map(async (row) => {
      const { data: session } = await supabase
        .from('ai_interview_sessions')
        .select('*')
        .eq('invite_id', row.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return { ...row, session: (session as AiInterviewSession | null) ?? null };
    })
  );

  return withSessions;
}

export async function fetchAiInterviewSets(projectId?: string): Promise<Array<AiInterviewSet & { questions: AiInterviewQuestion[] }>> {
  let query = supabase
    .from('ai_interview_sets')
    .select('*')
    .order('created_at', { ascending: false });

  if (projectId) query = query.eq('hiring_project_id', projectId);

  const { data, error } = await query;
  if (error) throw error;

  return Promise.all(
    ((data ?? []) as AiInterviewSet[]).map(async (set) => {
      const questions = await fetchQuestionsForSet(set.id);
      return { ...set, questions };
    })
  );
}

export async function fetchQuestionsForSet(setId: string): Promise<AiInterviewQuestion[]> {
  const { data, error } = await supabase
    .from('ai_interview_questions')
    .select('*')
    .eq('interview_set_id', setId)
    .order('position', { ascending: true });

  if (error) throw error;
  return (data ?? []) as AiInterviewQuestion[];
}

export async function ensureDefaultInterviewSet(project: HiringProject): Promise<AiInterviewSet> {
  const existing = await fetchAiInterviewSets(project.id);
  const active = existing.find((set) => set.status === 'Active');
  if (active) return active;

  const { data: created, error } = await supabase
    .from('ai_interview_sets')
    .insert({
      hiring_project_id: project.id,
      name: `${project.title} AI Interview`,
      description: 'Default adaptive AI interview set generated from the hiring project context.',
      duration_minutes: 30,
      status: 'Active',
    })
    .select('*')
    .single();

  if (error) throw error;

  const set = created as AiInterviewSet;
  const { error: questionError } = await supabase
    .from('ai_interview_questions')
    .insert(DEFAULT_QUESTIONS.map((question) => ({ ...question, interview_set_id: set.id })));

  if (questionError) throw questionError;
  return set;
}

export async function createInterviewSet(input: {
  hiring_project_id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  questions: Array<{ question_text: string; question_type: string; expected_signal?: string }>;
}): Promise<AiInterviewSet> {
  const { data: set, error } = await supabase
    .from('ai_interview_sets')
    .insert({
      hiring_project_id: input.hiring_project_id,
      name: input.name,
      description: input.description || null,
      duration_minutes: input.duration_minutes,
      status: 'Active',
    })
    .select('*')
    .single();

  if (error) throw error;

  const interviewSet = set as AiInterviewSet;
  const cleanQuestions = input.questions
    .map((question, index) => ({
      interview_set_id: interviewSet.id,
      question_text: question.question_text.trim(),
      question_type: question.question_type || 'general',
      expected_signal: question.expected_signal?.trim() || null,
      position: index + 1,
      required: true,
    }))
    .filter((question) => question.question_text);

  if (cleanQuestions.length > 0) {
    const { error: questionError } = await supabase.from('ai_interview_questions').insert(cleanQuestions);
    if (questionError) throw questionError;
  }

  return interviewSet;
}

export async function createInterviewInvite(input: {
  candidate_id: string;
  hiring_project_id: string;
  cv_evaluation_id?: string | null;
  interview_set_id?: string | null;
}): Promise<AiInterviewInvite> {
  const { data: existing } = await supabase
    .from('ai_interview_invites')
    .select('*')
    .eq('candidate_id', input.candidate_id)
    .eq('hiring_project_id', input.hiring_project_id)
    .neq('status', 'Cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing as AiInterviewInvite;

  const { data, error } = await supabase
    .from('ai_interview_invites')
    .insert({
      token: buildToken(),
      candidate_id: input.candidate_id,
      hiring_project_id: input.hiring_project_id,
      cv_evaluation_id: input.cv_evaluation_id ?? null,
      interview_set_id: input.interview_set_id ?? null,
      status: 'Not Started',
      sent_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as AiInterviewInvite;
}

export async function fetchProjectInvites(projectId: string): Promise<AiInterviewInvite[]> {
  const { data, error } = await supabase
    .from('ai_interview_invites')
    .select('*')
    .eq('hiring_project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as AiInterviewInvite[];
}

export async function fetchInterviewContextByToken(token: string): Promise<InterviewContext> {
  const { data: invite, error: inviteError } = await supabase
    .from('ai_interview_invites')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (inviteError) throw inviteError;
  if (!invite) throw new Error('This interview link is invalid or has expired.');

  const interviewInvite = invite as AiInterviewInvite;
  const [candidateResult, projectResult, cvResult, setResult, sessionResult] = await Promise.all([
    supabase.from('candidates').select('*').eq('id', interviewInvite.candidate_id).single(),
    supabase.from('hiring_projects').select('*').eq('id', interviewInvite.hiring_project_id).single(),
    interviewInvite.cv_evaluation_id
      ? supabase.from('cv_evaluations').select('*').eq('id', interviewInvite.cv_evaluation_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    interviewInvite.interview_set_id
      ? supabase.from('ai_interview_sets').select('*').eq('id', interviewInvite.interview_set_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('ai_interview_sessions')
      .select('*')
      .eq('invite_id', interviewInvite.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (candidateResult.error) throw candidateResult.error;
  if (projectResult.error) throw projectResult.error;
  if (cvResult.error) throw cvResult.error;
  if (setResult.error) throw setResult.error;
  if (sessionResult.error) throw sessionResult.error;

  const session = (sessionResult.data as AiInterviewSession | null) ?? null;
  const questions = interviewInvite.interview_set_id ? await fetchQuestionsForSet(interviewInvite.interview_set_id) : [];
  const messages = session ? await fetchSessionMessages(session.id) : [];

  return {
    invite: interviewInvite,
    candidate: candidateResult.data as Candidate,
    project: projectResult.data as HiringProject,
    cvEvaluation: (cvResult.data as CvEvaluation | null) ?? null,
    interviewSet: (setResult.data as AiInterviewSet | null) ?? null,
    questions,
    session,
    messages,
  };
}

export async function startInterviewSession(context: InterviewContext): Promise<AiInterviewSession> {
  if (context.session) return context.session;

  const now = new Date().toISOString();
  const [{ data: session, error: sessionError }, { error: inviteError }] = await Promise.all([
    supabase
      .from('ai_interview_sessions')
      .insert({
        invite_id: context.invite.id,
        candidate_id: context.candidate.id,
        hiring_project_id: context.project.id,
        status: 'Started',
        started_at: now,
      })
      .select('*')
      .single(),
    supabase
      .from('ai_interview_invites')
      .update({ status: 'Started', started_at: now, updated_at: now })
      .eq('id', context.invite.id),
  ]);

  if (sessionError) throw sessionError;
  if (inviteError) throw inviteError;
  return session as AiInterviewSession;
}

export async function fetchSessionMessages(sessionId: string): Promise<AiInterviewMessage[]> {
  const { data, error } = await supabase
    .from('ai_interview_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('sequence', { ascending: true });

  if (error) throw error;
  return (data ?? []) as AiInterviewMessage[];
}

export async function saveInterviewMessage(input: {
  session_id: string;
  role: 'ai' | 'candidate' | 'system';
  content: string;
  question_id?: string | null;
  sequence: number;
}): Promise<AiInterviewMessage> {
  const { data, error } = await supabase
    .from('ai_interview_messages')
    .insert({
      session_id: input.session_id,
      role: input.role,
      content: input.content,
      question_id: input.question_id ?? null,
      sequence: input.sequence,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as AiInterviewMessage;
}

function contextBlock(context: InterviewContext) {
  const project = context.project;
  const candidate = context.candidate;
  const cv = context.cvEvaluation;
  const skills = project.required_skills?.join(', ') || 'Not specified';
  const parsedSkills = cv?.parsed_skills?.join(', ') || 'Not available';

  return `
Hiring Project:
- Title: ${project.title}
- Department: ${project.department ?? 'Not specified'}
- Location: ${project.location ?? 'Not specified'}
- Job Type: ${project.job_type ?? 'Not specified'}
- Required Skills: ${skills}
- Required Experience: ${project.required_experience_years ?? 0}+ years
- Required Education: ${project.required_education ?? 'Not specified'}
- Job Description: ${(project.description ?? 'No job description provided.').slice(0, 5000)}

Candidate:
- Name: ${candidate.full_name}
- Email: ${candidate.email}
- Location: ${candidate.location ?? cv?.parsed_location ?? 'Not specified'}
- Resume Summary: ${(cv?.parsed_summary ?? 'No parsed resume summary available.').slice(0, 2500)}
- Resume Skills: ${parsedSkills}
- Parsed Experience: ${cv?.parsed_experience_years ?? 'Not available'}
- Parsed Education: ${cv?.parsed_education ?? 'Not available'}
- CV Match Score: ${cv?.total_score ?? 'Not available'}
`;
}

export async function generateOpeningQuestion(context: InterviewContext): Promise<string> {
  const firstQuestion = context.questions[0]?.question_text;
  const prompt = `You are an AI interviewer for a hiring project. Start the interview warmly and ask exactly one concise first question.

Use this predefined question as the base:
${firstQuestion ?? 'Ask the candidate to introduce themselves and connect their experience to the role.'}

Context:
${contextBlock(context)}

Rules:
- Speak directly to ${context.candidate.full_name}.
- One question only.
- No markdown.
- Keep it under 70 words.`;

  try {
    return await callOpenAI(prompt, { temperature: 0.45, maxOutputTokens: 220 });
  } catch (err) {
    console.warn('OpenAI opening question failed, using predefined question:', err);
    return firstQuestion ?? `Hi ${context.candidate.full_name}, please introduce yourself and summarize the experience most relevant to ${context.project.title}.`;
  }
}

export async function generateFollowUpQuestion(input: OpenAIInterviewTurnInput): Promise<string> {
  const transcript = input.messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join('\n');
  const remainingQuestions = input.context.questions
    .filter((question) => !input.messages.some((message) => message.question_id === question.id))
    .map((question) => `${question.position}. ${question.question_text}`)
    .join('\n');

  const prompt = `You are conducting a structured AI hiring interview. Ask the next best single question.

Context:
${contextBlock(input.context)}

Transcript so far:
${transcript || 'No transcript yet.'}

Available predefined questions not yet used:
${remainingQuestions || 'All predefined questions have been used.'}

Rules:
- If the candidate gave a shallow, unclear, or suspicious answer, ask one targeted cross-question based on their answer, resume, JD, or skill gaps.
- Otherwise ask the next predefined question.
- Ask exactly one question.
- No markdown.
- Keep it under 80 words.`;

  try {
    return await callOpenAI(prompt, { temperature: 0.55, maxOutputTokens: 260 });
  } catch (err) {
    console.warn('OpenAI follow-up failed, using next predefined question:', err);
    const answerCount = input.messages.filter((message) => message.role === 'candidate').length;
    return input.context.questions[answerCount]?.question_text ?? 'Thank you. Could you share one specific example that shows why you are a strong fit for this role?';
  }
}

export async function analyzeInterview(context: InterviewContext, messages: AiInterviewMessage[]): Promise<InterviewAnalysis> {
  const transcript = messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join('\n');
  const fallback: InterviewAnalysis = {
    overallScore: 0,
    recommendation: 'Maybe',
    summary: 'The interview could not be analyzed automatically. Please review the transcript manually.',
    strengths: [],
    concerns: ['Automatic analysis failed.'],
    skillRatings: [],
    communicationScore: 0,
    roleFitScore: 0,
    technicalScore: 0,
    suggestedNextSteps: ['Review transcript manually'],
  };

  const prompt = `You are an expert hiring interviewer. Analyze this interview and return ONLY valid JSON.

Context:
${contextBlock(context)}

Transcript:
${transcript}

Return this exact JSON shape:
{
  "overallScore": number from 0 to 100,
  "recommendation": "Strong Hire" | "Hire" | "Maybe" | "No Hire",
  "summary": "short hiring summary",
  "strengths": ["specific strength"],
  "concerns": ["specific concern"],
  "skillRatings": [{"skill": "skill name", "score": number from 0 to 100, "evidence": "short evidence"}],
  "communicationScore": number from 0 to 100,
  "roleFitScore": number from 0 to 100,
  "technicalScore": number from 0 to 100,
  "suggestedNextSteps": ["specific next step"]
}`;

  let parsed = fallback;
  try {
    const raw = await callOpenAI(prompt, { json: true, temperature: 0.25, maxOutputTokens: 1800 });
    parsed = parseJson<InterviewAnalysis>(raw, fallback);
  } catch (err) {
    console.warn('OpenAI analysis failed, using fallback interview analysis:', err);
    const candidateAnswers = messages.filter((message) => message.role === 'candidate');
    const averageLength = candidateAnswers.length
      ? candidateAnswers.reduce((sum, message) => sum + message.content.length, 0) / candidateAnswers.length
      : 0;
    const basicScore = Math.max(35, Math.min(72, Math.round(averageLength / 4)));
    parsed = {
      ...fallback,
      overallScore: basicScore,
      communicationScore: basicScore,
      roleFitScore: basicScore,
      technicalScore: Math.max(30, basicScore - 8),
      recommendation: basicScore >= 65 ? 'Maybe' : 'No Hire',
      summary: 'The interview was completed, but OpenAI analysis was unavailable. This fallback score is based only on transcript completeness, so recruiter review is required.',
      concerns: ['OpenAI analysis was unavailable. Review the transcript manually before making a decision.'],
      suggestedNextSteps: ['Review transcript manually', 'Run a human follow-up interview if the candidate appears promising'],
    };
  }
  return {
    ...fallback,
    ...parsed,
    overallScore: Math.max(0, Math.min(100, Number(parsed.overallScore) || 0)),
    communicationScore: Math.max(0, Math.min(100, Number(parsed.communicationScore) || 0)),
    roleFitScore: Math.max(0, Math.min(100, Number(parsed.roleFitScore) || 0)),
    technicalScore: Math.max(0, Math.min(100, Number(parsed.technicalScore) || 0)),
    recommendation: (['Strong Hire', 'Hire', 'Maybe', 'No Hire'].includes(parsed.recommendation)
      ? parsed.recommendation
      : 'Maybe') as AiInterviewRecommendation,
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
    suggestedNextSteps: Array.isArray(parsed.suggestedNextSteps) ? parsed.suggestedNextSteps : [],
    skillRatings: Array.isArray(parsed.skillRatings) ? parsed.skillRatings : [],
  };
}

export async function uploadInterviewRecording(sessionId: string, blob: Blob): Promise<string> {
  const path = `${sessionId}/${Date.now()}.webm`;
  const { error } = await supabase.storage
    .from('ai-interview-recordings')
    .upload(path, blob, { contentType: blob.type || 'video/webm', upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from('ai-interview-recordings').getPublicUrl(path);
  return data.publicUrl;
}

export async function completeInterviewSession(input: {
  context: InterviewContext;
  sessionId: string;
  messages: AiInterviewMessage[];
  recordingUrl?: string | null;
}): Promise<InterviewAnalysis> {
  const analysis = await analyzeInterview(input.context, input.messages);
  const now = new Date().toISOString();
  const transcript = input.messages.map((message) => `${message.role}: ${message.content}`).join('\n\n');

  const [{ error: sessionError }, { error: inviteError }] = await Promise.all([
    supabase
      .from('ai_interview_sessions')
      .update({
        status: 'Completed',
        recording_url: input.recordingUrl ?? null,
        transcript,
        analysis,
        overall_score: analysis.overallScore,
        recommendation: analysis.recommendation,
        completed_at: now,
        updated_at: now,
      })
      .eq('id', input.sessionId),
    supabase
      .from('ai_interview_invites')
      .update({ status: 'Completed', completed_at: now, updated_at: now })
      .eq('id', input.context.invite.id),
  ]);

  if (sessionError) throw sessionError;
  if (inviteError) throw inviteError;
  return analysis;
}
