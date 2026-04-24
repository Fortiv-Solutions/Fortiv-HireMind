import { useEffect } from 'react';
import styles from './HomeOverview.module.css';
import { 
  TrendingUp as FcBullish, 
  Users as FcCollaboration, 
  BarChart3 as FcStatistics, 
  Briefcase as FcBriefcase, 
  RefreshCcw as FcSynchronize, 
  Building2 as FcOrganization,
  ArrowRight
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function HomeOverview() {
  const { projects, projectsLoading, loadProjects, user } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const fullName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split('@')[0] ??
    'there';
  const firstName = fullName.split(' ')[0];

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const totalCandidates = projects.reduce((s, p) => s + p.total_candidates, 0);
  const totalShortlisted = projects.reduce((s, p) => s + p.shortlisted, 0);
  const totalScreened = projects.reduce((s, p) => s + p.screened, 0);
  const activeProjects = projects.filter((p) => p.status === 'Active').length;
  const offerRate = totalCandidates > 0 ? Math.round((totalShortlisted / totalCandidates) * 100) : 0;

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className={styles.container}>

      {/* ── Welcome Banner ── */}
      <motion.div
        className={styles.welcomeBanner}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className={styles.welcomeLeft}>
          <h1 className={styles.welcomeTitle}>Welcome back, {firstName}</h1>
          <p className={styles.welcomeSub}>Here's what's happening with your recruitment pipeline today.</p>

          <div className={styles.progressRow}>
            <div className={styles.progressItem}>
              <span className={styles.progressLabel}>Interviews</span>
              <div className={styles.progressTrack}>
                <div className={styles.progressFillDark} style={{ width: '15%' }} />
              </div>
              <span className={styles.progressPct}>15%</span>
            </div>
            <div className={styles.progressItem}>
              <span className={styles.progressLabel}>Hired</span>
              <div className={styles.progressTrack}>
                <div className={styles.progressFillGold} style={{ width: '15%' }} />
              </div>
              <span className={styles.progressPct}>15%</span>
            </div>
            <div className={styles.progressItem}>
              <span className={styles.progressLabel}>Project time</span>
              <div className={styles.progressTrack}>
                <div className={styles.progressFillGray} style={{ width: `${Math.min(offerRate + 40, 100)}%` }} />
              </div>
              <span className={styles.progressPct}>{Math.min(offerRate + 40, 100)}%</span>
            </div>
            <div className={styles.progressItem}>
              <span className={styles.progressLabel}>Output</span>
              <div className={styles.progressTrackOutline}>
                <span className={styles.progressOutlinePct}>10%</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.kpiBannerStats}>
          <div className={styles.kpiBannerStat}>
            <div className={styles.kpiBannerIcon}><FcCollaboration size={22} /></div>
            <span className={styles.kpiBannerNum}>{totalCandidates}</span>
            <span className={styles.kpiBannerLabel}>Candidates</span>
          </div>
          <div className={styles.kpiDivider} />
          <div className={styles.kpiBannerStat}>
            <div className={styles.kpiBannerIcon}><FcBullish size={22} /></div>
            <span className={styles.kpiBannerNum}>{totalShortlisted}</span>
            <span className={styles.kpiBannerLabel}>Hirings</span>
          </div>
          <div className={styles.kpiDivider} />
          <div className={styles.kpiBannerStat}>
            <div className={styles.kpiBannerIcon}><FcOrganization size={22} /></div>
            <span className={styles.kpiBannerNum}>{projects.length}</span>
            <span className={styles.kpiBannerLabel}>Projects</span>
          </div>
        </div>
      </motion.div>

      {projectsLoading ? (
        <div className={styles.loadingState}>
          <FcSynchronize size={32} className={styles.spinner} />
          <p>Loading telemetry…</p>
        </div>
      ) : (
        <>
          <motion.div
            className={styles.kpiGrid}
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={itemVariants} className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span>Active Projects</span>
                <div className={styles.kpiIconBlue}><FcBriefcase size={22} /></div>
              </div>
              <div className={styles.kpiStat}>
                <span className={styles.value}>{activeProjects}</span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span>Global Pipeline</span>
                <div className={styles.kpiIconPurple}><FcCollaboration size={22} /></div>
              </div>
              <div className={styles.kpiStat}>
                <span className={styles.value}>{totalCandidates.toLocaleString()}</span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span>Screened</span>
                <div className={styles.kpiIconGreen}><FcStatistics size={22} /></div>
              </div>
              <div className={styles.kpiStat}>
                <span className={styles.value}>{totalScreened.toLocaleString()}</span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span>Shortlist Rate</span>
                <div className={styles.kpiIconOrange}><FcBullish size={22} /></div>
              </div>
              <div className={styles.kpiStat}>
                <span className={styles.value}>{offerRate}<span className={styles.subtext}>%</span></span>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            className={styles.splitLayout}
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={itemVariants} className={styles.chartArea}>
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
            </motion.div>

            <motion.div variants={itemVariants} className={styles.scheduleArea}>
              <h3>Pipeline Snapshot</h3>
              {projects.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className={styles.agendaItem}
                  onClick={() => navigate(`/project/${p.id}`)}
                  style={{ cursor: 'pointer' }}
                >
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
            </motion.div>
          </motion.div>
        </>
      )}
    </div>
  );
}
