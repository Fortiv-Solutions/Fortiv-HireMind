import { useEffect, useState } from 'react';
import styles from './Dashboard.module.css';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import NewProjectModal from './NewProjectModal';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Users,
  ThumbsUp,
  Clock,
  Filter,
  MoreHorizontal,
  ChevronRight,
} from 'lucide-react';

export default function Dashboard() {
  const { projects, projectsLoading, loadProjects } = useStore();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const totalCandidates = projects.reduce((s, p) => s + (p.total_candidates ?? 0), 0);
  const totalShortlisted = projects.reduce((s, p) => s + (p.shortlisted ?? 0), 0);
  const pendingReview = projects.reduce((s, p) => s + ((p.total_candidates ?? 0) - (p.screened ?? 0) - (p.rejected ?? 0)), 0);

  const stats = [
    { label: 'Total Projects',   value: projects.length,              icon: <Briefcase size={18} /> },
    { label: 'Total Candidates', value: totalCandidates,              icon: <Users size={18} /> },
    { label: 'Shortlisted',      value: totalShortlisted,             icon: <ThumbsUp size={18} /> },
    { label: 'Pending Review',   value: Math.max(0, pendingReview),   icon: <Clock size={18} /> },
  ];

  function getInitials(title: string) {
    return title.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  }

  const activeProjects = projects.filter(p => p.status === 'Active');

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <span className={styles.breadcrumbLink}>Dashboard</span>
        <ChevronRight size={14} className={styles.breadcrumbSep} />
        <span className={styles.breadcrumbCurrent}>Hiring Projects</span>
      </div>

      {/* Page header */}
      <div className={styles.pageHeader}>
        <div className={styles.titleRow}>
          <h1 className={styles.pageTitle}>Hiring Projects</h1>
          <span className={styles.projectCountBadge}>{projects.length} total</span>
        </div>
        <button className={styles.newBtn} onClick={() => setShowModal(true)}>
          + New Hiring Project
        </button>
      </div>

      {/* Stat cards */}
      <div className={styles.statsGrid}>
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            className={styles.statCard}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <div className={styles.statIcon}>{s.icon}</div>
            <div className={styles.statInfo}>
              <div className={styles.statLabel}>{s.label}</div>
              <div className={styles.statValue}>{s.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Active Projects table */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <span className={styles.tableTitle}>Active Projects</span>
          <div className={styles.tableActions}>
            <button className={styles.iconBtn}><Filter size={16} /></button>
            <button className={styles.iconBtn}><MoreHorizontal size={16} /></button>
          </div>
        </div>

        {projectsLoading ? (
          <div className={styles.loading}>
            <div className={styles.loadingSpinner} />
            <p>Loading projects…</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>HIRING PROJECT</th>
                  <th>DEPARTMENT</th>
                  <th>LOCATION</th>
                  <th>CANDIDATES</th>
                  <th>SHORTLISTED</th>
                  <th>SCREENED</th>
                  <th>REJECTED</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {activeProjects.length === 0 ? (
                  <tr>
                    <td colSpan={9} className={styles.emptyRow}>
                      No active projects. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  activeProjects.map((proj, i) => (
                    <motion.tr
                      key={proj.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className={styles.tableRow}
                      onClick={() => navigate(`/project/${proj.id}`)}
                      title="Click to open project"
                    >
                      <td>
                        <div className={styles.projectCell}>
                          <div className={styles.projectAvatar}>
                            {getInitials(proj.title)}
                          </div>
                          <div className={styles.projectInfo}>
                            <span className={styles.projectName}>{proj.title}</span>
                            <span className={styles.projectMeta}>
                              {proj.job_type ?? 'Full-time'} · {proj.required_experience_years ?? 0}+ yrs
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className={styles.cell}>{proj.department || '—'}</td>
                      <td className={styles.cell}>{proj.location || '—'}</td>
                      <td className={styles.cell}>
                        <span className={styles.countBadge}>{proj.total_candidates ?? 0}</span>
                      </td>
                      <td className={styles.cellHighlight}>
                        <span className={styles.countBadge}>{proj.shortlisted ?? 0}</span>
                      </td>
                      <td className={styles.cell}>{proj.screened ?? 0}</td>
                      <td className={styles.cell}>{proj.rejected ?? 0}</td>
                      <td>
                        <span className={`${styles.badge} ${
                          proj.status === 'Active' ? styles.badgeActive :
                          proj.status === 'Paused' ? styles.badgePaused :
                          styles.badgeClosed
                        }`}>
                          <span className={styles.badgeDot} />
                          {proj.status}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className={styles.rowActions}>
                          <button
                            className={styles.viewBtn}
                            onClick={() => navigate(`/project/${proj.id}`)}
                          >
                            View
                          </button>
                          <button className={styles.moreBtn}>
                            <MoreHorizontal size={15} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && <NewProjectModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
