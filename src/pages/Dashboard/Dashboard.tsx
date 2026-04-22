import { useEffect, useState } from 'react';
import styles from './Dashboard.module.css';
import { Briefcase, Users, ThumbsUp, AlertCircle, MoreHorizontal, Filter, ChevronRight, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import NewProjectModal from './NewProjectModal';

export default function Dashboard() {
  const { projects, projectsLoading, projectsError, loadProjects } = useStore();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Derive summary stats from live data
  const totalCandidates = projects.reduce((sum, p) => sum + p.total_candidates, 0);
  const totalShortlisted = projects.reduce((sum, p) => sum + p.shortlisted, 0);
  const totalPending = projects.reduce((sum, p) => sum + (p.total_candidates - p.screened - p.rejected - p.shortlisted), 0);

  if (projectsError) {
    return (
      <div className={styles.errorState}>
        <AlertCircle size={40} />
        <h3>Could not load projects</h3>
        <p>{projectsError}</p>
        <button onClick={loadProjects}>Retry</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.breadcrumbs}>
          Dashboard <ChevronRight size={14} /> <span>Hiring Projects</span>
        </div>
        <div className={styles.titleRow}>
          <h1>Hiring Projects</h1>
          <button className={styles.newBtn} onClick={() => setShowModal(true)}>+ New Hiring Project</button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Total Projects</span>
            <div className={`${styles.iconWrap} ${styles.blue}`}><Briefcase size={20} /></div>
          </div>
          <div className={styles.statValue}>{projects.length}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Total Candidates</span>
            <div className={`${styles.iconWrap} ${styles.purple}`}><Users size={20} /></div>
          </div>
          <div className={styles.statValue}>{totalCandidates.toLocaleString()}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Shortlisted</span>
            <div className={`${styles.iconWrap} ${styles.green}`}><ThumbsUp size={20} /></div>
          </div>
          <div className={styles.statValue}>{totalShortlisted.toLocaleString()}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Pending Review</span>
            <div className={`${styles.iconWrap} ${styles.red}`}><AlertCircle size={20} /></div>
          </div>
          <div className={styles.statValue}>{Math.max(0, totalPending).toLocaleString()}</div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableToolbar}>
          <h2>Active Projects</h2>
          <div className={styles.toolbarActions}>
            <button className={styles.iconBtn}><Filter size={18} /></button>
            <button className={styles.iconBtn}><MoreHorizontal size={18} /></button>
          </div>
        </div>

        {projectsLoading ? (
          <div className={styles.loadingState}>
            <Loader2 size={32} className={styles.spinner} />
            <p>Loading projects from Supabase…</p>
          </div>
        ) : projects.length === 0 ? (
          <div className={styles.emptyState}>
            <Briefcase size={40} />
            <h3>No hiring projects yet</h3>
            <p>Create your first project to start evaluating candidates.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Hiring Project</th>
                <th>Department</th>
                <th>Location</th>
                <th>Candidates</th>
                <th>Shortlisted</th>
                <th>Screened</th>
                <th>Rejected</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((proj) => (
                <tr 
                  key={proj.id} 
                  className={styles.tableRow}
                  onClick={() => navigate(`/project/${proj.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div className={styles.projectCell}>
                      <div className={styles.projectIcon}>
                        {proj.title.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className={styles.projectName}>{proj.title}</div>
                        <div className={styles.projectMeta}>
                          {proj.job_type ?? '—'} · {proj.required_experience_years}+ yrs
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.metaCell}>{proj.department ?? '—'}</td>
                  <td className={styles.metaCell}>{proj.location ?? '—'}</td>
                  <td className={styles.boldNum}>{proj.total_candidates}</td>
                  <td className={styles.blueNum}>{proj.shortlisted}</td>
                  <td className={styles.boldNum}>{proj.screened}</td>
                  <td className={styles.redNum}>{proj.rejected}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${proj.status === 'Active' ? styles.statusActive : proj.status === 'Paused' ? styles.statusPaused : styles.statusClosed}`}>
                      {proj.status}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionCell}>
                      <button 
                        className={styles.viewBtn} 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/project/${proj.id}`);
                        }}
                      >
                        View
                      </button>
                      <button 
                        className={styles.iconBtn}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <NewProjectModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
