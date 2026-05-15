import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle2, ChevronRight, Clock, Copy, ExternalLink, Loader2, Search, Users } from 'lucide-react';
import styles from './AIInterviewer.module.css';
import {
  buildInviteUrl,
  fetchAiInterviewInvites,
  fetchAiInterviewSets,
  type AiInterviewInviteRow,
} from '../../services/aiInterview';
import type { AiInterviewSet, AiInterviewQuestion } from '../../types/database';

type Tab = 'all' | 'completed' | 'started' | 'notStarted' | 'sets';

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function statusClass(status: string) {
  if (status === 'Completed') return styles.statusCompleted;
  if (status === 'Started') return styles.statusStarted;
  if (status === 'Not Started') return styles.statusNotStarted;
  return '';
}

export default function AIInterviewer() {
  const [invites, setInvites] = useState<AiInterviewInviteRow[]>([]);
  const [sets, setSets] = useState<Array<AiInterviewSet & { questions: AiInterviewQuestion[] }>>([]);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [inviteRows, setRows] = await Promise.all([
        fetchAiInterviewInvites(),
        fetchAiInterviewSets(),
      ]);
      setInvites(inviteRows);
      setSets(setRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI interviews.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  const filteredInvites = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invites.filter((invite) => {
      const statusMatches =
        activeTab === 'all' ||
        (activeTab === 'completed' && invite.status === 'Completed') ||
        (activeTab === 'started' && invite.status === 'Started') ||
        (activeTab === 'notStarted' && invite.status === 'Not Started');

      const searchMatches =
        !q ||
        invite.candidate?.full_name.toLowerCase().includes(q) ||
        invite.candidate?.email.toLowerCase().includes(q) ||
        invite.hiring_project?.title.toLowerCase().includes(q) ||
        invite.interview_set?.name.toLowerCase().includes(q);

      return statusMatches && searchMatches;
    });
  }, [activeTab, invites, search]);

  async function copyInvite(token: string) {
    const url = buildInviteUrl(token);
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    window.setTimeout(() => setCopiedToken(null), 1600);
  }

  const stats = {
    total: invites.length,
    completed: invites.filter((invite) => invite.status === 'Completed').length,
    started: invites.filter((invite) => invite.status === 'Started').length,
    notStarted: invites.filter((invite) => invite.status === 'Not Started').length,
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.breadcrumbs}>
          <span>Dashboard</span>
          <ChevronRight size={14} />
          <span className={styles.breadcrumbActive}>AI Interviewer</span>
        </div>

        <div className={styles.titleRow}>
          <div className={styles.titleWrap}>
            <h1>AI Interview Candidates</h1>
            <span className={styles.countBadge}>{invites.length}</span>
            {stats.notStarted > 0 && <span className={styles.newBadge}>+{stats.notStarted} New</span>}
          </div>
        </div>
      </div>

      <div className={styles.tabs} role="tablist">
        {[
          { id: 'all', label: 'All' },
          { id: 'completed', label: 'Completed' },
          { id: 'started', label: 'Started' },
          { id: 'notStarted', label: 'Not Started' },
          { id: 'sets', label: 'AI Interview Sets' },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id as Tab)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.statsGrid}>
        {[
          { label: 'Total Invites', value: stats.total, icon: Users },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2 },
          { label: 'Started', value: stats.started, icon: Clock },
          { label: 'Question Sets', value: sets.length, icon: Bot },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div className={styles.statCard} key={stat.label}>
              <div className={styles.statIcon}><Icon size={20} /></div>
              <div>
                <div className={styles.statLabel}>{stat.label}</div>
                <div className={styles.statValue}>{stat.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className={styles.stateBox}>
          <p>{error}</p>
          <button className={styles.primaryBtn} onClick={loadData}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className={styles.stateBox}>
          <Loader2 className={styles.spinner} size={34} />
          <p>Loading AI interviews...</p>
        </div>
      ) : activeTab === 'sets' ? (
        <div className={styles.setsGrid}>
          {sets.length === 0 ? (
            <div className={styles.stateBox}>
              <Bot size={40} />
              <h3>No interview sets yet</h3>
              <p>Create one from a hiring project AI Interviews tab.</p>
            </div>
          ) : (
            sets.map((set) => (
              <div className={styles.setCard} key={set.id}>
                <div>
                  <div className={styles.primaryText}>{set.name}</div>
                  <div className={styles.mutedText}>{set.description ?? 'No description'}</div>
                </div>
                <div className={styles.setMeta}>
                  <span className={styles.chip}>{set.duration_minutes} min</span>
                  <span className={styles.chip}>{set.questions.length} questions</span>
                  <span className={styles.chip}>{set.status}</span>
                </div>
                <ol className={styles.questionList}>
                  {set.questions.slice(0, 4).map((question) => (
                    <li key={question.id}>{question.question_text}</li>
                  ))}
                </ol>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.toolbar}>
            <div className={styles.searchWrap}>
              <Search className={styles.searchIcon} size={15} />
              <input
                className={styles.searchInput}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search candidate, project, or interview set..."
              />
            </div>
            <span className={styles.mutedText}>
              Showing <strong>{filteredInvites.length}</strong> of <strong>{invites.length}</strong>
            </span>
          </div>

          {filteredInvites.length === 0 ? (
            <div className={styles.stateBox}>
              <Users size={40} />
              <h3>No AI interview candidates found</h3>
              <p>Generate invites from a hiring project to see them here.</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Candidate Info</th>
                    <th>AI Interview Set</th>
                    <th>Hiring Project</th>
                    <th>Status / Score</th>
                    <th>Latest Submission</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvites.map((invite) => {
                    const candidateName = invite.candidate?.full_name ?? 'Unknown Candidate';
                    return (
                      <tr key={invite.id}>
                        <td>
                          <div className={styles.profileCell}>
                            <div className={styles.avatar}>{initials(candidateName)}</div>
                            <div>
                              <div className={styles.primaryText}>{candidateName}</div>
                              <div className={styles.mutedText}>{invite.candidate?.email ?? 'No email'}</div>
                            </div>
                          </div>
                        </td>
                        <td>{invite.interview_set?.name ?? 'Default AI Interview'}</td>
                        <td>{invite.hiring_project?.title ?? 'Unknown Project'}</td>
                        <td>
                          <span className={`${styles.status} ${statusClass(invite.status)}`}>{invite.status}</span>
                          {invite.session?.overall_score ? (
                            <span className={styles.score} style={{ marginLeft: 8 }}>
                              {Math.round(invite.session.overall_score)}
                            </span>
                          ) : null}
                        </td>
                        <td>
                          {invite.completed_at
                            ? new Date(invite.completed_at).toLocaleString()
                            : invite.started_at
                              ? new Date(invite.started_at).toLocaleString()
                              : 'Not submitted'}
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <button className={styles.secondaryBtn} onClick={() => copyInvite(invite.token)}>
                              <Copy size={14} />
                              {copiedToken === invite.token ? 'Copied' : 'Copy Link'}
                            </button>
                            <a className={styles.iconBtn} href={buildInviteUrl(invite.token)} target="_blank" rel="noreferrer">
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
