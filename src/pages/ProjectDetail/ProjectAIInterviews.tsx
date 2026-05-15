import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle2, Copy, Loader2, Plus, Send, Sparkles } from 'lucide-react';
import styles from './ProjectDetail.module.css';
import { useStore } from '../../store/useStore';
import {
  buildInviteUrl,
  createInterviewInvite,
  createInterviewSet,
  ensureDefaultInterviewSet,
  fetchAiInterviewSets,
  fetchProjectInvites,
} from '../../services/aiInterview';
import type { AiInterviewInvite, AiInterviewQuestion, AiInterviewSet, CvEvaluation } from '../../types/database';

const QUESTION_TEMPLATE = [
  'Please introduce yourself and explain why this role is a good fit for you.',
  'Which part of your experience best matches this job description?',
  'Tell me about a project where you used the key skills required for this role.',
  'Describe a difficult work situation and how you handled it.',
  'What would you focus on in your first 90 days in this role?',
];

function getName(evaluation: CvEvaluation) {
  return evaluation.candidate?.full_name ?? evaluation.parsed_name ?? 'Unknown Candidate';
}

function getEmail(evaluation: CvEvaluation) {
  return evaluation.candidate?.email ?? evaluation.parsed_email ?? 'No email';
}

export default function ProjectAIInterviews() {
  const { activeProject, evaluations } = useStore();
  const [invites, setInvites] = useState<AiInterviewInvite[]>([]);
  const [sets, setSets] = useState<Array<AiInterviewSet & { questions: AiInterviewQuestion[] }>>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [showSetForm, setShowSetForm] = useState(false);
  const [setName, setSetName] = useState('');
  const [setQuestions, setSetQuestions] = useState(QUESTION_TEMPLATE.join('\n'));
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const [inviteRows, setRows] = await Promise.all([
        fetchProjectInvites(activeProject.id),
        fetchAiInterviewSets(activeProject.id),
      ]);
      setInvites(inviteRows);
      setSets(setRows);
      setSelectedSetId((current) => current || setRows.find((set) => set.status === 'Active')?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI interview data.');
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  const inviteByEvaluation = useMemo(() => {
    const map = new Map<string, AiInterviewInvite>();
    for (const invite of invites) {
      if (invite.cv_evaluation_id) map.set(invite.cv_evaluation_id, invite);
    }
    return map;
  }, [invites]);

  async function generateInvite(evaluation: CvEvaluation) {
    if (!activeProject || !evaluation.candidate_id) return;
    setBusyId(evaluation.id);
    setError(null);
    try {
      let interviewSetId = selectedSetId;
      if (!interviewSetId) {
        const defaultSet = await ensureDefaultInterviewSet(activeProject);
        interviewSetId = defaultSet.id;
        setSelectedSetId(defaultSet.id);
      }

      const invite = await createInterviewInvite({
        candidate_id: evaluation.candidate_id,
        hiring_project_id: activeProject.id,
        cv_evaluation_id: evaluation.id,
        interview_set_id: interviewSetId,
      });

      await navigator.clipboard.writeText(buildInviteUrl(invite.token));
      setCopiedToken(invite.token);
      await loadData();
      window.setTimeout(() => setCopiedToken(null), 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invite.');
    } finally {
      setBusyId(null);
    }
  }

  async function copyInvite(invite: AiInterviewInvite) {
    await navigator.clipboard.writeText(buildInviteUrl(invite.token));
    setCopiedToken(invite.token);
    window.setTimeout(() => setCopiedToken(null), 1600);
  }

  async function saveSet() {
    if (!activeProject) return;
    const questions = setQuestions
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((question_text) => ({ question_text, question_type: 'general' }));

    if (!setName.trim() || questions.length === 0) {
      setError('Enter a set name and at least one question.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const created = await createInterviewSet({
        hiring_project_id: activeProject.id,
        name: setName.trim(),
        description: `Custom AI interview set for ${activeProject.title}`,
        duration_minutes: 30,
        questions,
      });
      setSelectedSetId(created.id);
      setShowSetForm(false);
      setSetName('');
      setSetQuestions(QUESTION_TEMPLATE.join('\n'));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create interview set.');
    } finally {
      setLoading(false);
    }
  }

  if (!activeProject) {
    return (
      <div className={styles.emptyState}>
        <Bot size={42} />
        <h3>No active project selected</h3>
      </div>
    );
  }

  const completed = invites.filter((invite) => invite.status === 'Completed').length;
  const started = invites.filter((invite) => invite.status === 'Started').length;
  const notStarted = invites.filter((invite) => invite.status === 'Not Started').length;

  return (
    <div className={styles.aiInterviewPanel}>
      <div className={styles.statsStrip}>
        {[
          { label: 'Interview Invites', value: invites.length },
          { label: 'Completed', value: completed },
          { label: 'Started', value: started },
          { label: 'Not Started', value: notStarted },
        ].map((item) => (
          <div className={styles.statBox} key={item.label}>
            <div className={styles.statLabel}>{item.label}</div>
            <div className={styles.statValue}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className={styles.contentArea}>
        <div className={styles.tableToolbar}>
          <div>
            <div className={styles.aiSectionTitle}>
              <Sparkles size={18} />
              AI Interview Invites
            </div>
            <p className={styles.aiHelpText}>
              Generate one secure interview link per candidate. The link is copied immediately for manual sharing.
            </p>
          </div>
          <div className={styles.aiToolbarActions}>
            <select
              className={styles.aiSelect}
              value={selectedSetId}
              onChange={(event) => setSelectedSetId(event.target.value)}
            >
              <option value="">Auto default set</option>
              {sets.map((set) => (
                <option value={set.id} key={set.id}>
                  {set.name}
                </option>
              ))}
            </select>
            <button className={styles.bulkUploadBtn} onClick={() => setShowSetForm((value) => !value)}>
              <Plus size={16} />
              Interview Set
            </button>
          </div>
        </div>

        {showSetForm && (
          <div className={styles.aiSetForm}>
            <div className={styles.aiFormGrid}>
              <label>
                Set Name
                <input value={setName} onChange={(event) => setSetName(event.target.value)} placeholder="Sales Manager screening" />
              </label>
              <label>
                Questions, one per line
                <textarea value={setQuestions} onChange={(event) => setSetQuestions(event.target.value)} rows={6} />
              </label>
            </div>
            <div className={styles.aiFormActions}>
              <button className={styles.bulkUploadBtn} onClick={() => setShowSetForm(false)}>Cancel</button>
              <button className={styles.addCandidateBtn} onClick={saveSet}>Save Set</button>
            </div>
          </div>
        )}

        {error && <div className={styles.aiError}>{error}</div>}

        {loading ? (
          <div className={styles.loadingState}>
            <Loader2 size={36} className={styles.spinner} />
            <p>Loading AI interview setup...</p>
          </div>
        ) : evaluations.length === 0 ? (
          <div className={styles.emptyState}>
            <Bot size={46} />
            <h3>No candidates available</h3>
            <p>Add candidates first, then generate AI interview links here.</p>
          </div>
        ) : (
          <table className={styles.candidateTable}>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>CV Score</th>
                <th>Interview Status</th>
                <th>Interview Link</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((evaluation) => {
                const invite = inviteByEvaluation.get(evaluation.id);
                const name = getName(evaluation);
                const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <tr key={evaluation.id} className={styles.candidateRow}>
                    <td>
                      <div className={styles.candidateProfile}>
                        <div className={styles.avatarBlob}>{initials}</div>
                        <div>
                          <div className={styles.cName}>{name}</div>
                          <div className={styles.cRole}>{getEmail(evaluation)}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.scoreBadge} ${evaluation.total_score >= 80 ? styles.scoreHigh : evaluation.total_score >= 60 ? styles.scoreMed : styles.scoreLow}`}>
                        {Math.round(evaluation.total_score)}%
                      </span>
                    </td>
                    <td>
                      {invite ? (
                        <span className={styles.aiStatus}>
                          {invite.status === 'Completed' && <CheckCircle2 size={13} />}
                          {invite.status}
                        </span>
                      ) : (
                        <span className={styles.aiStatusMuted}>No invite</span>
                      )}
                    </td>
                    <td>
                      {invite ? (
                        <button className={styles.aiLinkButton} onClick={() => copyInvite(invite)}>
                          <Copy size={14} />
                          {copiedToken === invite.token ? 'Copied' : 'Copy Link'}
                        </button>
                      ) : (
                        <span className={styles.aiHelpText}>Generate to create link</span>
                      )}
                    </td>
                    <td>
                      <button
                        className={styles.addCandidateBtn}
                        disabled={busyId === evaluation.id || !evaluation.candidate_id}
                        onClick={() => generateInvite(evaluation)}
                      >
                        {busyId === evaluation.id ? <Loader2 size={14} className={styles.spinner} /> : <Send size={14} />}
                        {invite ? 'Copy Invite' : 'Generate Invite'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
