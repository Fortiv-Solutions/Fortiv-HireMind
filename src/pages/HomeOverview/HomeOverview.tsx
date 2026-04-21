import React, { useEffect } from 'react';
import styles from './HomeOverview.module.css';
import { TrendingUp, Users, Clock, Target, Briefcase, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';

export default function HomeOverview() {
  const { projects, projectsLoading, loadProjects } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Derive live KPIs from real data
  const totalCandidates = projects.reduce((s, p) => s + p.total_candidates, 0);
  const totalShortlisted = projects.reduce((s, p) => s + p.shortlisted, 0);
  const totalScreened = projects.reduce((s, p) => s + p.screened, 0);
  const activeProjects = projects.filter((p) => p.status === 'Active').length;

  const offerRate = totalCandidates > 0
    ? Math.round((totalShortlisted / totalCandidates) * 100)
    : 0;

  // Most recently created projects for the activity feed
  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Executive Dashboard</h2>
          <p className={styles.subtitle}>Company-wide recruitment telemetry — live from your database.</p>
        </div>
      </div>

      {projectsLoading ? (
        <div className={styles.loadingState}>
          <Loader2 size={32} className={styles.spinner} />
          <p>Loading telemetry…</p>
        </div>
      ) : (
        <>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span>Active Projects</span>
                <div className={styles.kpiIconBlue}><Briefcase size={18} /></div>
              </div>
              <div className={styles.kpiStat}>
                <span className={styles.value}>{activeProjects}</span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span>Global Pipeline</span>
                <div className={styles.kpiIconPurple}><Users size={18} /></div>
              </div>
              <div className={styles.kpiStat}>
                <span className={styles.value}>{totalCandidates.toLocaleString()}</span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span>Screened</span>
                <div className={styles.kpiIconGreen}><Target size={18} /></div>
              </div>
              <div className={styles.kpiStat}>
                <span className={styles.value}>{totalScreened.toLocaleString()}</span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span>Shortlist Rate</span>
                <div className={styles.kpiIconOrange}><TrendingUp size={18} /></div>
              </div>
              <div className={styles.kpiStat}>
                <span className={styles.value}>{offerRate}<span className={styles.subtext}>%</span></span>
              </div>
            </div>
          </div>

          <div className={styles.splitLayout}>
            <div className={styles.chartArea}>
              <div className={styles.chartHeader}>
                <h3>Recent Hiring Projects</h3>
                <button className={styles.linkBtn} onClick={() => navigate('/dashboard')}>
                  View All →
                </button>
              </div>

              {recentProjects.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No projects yet. Create one from the Hiring Projects tab.</p>
                </div>
              ) : (
                <div className={styles.projectList}>
                  {recentProjects.map((p) => (
                    <div key={p.id} className={styles.projectRow} onClick={() => navigate(`/project/${p.id}`)}>
                      <div className={styles.projectIconSmall}>
                        {p.title.slice(0, 2).toUpperCase()}
                      </div>
                      <div className={styles.projectRowInfo}>
                        <span className={styles.projectRowTitle}>{p.title}</span>
                        <span className={styles.projectRowMeta}>
                          {p.department ?? '—'} · {p.location ?? '—'} · {p.job_type ?? '—'}
                        </span>
                      </div>
                      <div className={styles.projectRowStats}>
                        <span className={styles.statChip}>{p.total_candidates} candidates</span>
                        <span className={`${styles.statusDot} ${p.status === 'Active' ? styles.dotActive : styles.dotPaused}`}></span>
                        <span className={styles.statusLabel}>{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.scheduleArea}>
              <h3>Pipeline Snapshot</h3>
              {projects.slice(0, 4).map((p) => (
                <div key={p.id} className={styles.agendaItem}>
                  <div className={styles.agendaContent}>
                    <h4>{p.title}</h4>
                    <p>{p.total_candidates} total · {p.shortlisted} shortlisted · {p.rejected} rejected</p>
                  </div>
                  <span className={`${styles.statusBadge} ${p.status === 'Active' ? styles.statusActive : styles.statusPaused}`}>
                    {p.status}
                  </span>
                </div>
              ))}
              {projects.length === 0 && (
                <p className={styles.emptyNote}>No projects to snapshot yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
