import React from 'react';
import styles from './CandidateDrawer.module.css';
import { X, Check, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { CvEvaluation } from '../../types/database';

interface Props {
  evaluation: CvEvaluation;
  onClose: () => void;
}

export default function CandidateDrawer({ evaluation: ev, onClose }: Props) {
  const { shortlistEvaluation, rejectEvaluation, advanceEvaluation } = useStore();
  const [loading, setLoading] = React.useState(false);

  const name = ev.candidate?.full_name ?? ev.parsed_name ?? 'Unknown';
  const email = ev.candidate?.email ?? ev.parsed_email ?? '—';
  const location = ev.candidate?.location ?? ev.parsed_location ?? '—';
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const experience = ev.parsed_experience_years != null ? `${ev.parsed_experience_years} yrs exp.` : '—';
  const skills = ev.parsed_skills ?? [];
  const appliedDate = ev.applied_at
    ? new Date(ev.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  async function handle(action: () => Promise<void>) {
    setLoading(true);
    try { await action(); onClose(); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  return (
    <>
      <div className={styles.overlay} onClick={onClose}></div>
      <div className={styles.drawer}>
        <div className={styles.drawerHeader}>
          <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>

        <div className={styles.profileHero}>
          <div className={styles.avatarLarge}>{initials}</div>
          <div className={styles.profileText}>
            <h2>{name}</h2>
            <p className={styles.email}>{email}</p>
            <p className={styles.subMeta}>{location} · {experience}</p>
            <div className={styles.metaRow}>
              <span className={`${styles.statusSelect} ${styles[`status_${ev.status.replace(' ', '_')}`]}`}>
                <span className={styles.dot}></span> {ev.status}
              </span>
              <span className={styles.timeTag}>Applied {appliedDate}</span>
            </div>
          </div>
        </div>

        <div className={styles.fitScoreCard}>
          <div>
            <div className={styles.scoreTitle}>Total Fit Score</div>
            <div className={styles.scoreRow}>
              <span className={styles.giantScore}>{Math.round(ev.total_score)}%</span>
              <span className={ev.total_score >= 80 ? styles.strongMatch : ev.total_score >= 60 ? styles.medMatch : styles.weakMatch}>
                {ev.total_score >= 80 ? 'Strong Match' : ev.total_score >= 60 ? 'Moderate Match' : 'Weak Match'}
              </span>
            </div>
          </div>
          {/* Score breakdown */}
          <div className={styles.scoreBreakdown}>
            <div className={styles.scoreItem}>
              <span>Skills</span><strong>{Math.round(ev.skills_match_score)}%</strong>
            </div>
            <div className={styles.scoreItem}>
              <span>Experience</span><strong>{Math.round(ev.experience_score)}%</strong>
            </div>
            <div className={styles.scoreItem}>
              <span>Education</span><strong>{Math.round(ev.education_score)}%</strong>
            </div>
          </div>
        </div>

        <div className={styles.scrollContent}>
          {ev.parsed_summary && (
            <div className={styles.aiSummary}>
              <div className={styles.aiBadge}><Sparkles size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />AI Summary</div>
              <p>{ev.parsed_summary}</p>
            </div>
          )}

          {skills.length > 0 && (
            <div className={styles.section}>
              <h3>Parsed Skills</h3>
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

          {ev.source_platform && (
            <div className={styles.section}>
              <h3>Source</h3>
              <span className={styles.sourceBadge}>{ev.source_platform}</span>
            </div>
          )}

          {ev.cv_file_url && (
            <div className={styles.section}>
              <a href={ev.cv_file_url} target="_blank" rel="noopener noreferrer" className={styles.cvLink}>
                View Original CV →
              </a>
            </div>
          )}
        </div>

        <div className={styles.drawerFooter}>
          <button
            className={styles.rejectBtn}
            disabled={loading || ev.status === 'Rejected'}
            onClick={() => handle(() => rejectEvaluation(ev.id))}
          >
            {loading ? <Loader2 size={16} className={styles.spinner} /> : 'Reject'}
          </button>
          <div className={styles.rightActions}>
            <button
              className={styles.secondaryBtn}
              disabled={loading || ev.shortlisted}
              onClick={() => handle(() => shortlistEvaluation(ev.id))}
            >
              {ev.shortlisted ? <><CheckCircle size={16} /> Shortlisted</> : 'Shortlist'}
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
