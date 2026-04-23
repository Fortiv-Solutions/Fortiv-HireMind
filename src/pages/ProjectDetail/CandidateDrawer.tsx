import React from 'react';
import styles from './CandidateDrawer.module.css';
import { X, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { CvEvaluation } from '../../types/database';

interface Props {
  evaluation: CvEvaluation;
  onClose: () => void;
}

export default function CandidateDrawer({ evaluation: ev, onClose }: Props) {
  const { shortlistEvaluation, rejectEvaluation, advanceEvaluation } = useStore();
  const [loading, setLoading] = React.useState(false);

  const name       = ev.candidate?.full_name ?? ev.parsed_name ?? 'Unknown';
  const email      = ev.candidate?.email     ?? ev.parsed_email ?? '—';
  const location   = ev.candidate?.location  ?? ev.parsed_location ?? null;
  const initials   = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const experience = ev.parsed_experience_years != null ? `${ev.parsed_experience_years} yrs exp.` : null;
  const skills     = ev.parsed_skills ?? [];
  const appliedDate = ev.applied_at
    ? new Date(ev.applied_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const statusKey = `status_${ev.status.replace(' ', '_')}` as keyof typeof styles;

  const matchLabel = ev.total_score >= 80 ? 'Strong Match'
                   : ev.total_score >= 60 ? 'Moderate Match'
                   : 'Weak Match';
  const matchClass = ev.total_score >= 80 ? styles.strongMatch
                   : ev.total_score >= 60 ? styles.medMatch
                   : styles.weakMatch;

  async function handle(action: () => Promise<void>) {
    setLoading(true);
    try { await action(); onClose(); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.drawer} role="dialog" aria-modal="true">

        {/* Close */}
        <div className={styles.drawerHeader}>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Profile hero */}
        <div className={styles.profileHero}>
          <div className={styles.avatarLarge}>{initials}</div>
          <div className={styles.profileText}>
            <h2>{name}</h2>
            <p className={styles.email}>{email}</p>
            {(location || experience) && (
              <p className={styles.subMeta}>
                {[location, experience].filter(Boolean).join(' · ')}
              </p>
            )}
            <div className={styles.metaRow}>
              <span className={`${styles.statusPill} ${styles[statusKey] ?? ''}`}>
                <span className={styles.dot} />
                {ev.status}
              </span>
              <span className={styles.timeTag}>Applied {appliedDate}</span>
            </div>
          </div>
        </div>

        {/* Fit score card */}
        <div className={styles.fitScoreCard}>
          <div className={styles.scoreLeft}>
            <div className={styles.scoreTitle}>Total Fit Score</div>
            <div className={styles.scoreRow}>
              <span className={styles.giantScore}>{Math.round(ev.total_score)}%</span>
              <span className={matchClass}>{matchLabel}</span>
            </div>
          </div>
          <div className={styles.scoreBreakdown}>
            <div className={styles.scoreItem}>
              <span>Skills</span>
              <strong>{Math.round(ev.skills_match_score)}%</strong>
            </div>
            <div className={styles.scoreItem}>
              <span>Experience</span>
              <strong>{Math.round(ev.experience_score)}%</strong>
            </div>
            <div className={styles.scoreItem}>
              <span>Education</span>
              <strong>{Math.round(ev.education_score)}%</strong>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className={styles.scrollContent}>

          {ev.parsed_summary && (
            <div className={styles.aiSummary}>
              <div className={styles.aiBadge}>
                <Sparkles size={13} /> AI Summary
              </div>
              <p>{ev.parsed_summary}</p>
            </div>
          )}

          {skills.length > 0 && (
            <div className={styles.section}>
              <h3>Skills</h3>
              <div className={styles.skillTags}>
                {skills.map((skill: string) => (
                  <span key={skill} className={styles.skillNormal}>{skill}</span>
                ))}
              </div>
            </div>
          )}

          {ev.parsed_companies && ev.parsed_companies.length > 0 && (
            <div className={styles.section}>
              <h3>Previous Companies</h3>
              <div className={styles.skillTags}>
                {ev.parsed_companies.map((c: string) => (
                  <span key={c} className={styles.companyTag}>{c}</span>
                ))}
              </div>
            </div>
          )}

          {ev.parsed_education && (
            <div className={styles.section}>
              <h3>Education</h3>
              <p className={styles.educationText}>{ev.parsed_education}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {ev.source_platform && (
              <div className={styles.section} style={{ flex: 1 }}>
                <h3>Source</h3>
                <span className={styles.sourceBadge}>{ev.source_platform}</span>
              </div>
            )}
            {ev.cv_file_url && (
              <div className={styles.section} style={{ flex: 1 }}>
                <h3>CV</h3>
                <a href={ev.cv_file_url} target="_blank" rel="noopener noreferrer" className={styles.cvLink}>
                  View Original CV →
                </a>
              </div>
            )}
          </div>

        </div>

        {/* Footer actions */}
        <div className={styles.drawerFooter}>
          <button
            className={styles.rejectBtn}
            disabled={loading || ev.status === 'Rejected'}
            onClick={() => handle(() => rejectEvaluation(ev.id))}
          >
            {loading ? <Loader2 size={15} className={styles.spinner} /> : 'Reject'}
          </button>
          <div className={styles.rightActions}>
            <button
              className={styles.secondaryBtn}
              disabled={loading || ev.shortlisted}
              onClick={() => handle(() => shortlistEvaluation(ev.id))}
            >
              {ev.shortlisted ? <><CheckCircle size={14} /> Shortlisted</> : 'Shortlist'}
            </button>
            <button
              className={styles.advanceBtn}
              disabled={loading}
              onClick={() => handle(() => advanceEvaluation(ev.id))}
            >
              Advance to Screened
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
