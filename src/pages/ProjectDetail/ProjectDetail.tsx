import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import styles from './ProjectDetail.module.css';
import { ChevronRight, MapPin, Loader2, AlertCircle, Filter, LayoutGrid, List } from 'lucide-react';
import { useStore } from '../../store/useStore';
import CandidateDrawer from './CandidateDrawer';
import type { CvEvaluation } from '../../types/database';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    activeProject,
    evaluations,
    evaluationsLoading,
    evaluationsError,
    loadProjectDetail,
  } = useStore();

  const [selectedEval, setSelectedEval] = useState<CvEvaluation | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  useEffect(() => {
    if (id) loadProjectDetail(id);
  }, [id, loadProjectDetail]);

  const filteredEvals = statusFilter === 'All'
    ? evaluations
    : evaluations.filter((e) => e.status === statusFilter);

  // Stats derived from live evaluations
  const stats = {
    total: evaluations.length,
    new: evaluations.filter((e) => e.status === 'New').length,
    screened: evaluations.filter((e) => e.status === 'Screened').length,
    shortlisted: evaluations.filter((e) => e.status === 'Shortlisted').length,
    underReview: evaluations.filter((e) => e.status === 'Under Review').length,
    rejected: evaluations.filter((e) => e.status === 'Rejected').length,
  };

  if (evaluationsError) {
    return (
      <div className={styles.errorState}>
        <AlertCircle size={40} />
        <h3>Could not load project</h3>
        <p>{evaluationsError}</p>
        <button onClick={() => id && loadProjectDetail(id)}>Retry</button>
      </div>
    );
  }

  if (evaluationsLoading) {
    return (
      <div className={styles.loadingState}>
        <Loader2 size={40} className={styles.spinner} />
        <p>Loading candidate pipeline…</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.breadcrumbs}>
          <Link to="/dashboard">Hiring Projects</Link> <ChevronRight size={14} />
          <span>{activeProject?.title ?? '…'}</span>
        </div>

        <div className={styles.titleRow}>
          <div>
            <h1>{activeProject?.title ?? '—'}</h1>
            <div className={styles.meta}>
              {activeProject?.location && (
                <span className={styles.metaItem}><MapPin size={14} /> {activeProject.location}</span>
              )}
              {activeProject?.department && (
                <span className={styles.metaItem}>🏛️ {activeProject.department}</span>
              )}
              {activeProject?.job_type && (
                <span className={styles.metaItem}>💼 {activeProject.job_type}</span>
              )}
              {activeProject?.required_experience_years != null && (
                <span className={styles.metaItem}>⏱ {activeProject.required_experience_years}+ years exp.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Stage Strip */}
      <div className={styles.statsStrip}>
        {[
          { label: 'Total Sourced', value: stats.total },
          { label: 'New', value: stats.new },
          { label: 'Under Review', value: stats.underReview },
          { label: 'Screened', value: stats.screened },
          { label: 'Shortlisted', value: stats.shortlisted },
          { label: 'Rejected', value: stats.rejected },
        ].map((s) => (
          <div key={s.label} className={styles.statBox}>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={styles.statValue}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className={styles.mainLayout}>
        {/* Filter Sidebar */}
        <div className={styles.leftSidebar}>
          <div className={styles.filterHeader}>
            <h3>Filters</h3>
            <button className={styles.resetBtn} onClick={() => setStatusFilter('All')}>Reset</button>
          </div>

          <div className={styles.filterSection}>
            <h4>Status</h4>
            {['All', 'New', 'Under Review', 'Screened', 'Shortlisted', 'Rejected'].map((s) => (
              <label key={s} className={styles.checkboxLabel}>
                <input
                  type="radio"
                  name="statusFilter"
                  checked={statusFilter === s}
                  onChange={() => setStatusFilter(s)}
                />
                <span className={styles.boxText}>
                  {s} ({s === 'All' ? evaluations.length : evaluations.filter((e) => e.status === s).length})
                </span>
              </label>
            ))}
          </div>

          {activeProject?.required_skills && activeProject.required_skills.length > 0 && (
            <div className={styles.filterSection}>
              <h4>Required Skills</h4>
              <div className={styles.pillContainer}>
                {activeProject.required_skills.map((skill) => (
                  <span key={skill} className={`${styles.expPill} ${styles.expPillActive}`}>{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Candidate Table */}
        <div className={styles.contentArea}>
          <div className={styles.tableToolbar}>
            <div className={styles.showingText}>
              Showing <strong>{filteredEvals.length}</strong> candidate{filteredEvals.length !== 1 ? 's' : ''}
              {statusFilter !== 'All' ? ` · ${statusFilter}` : ''}
            </div>
          </div>

          {filteredEvals.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No candidates match this filter.</p>
            </div>
          ) : (
            <table className={styles.candidateTable}>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Source</th>
                  <th>Match Score</th>
                  <th>Skills Score</th>
                  <th>Exp. Score</th>
                  <th>Status</th>
                  <th>Applied</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvals.map((ev) => {
                  const name = ev.candidate?.full_name ?? ev.parsed_name ?? 'Unknown';
                  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                  const location = ev.candidate?.location ?? ev.parsed_location ?? null;
                  const appliedDate = ev.applied_at
                    ? new Date(ev.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                    : '—';

                  return (
                    <tr key={ev.id} className={styles.candidateRow} onClick={() => setSelectedEval(ev)}>
                      <td>
                        <div className={styles.candidateProfile}>
                          <div className={styles.avatarBlob}>{initials}</div>
                          <div>
                            <div className={styles.cName}>{name}</div>
                            <div className={styles.cRole}>
                              {location ?? ev.parsed_email ?? '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={styles.sourcePill}>{ev.source_platform ?? '—'}</span>
                      </td>
                      <td>
                        <span className={`${styles.scoreBadge} ${ev.total_score >= 80 ? styles.scoreHigh : ev.total_score >= 60 ? styles.scoreMed : styles.scoreLow}`}>
                          {Math.round(ev.total_score)}%
                        </span>
                      </td>
                      <td className={styles.scoreCell}>{Math.round(ev.skills_match_score)}%</td>
                      <td className={styles.scoreCell}>{Math.round(ev.experience_score)}%</td>
                      <td>
                        <span className={`${styles.statusPill} ${styles[`status_${ev.status.replace(' ', '_')}`]}`}>
                          <span className={styles.statusDot}></span>
                          {ev.status}
                        </span>
                      </td>
                      <td className={styles.appliedDays}>{appliedDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedEval && (
        <CandidateDrawer evaluation={selectedEval} onClose={() => setSelectedEval(null)} />
      )}
    </div>
  );
}
