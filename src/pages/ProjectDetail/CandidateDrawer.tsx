import React from 'react';
import styles from './CandidateDrawer.module.css';
import { X, Loader2, CheckCircle, Sparkles, MapPin, Clock, FileText, Building2, GraduationCap, Zap } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { CvEvaluation } from '../../types/database';
import CVPreviewModal from './CVPreviewModal';

interface Props {
  evaluation: CvEvaluation;
  onClose: () => void;
}

/** Cleans education strings that arrive as JSON arrays like ["Degree, Uni","..."] */
function parseEducation(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((s: string) => s.trim()).filter(Boolean);
    } catch {
      // fall through to plain string
    }
  }
  return [trimmed];
}

export default function CandidateDrawer({ evaluation: ev, onClose }: Props) {
  const { shortlistEvaluation, rejectEvaluation, advanceEvaluation } = useStore();
  const [loading, setLoading] = React.useState(false);
  const [showCVPreview, setShowCVPreview] = React.useState(false);

  const name        = ev.candidate?.full_name ?? ev.parsed_name ?? 'Unknown';
  const email       = ev.candidate?.email     ?? ev.parsed_email ?? '—';
  const location    = ev.candidate?.location  ?? ev.parsed_location ?? null;
  const initials    = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const experience  = ev.parsed_experience_years != null ? `${ev.parsed_experience_years} yrs exp.` : null;
  const skills      = ev.parsed_skills ?? [];
  const companies   = ev.parsed_companies ?? [];
  const eduLines    = parseEducation(ev.parsed_education);
  const appliedDate = ev.applied_at
    ? new Date(ev.applied_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const statusKey = `status_${ev.status.replace(/\s+/g, '_')}` as keyof typeof styles;

  const score = Math.round(ev.total_score);
  const matchLabel = score >= 80 ? 'Strong Match' : score >= 60 ? 'Moderate Match' : 'Weak Match';
  const matchMod   = score >= 80 ? styles.strong   : score >= 60 ? styles.moderate  : styles.weak;

  // Score arc: 0–100 maps to stroke-dashoffset on a circle
  const CIRC = 2 * Math.PI * 28; // r=28
  const offset = CIRC - (score / 100) * CIRC;
  const arcColor = score >= 80 ? '#15803D' : score >= 60 ? '#B45309' : '#DC2626';

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

        {/* ── Top accent bar ── */}
        <div className={styles.accentBar} />

        {/* ── Header ── */}
        <div className={styles.drawerHeader}>
          <span className={styles.drawerLabel}>Candidate Profile</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        {/* ── Hero section ── */}
        <div className={styles.hero}>
          <div className={styles.avatarWrap}>
            <div className={styles.avatar}>{initials}</div>
          </div>

          <div className={styles.heroInfo}>
            <h2 className={styles.candidateName}>{name}</h2>
            <div className={styles.heroMeta}>
              <span className={styles.metaItem}>{email}</span>
              {location && (
                <span className={styles.metaItem}>
                  <MapPin size={11} strokeWidth={2.2} />
                  {location}
                </span>
              )}
              {experience && (
                <span className={styles.metaItem}>
                  <Clock size={11} strokeWidth={2.2} />
                  {experience}
                </span>
              )}
            </div>
            <div className={styles.heroTags}>
              <span className={`${styles.statusPill} ${styles[statusKey] ?? ''}`}>
                <span className={styles.dot} />
                {ev.status}
              </span>
              <span className={styles.appliedTag}>Applied {appliedDate}</span>
            </div>
          </div>

          {/* Score ring */}
          <div className={styles.scoreRing}>
            <svg width="72" height="72" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="28" fill="none" stroke="var(--color-border)" strokeWidth="5" />
              <circle
                cx="36" cy="36" r="28" fill="none"
                stroke={arcColor} strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={offset}
                transform="rotate(-90 36 36)"
                style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
              />
            </svg>
            <div className={styles.ringInner}>
              <span className={styles.ringScore}>{score}%</span>
            </div>
          </div>
        </div>

        <div className={styles.heroDivider} />

        {/* ── Main content: 3-column grid ── */}
        <div className={styles.body}>

          {/* ── Left column ── */}
          <div className={styles.col}>

            {/* Fit breakdown */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <Zap size={13} className={styles.cardIcon} />
                <span>Fit Breakdown</span>
              </div>
              <div className={styles.scoreBreakdown}>
                {[
                  { label: 'Skills',     val: Math.round(ev.skills_match_score) },
                  { label: 'Experience', val: Math.round(ev.experience_score) },
                  { label: 'Education',  val: Math.round(ev.education_score) },
                ].map(({ label, val }) => (
                  <div key={label} className={styles.scoreRow}>
                    <span className={styles.scoreLabel}>{label}</span>
                    <div className={styles.scoreBar}>
                      <div
                        className={styles.scoreBarFill}
                        style={{ width: `${val}%`, background: val >= 80 ? '#15803D' : val >= 60 ? '#B45309' : '#DC2626' }}
                      />
                    </div>
                    <span className={styles.scoreVal}>{val}%</span>
                  </div>
                ))}
              </div>
              <div className={`${styles.matchBadge} ${matchMod}`}>{matchLabel}</div>
            </div>

            {/* Source + CV */}
            <div className={styles.cardRow}>
              {ev.source_platform && (
                <div className={styles.card} style={{ flex: 1 }}>
                  <div className={styles.cardHeader}>
                    <FileText size={13} className={styles.cardIcon} />
                    <span>Source</span>
                  </div>
                  <span className={styles.sourceBadge}>{ev.source_platform}</span>
                </div>
              )}
              {ev.cv_file_url && (
                <div className={styles.card} style={{ flex: 1 }}>
                  <div className={styles.cardHeader}>
                    <FileText size={13} className={styles.cardIcon} />
                    <span>CV</span>
                  </div>
                  <button
                    className={styles.cvLink}
                    onClick={() => setShowCVPreview(true)}
                  >
                    View CV →
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* ── Right column ── */}
          <div className={styles.col}>

            {/* AI Summary */}
            {ev.parsed_summary && (
              <div className={`${styles.card} ${styles.summaryCard}`}>
                <div className={styles.cardHeader}>
                  <Sparkles size={13} className={styles.cardIconBrand} />
                  <span className={styles.aiBadgeText}>AI Summary</span>
                </div>
                <p className={styles.summaryText}>{ev.parsed_summary}</p>
              </div>
            )}

            {/* Skills */}
            {skills.length > 0 && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <Zap size={13} className={styles.cardIcon} />
                  <span>Skills</span>
                </div>
                <div className={styles.tagCloud}>
                  {skills.map((s: string) => (
                    <span key={s} className={styles.skillTag}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Companies */}
            {companies.length > 0 && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <Building2 size={13} className={styles.cardIcon} />
                  <span>Previous Companies</span>
                </div>
                <div className={styles.tagCloud}>
                  {companies.map((c: string) => (
                    <span key={c} className={styles.companyTag}>{c}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {eduLines.length > 0 && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <GraduationCap size={13} className={styles.cardIcon} />
                  <span>Education</span>
                </div>
                <ul className={styles.eduList}>
                  {eduLines.map((line, i) => (
                    <li key={i} className={styles.eduItem}>{line}</li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        </div>

        {/* ── Footer ── */}
        <div className={styles.footer}>
          <button
            className={styles.rejectBtn}
            disabled={loading || ev.status === 'Rejected'}
            onClick={() => handle(() => rejectEvaluation(ev.id))}
          >
            {loading ? <Loader2 size={14} className={styles.spinner} /> : 'Reject'}
          </button>
          <div className={styles.footerRight}>
            <button
              className={styles.shortlistBtn}
              disabled={loading || ev.shortlisted}
              onClick={() => handle(() => shortlistEvaluation(ev.id))}
            >
              {ev.shortlisted ? <><CheckCircle size={13} /> Shortlisted</> : 'Shortlist'}
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

      {/* CV Preview Modal — rendered outside the drawer so it sits above the overlay */}
      {showCVPreview && ev.cv_file_url && (
        <CVPreviewModal
          cvFileUrl={ev.cv_file_url}
          candidateName={name}
          onClose={() => setShowCVPreview(false)}
        />
      )}
    </>
  );
}
