import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  Loader2,
  LogOut,
  Mic,
  Monitor,
  Video,
} from 'lucide-react';
import styles from './AIInterviewRoom.module.css';
import {
  completeInterviewSession,
  fetchInterviewContextByToken,
  fetchSessionMessages,
  generateFollowUpQuestion,
  generateOpeningQuestion,
  saveInterviewMessage,
  startInterviewSession,
  uploadInterviewRecording,
  type InterviewContext,
} from '../../services/aiInterview';
import type { AiInterviewMessage, AiInterviewSession, InterviewAnalysis } from '../../types/database';

interface BrowserSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

interface SpeechRecognitionResultEvent extends Event {
  results: {
    length: number;
  [index: number]: {
      isFinal?: boolean;
      length: number;
      [index: number]: { transcript: string };
    };
  };
}

interface SpeechRecognitionErrorEvent extends Event {
  error?: string;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  }
}

type CandidateStage = 'setup' | 'room';

function speak(text: string) {
  if (!('speechSynthesis' in window)) return Promise.resolve();
  window.speechSynthesis.cancel();
  return new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

function stopSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function AIInterviewRoom() {
  const { token } = useParams<{ token: string }>();
  const [context, setContext] = useState<InterviewContext | null>(null);
  const [session, setSession] = useState<AiInterviewSession | null>(null);
  const [messages, setMessages] = useState<AiInterviewMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [captionText, setCaptionText] = useState('');
  const [captionRole, setCaptionRole] = useState<'ai' | 'candidate' | 'system'>('system');
  const [speechIssue, setSpeechIssue] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<InterviewAnalysis | null>(null);
  const [stage, setStage] = useState<CandidateStage>('setup');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [listening, setListening] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [cameraLabel, setCameraLabel] = useState('Integrated Camera');
  const [micLabel, setMicLabel] = useState('Microphone');
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const resumeAttemptedRef = useRef(false);
  const answerRef = useRef('');
  const finalTranscriptRef = useRef('');
  const messagesRef = useRef<AiInterviewMessage[]>([]);
  const silenceTimerRef = useRef<number | null>(null);
  const captionTimerRef = useRef<number | null>(null);
  const aiSpeakingRef = useRef(false);
  const workingRef = useRef(false);
  const restartListeningRef = useRef(true);

  const maxCandidateAnswers = useMemo(() => Math.max(5, (context?.questions.length ?? 0) + 1), [context?.questions.length]);
  const durationMinutes = context?.interviewSet?.duration_minutes ?? 30;
  const brandName = import.meta.env.VITE_INTERVIEW_BRAND_NAME || 'UK Realty';
  const productName = import.meta.env.VITE_INTERVIEW_PRODUCT_NAME || 'Fortiv HireMind';

  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    aiSpeakingRef.current = aiSpeaking;
  }, [aiSpeaking]);

  useEffect(() => {
    workingRef.current = working;
  }, [working]);

  useEffect(() => {
    async function load() {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const interviewContext = await fetchInterviewContextByToken(token);
        setContext(interviewContext);
        setSession(interviewContext.session);
        setMessages(interviewContext.messages);
        setCompleted(interviewContext.invite.status === 'Completed');
        if (interviewContext.session) setStage('room');
        const lastAi = [...interviewContext.messages].reverse().find((message) => message.role === 'ai');
        if (lastAi) setCurrentQuestion(lastAi.content);
        if (interviewContext.session?.analysis) setAnalysis(interviewContext.session.analysis);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load this interview.');
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => {
      stopSpeech();
      recognitionRef.current?.stop();
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      if (captionTimerRef.current) window.clearInterval(captionTimerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [token]);

  useEffect(() => {
    if (!session || completed) return undefined;
    const interval = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(interval);
  }, [completed, session]);

  useEffect(() => {
    if (stage === 'room' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [stage]);

  useEffect(() => {
    if (stage !== 'room' || completed || !context || resumeAttemptedRef.current) return;
    resumeAttemptedRef.current = true;
    void Promise.resolve().then(() => resumeInterviewRoom());
    // resumeInterviewRoom intentionally runs once per mounted room to recover half-started sessions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed, context, stage]);

  async function updateDeviceLabels() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    setCameraLabel(devices.find((device) => device.kind === 'videoinput')?.label || 'Integrated Camera');
    setMicLabel(devices.find((device) => device.kind === 'audioinput')?.label || 'Microphone');
  }

  async function startCameraAndRecording() {
    if (streamRef.current) return;

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
    await updateDeviceLabels();

    if ('MediaRecorder' in window) {
      const mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : undefined;
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      setRecording(true);
    }
  }

  async function enterRoom() {
    setWorking(true);
    setError(null);
    try {
      await startCameraAndRecording();
      setStage('room');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera or microphone permission is required to continue.');
    } finally {
      setWorking(false);
    }
  }

  async function resumeInterviewRoom() {
    if (!context) return;
    setWorking(true);
    setError(null);
    try {
      await startCameraAndRecording();
      const activeSession = session ?? await startInterviewSession(context);
      setSession(activeSession);

      const latestMessages = activeSession ? await fetchSessionMessages(activeSession.id) : messages;
      if (latestMessages.length > 0) {
        setMessages(latestMessages);
        const lastAi = [...latestMessages].reverse().find((message) => message.role === 'ai');
        const lastMessage = latestMessages[latestMessages.length - 1];
        if (lastAi) setCurrentQuestion(lastAi.content);
        if (lastMessage?.role === 'ai') await speakAndThenListen(lastMessage.content);
        if (lastMessage?.role === 'candidate') await askNextQuestion(latestMessages, activeSession);
        return;
      }

      const question = await generateOpeningQuestion({ ...context, session: activeSession });
      const saved = await saveInterviewMessage({
        session_id: activeSession.id,
        role: 'ai',
        content: question,
        question_id: context.questions[0]?.id ?? null,
        sequence: 1,
      });
      setMessages([saved]);
      setCurrentQuestion(question);
      await speakAndThenListen(question);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera, microphone, or AI question setup failed.');
    } finally {
      setWorking(false);
    }
  }

  async function speakAndThenListen(text: string) {
    stopListening();
    setAiSpeaking(true);
    setCaptionRole('ai');
    revealCaption(text);
    await speak(text);
    stopCaptionReveal(text);
    setAiSpeaking(false);
    window.setTimeout(() => startListening(), 250);
  }

  function revealCaption(text: string) {
    if (captionTimerRef.current) window.clearInterval(captionTimerRef.current);
    const words = text.split(/\s+/).filter(Boolean);
    let index = 0;
    setCaptionText('');
    captionTimerRef.current = window.setInterval(() => {
      index = Math.min(index + 1, words.length);
      setCaptionText(words.slice(0, index).join(' '));
      if (index >= words.length && captionTimerRef.current) {
        window.clearInterval(captionTimerRef.current);
        captionTimerRef.current = null;
      }
    }, 95);
  }

  function stopCaptionReveal(finalText: string) {
    if (captionTimerRef.current) {
      window.clearInterval(captionTimerRef.current);
      captionTimerRef.current = null;
    }
    setCaptionText(finalText);
  }

  function startListening() {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      const message = 'Speech recognition is not available in this browser. Please use Chrome desktop.';
      setSpeechIssue(message);
      setError(message);
      return;
    }

    if (recognitionRef.current) return;
    if (aiSpeakingRef.current || workingRef.current) {
      window.setTimeout(() => startListening(), 350);
      return;
    }

    const recognition = new Recognition();
    restartListeningRef.current = true;
    finalTranscriptRef.current = '';
    setCaptionRole('candidate');
    setCaptionText('Listening... start speaking now.');
    setLiveTranscript('');
    setSpeechIssue(null);
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognition.onresult = (event) => {
      let finalText = finalTranscriptRef.current;
      let interimText = '';
      for (let index = 0; index < event.results.length; index += 1) {
        const segment = event.results[index][0].transcript.trim();
        if (!segment) continue;
        if ('isFinal' in event.results[index] && event.results[index].isFinal) {
          finalText = `${finalText} ${segment}`.trim();
        } else {
          interimText = `${interimText} ${segment}`.trim();
        }
      }
      finalTranscriptRef.current = finalText;
      const cleanTranscript = `${finalText} ${interimText}`.trim();
      setAnswer(cleanTranscript);
      setLiveTranscript(cleanTranscript);
      setCaptionRole('candidate');
      setCaptionText(cleanTranscript || 'Listening live...');
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      if (cleanTranscript.length > 3) {
        silenceTimerRef.current = window.setTimeout(() => {
          void submitCurrentAnswer();
        }, 1800);
      }
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      if (restartListeningRef.current && session && !completed && !aiSpeakingRef.current && !workingRef.current) {
        window.setTimeout(() => startListening(), 350);
      }
    };
    recognition.onerror = (event) => {
      const message = event.error
        ? `Speech recognition stopped: ${event.error}`
        : 'Speech recognition stopped.';
      setSpeechIssue(message);
      setCaptionRole('system');
      setCaptionText(message);
      recognitionRef.current = null;
      setListening(false);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch (err) {
      recognitionRef.current = null;
      setListening(false);
      const message = err instanceof Error ? err.message : 'Could not start speech recognition.';
      setSpeechIssue(message);
      setCaptionRole('system');
      setCaptionText(message);
    }
  }

  function stopListening(allowRestart = false) {
    restartListeningRef.current = allowRestart;
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }

  async function submitCurrentAnswer() {
    const activeAnswer = answerRef.current.trim();
    const activeMessages = messagesRef.current;
    if (!context || !session || !activeAnswer || workingRef.current || aiSpeakingRef.current) return;
    workingRef.current = true;
    setWorking(true);
    setError(null);
    stopSpeech();
    stopListening(false);

    try {
      const candidateMessage = await saveInterviewMessage({
        session_id: session.id,
        role: 'candidate',
        content: activeAnswer,
        sequence: activeMessages.length + 1,
      });

      const updatedMessages = [...activeMessages, candidateMessage];
      setMessages(updatedMessages);
      setAnswer('');
      setLiveTranscript('');
      setCaptionRole('system');
      setCaptionText('Thinking...');
      finalTranscriptRef.current = '';

      const answerCount = updatedMessages.filter((message) => message.role === 'candidate').length;
      if (answerCount >= maxCandidateAnswers) {
        await finishInterview(updatedMessages);
        return;
      }

      await askNextQuestion(updatedMessages, session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save your answer.');
    } finally {
      workingRef.current = false;
      setWorking(false);
    }
  }

  async function askNextQuestion(updatedMessages: AiInterviewMessage[], activeSession: AiInterviewSession) {
    if (!context) return;
    const answerCount = updatedMessages.filter((message) => message.role === 'candidate').length;
    const question = await generateFollowUpQuestion({
      context: { ...context, session: activeSession },
      messages: updatedMessages,
    });
    const aiMessage = await saveInterviewMessage({
      session_id: activeSession.id,
      role: 'ai',
      content: question,
      question_id: context.questions[answerCount]?.id ?? null,
      sequence: updatedMessages.length + 1,
    });

    setMessages([...updatedMessages, aiMessage]);
    setCurrentQuestion(question);
    await speakAndThenListen(question);
  }

  async function stopRecorderAndUpload(activeSession: AiInterviewSession) {
    if (!recorderRef.current || recorderRef.current.state === 'inactive') return null;

    await new Promise<void>((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder) {
        resolve();
        return;
      }
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    setRecording(false);
    streamRef.current?.getTracks().forEach((track) => track.stop());

    if (chunksRef.current.length === 0) return null;
    const blob = new Blob(chunksRef.current, { type: 'video/webm' });
    return uploadInterviewRecording(activeSession.id, blob);
  }

  async function finishInterview(finalMessages = messages) {
    if (!context || !session) return;
    workingRef.current = true;
    setWorking(true);
    setError(null);
    stopSpeech();
    stopListening(false);

    try {
      let recordingUrl: string | null = null;
      try {
        recordingUrl = await stopRecorderAndUpload(session);
      } catch (uploadError) {
        console.warn('Recording upload failed:', uploadError);
      }

      const latestMessages = finalMessages.length > 0 ? finalMessages : await fetchSessionMessages(session.id);
      const result = await completeInterviewSession({
        context: { ...context, session },
        sessionId: session.id,
        messages: latestMessages,
        recordingUrl,
      });

      setAnalysis(result);
      setCompleted(true);
      setRecording(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete interview analysis.');
    } finally {
      workingRef.current = false;
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.stateBox}>
          <div className={styles.stateInner}>
            <Loader2 className={styles.spinner} size={38} />
            <h1>Loading interview</h1>
            <p>Preparing your secure AI interview room.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !context) {
    return (
      <div className={styles.page}>
        <div className={styles.stateBox}>
          <div className={styles.stateInner}>
            <Bot size={42} />
            <h1>Interview unavailable</h1>
            <p className={styles.error}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!context) return null;

  if (stage === 'setup' && !completed) {
    return (
      <div className={styles.page}>
        <div className={styles.setupShell}>
          <div className={styles.setupCard}>
            <section className={styles.invitePanel}>
              <div className={styles.powerMark}>
                <span className={styles.logoMark}>UK</span>
              </div>
              <h1>{brandName}</h1>
              <p>has invited you to take an AI Interview</p>
              <div className={styles.inviteFacts}>
                <div><span>Duration</span><strong>{durationMinutes} mins</strong></div>
                <div><span>Position</span><strong>{context.project.title}</strong></div>
              </div>
            </section>

            <section className={styles.languagePanel}>
              <h2>Language</h2>
              <label>
                Select user interface language
                <button className={styles.selectLike}>
                  <span>English</span>
                  <ChevronDown size={17} />
                </button>
              </label>
              <label>
                Select interview language
                <button className={styles.selectLike}>
                  <span>English (India)</span>
                  <ChevronDown size={17} />
                </button>
              </label>
              <p className={styles.note}>
                Language that the AI interview will be conducted in. Available languages are pre-determined by the hiring company.
              </p>
              {error && <p className={styles.error}>{error}</p>}
              <button className={styles.beginBtn} onClick={enterRoom} disabled={working}>
                {working ? <Loader2 className={styles.spinner} size={16} /> : null}
                Begin
              </button>
              <p className={styles.computerNote}><Monitor size={18} /> This AI interview works best on computers.</p>
            </section>
          </div>

          <footer className={styles.powered}>
            <span>Powered by</span>
            <strong><span>Fortiv</span> {productName.replace('Fortiv ', '')}</strong>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${styles.roomPage}`}>
      <div className={styles.deviceStack}>
        <button><Mic size={15} /> {micLabel} <ChevronDown size={14} /></button>
        <button><Video size={15} /> {cameraLabel} <ChevronDown size={14} /></button>
      </div>

        <div className={styles.roomActions}>
        {!completed && session && (
          <button className={styles.endEarlyBtn} onClick={() => finishInterview()} disabled={working}>
            <LogOut size={17} /> End Interview Early
          </button>
        )}
      </div>

      {error && <div className={styles.roomError}>{error}</div>}

      {completed ? (
        <div className={styles.completionCard}>
          <CheckCircle2 size={42} />
          <h1>Interview Completed</h1>
          {analysis ? (
            <>
              <p>{analysis.summary}</p>
              <div className={styles.scoreGrid}>
                <div><span>Overall</span><strong>{Math.round(analysis.overallScore)}</strong></div>
                <div><span>Communication</span><strong>{Math.round(analysis.communicationScore)}</strong></div>
                <div><span>Role Fit</span><strong>{Math.round(analysis.roleFitScore)}</strong></div>
                <div><span>Technical</span><strong>{Math.round(analysis.technicalScore)}</strong></div>
              </div>
              <p><b>Recommendation:</b> {analysis.recommendation}</p>
            </>
          ) : (
            <p>Your answers have been submitted. The recruiter can review your transcript and recording.</p>
          )}
        </div>
      ) : (
        <>
          <main className={styles.stage}>
            <div className={styles.participantTile}>
              <video ref={videoRef} className={styles.video} autoPlay muted playsInline />
              {recording && <span className={styles.recBadge}>REC</span>}
            </div>
            <div className={styles.aiTile}>
              <span>UK</span>
              <div className={`${styles.voiceOrb} ${aiSpeaking ? styles.voiceOrbActive : ''}`}>
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
          </main>

          <section className={styles.currentCaption}>
            <span className={styles.captionSpeaker}>
              {captionRole === 'ai' ? 'AI' : captionRole === 'candidate' ? 'You' : aiSpeaking ? 'AI' : listening ? 'You' : 'System'}
            </span>
            <p>
              {captionText ||
                liveTranscript ||
                currentQuestion ||
                (working ? 'Preparing the first AI question...' : 'The interview will begin automatically.')}
            </p>
            {speechIssue && <em className={styles.captionIssue}>{speechIssue}</em>}
            <span className={styles.captionCount}>{messages.filter((message) => message.role === 'candidate').length}/{maxCandidateAnswers}</span>
          </section>

          <div className={styles.bottomDock}>
            <span className={styles.timer}>{formatTime(session ? elapsedSeconds : durationMinutes * 60)}</span>
            <span className={styles.micStatus}>
              <Mic size={16} />
              {aiSpeaking ? 'AI speaking' : listening ? 'Listening' : working ? 'Processing' : 'Mic ready'}
            </span>
          </div>

          <footer className={styles.roomPowered}>
            <span>Powered by</span>
            <strong><span>Fortiv</span> {productName.replace('Fortiv ', '')}</strong>
          </footer>
          <button className={styles.helpBtn}>Need help?</button>
        </>
      )}
    </div>
  );
}
