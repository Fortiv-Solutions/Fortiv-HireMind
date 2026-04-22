import React, { useState } from 'react';
import styles from './ProjectDetail.module.css';
import { Plus, Upload, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import CandidateDrawer from './CandidateDrawer';
import AddCandidateModal from './AddCandidateModal';
import StatusDropdown from './StatusDropdown';
import type { CvEvaluation } from '../../types/database';

export default function MyCandidates() {
  const { evaluations, evaluationsLoading, activeProject } = useStore();
  const [selectedEval, setSelectedEval] = useState<CvEvaluation | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);

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

  if (evaluationsLoading) {
    return (
      <div className={styles.loadingState}>
        <Loader2 size={40} className={styles.spinner} />
        <p>Loading candidates…</p>
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className={styles.errorState}>
        <p>No active project selected</p>
      </div>
    );
  }

  return (
    <>
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
            <button className={styles.addCandidateBtn} onClick={() => setShowAddModal(true)}>
              <Plus size={16} strokeWidth={2.5} />
              <span>Add Candidate</span>
            </button>
          </div>

          {filteredEvals.length === 0 ? (
            <div className={styles.emptyState}>
              <Upload size={48} className={styles.emptyIcon} />
              <h3>No candidates yet</h3>
              <p>Add candidates manually or upload their resumes to get started.</p>
              <button className={styles.emptyActionBtn} onClick={() => setShowAddModal(true)}>
                <Plus size={16} />
                Add First Candidate
              </button>
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
                    <tr key={ev.id} className={styles.candidateRow}>
                      <td onClick={() => setSelectedEval(ev)}>
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
                      <td onClick={() => setSelectedEval(ev)}>
                        <span className={styles.sourcePill}>{ev.source_platform ?? '—'}</span>
                      </td>
                      <td onClick={() => setSelectedEval(ev)}>
                        <span className={`${styles.scoreBadge} ${ev.total_score >= 80 ? styles.scoreHigh : ev.total_score >= 60 ? styles.scoreMed : styles.scoreLow}`}>
                          {Math.round(ev.total_score)}%
                        </span>
                      </td>
                      <td onClick={() => setSelectedEval(ev)} className={styles.scoreCell}>{Math.round(ev.skills_match_score)}%</td>
                      <td onClick={() => setSelectedEval(ev)} className={styles.scoreCell}>{Math.round(ev.experience_score)}%</td>
                      <td>
                        <StatusDropdown evaluationId={ev.id} currentStatus={ev.status} />
                      </td>
                      <td onClick={() => setSelectedEval(ev)} className={styles.appliedDays}>{appliedDate}</td>
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

      {showAddModal && (
        <AddCandidateModal onClose={() => setShowAddModal(false)} projectId={activeProject.id} />
      )}
    </>
  );
}
