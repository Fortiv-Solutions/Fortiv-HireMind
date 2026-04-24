import { useEffect, useState } from 'react';
import styles from './Dashboard.module.css';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import NewProjectModal from './NewProjectModal';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock as FcClock, 
  Share2 as FcShare, 
  ChevronDown as FcExpand, 
  Globe as FcGlobe, 
  Briefcase as FcBriefcase, 
  Calendar as FcCalendar, 
  BarChart3 as FcStatistics,
  Plus,
  MessageSquare,
  Users
} from 'lucide-react';

export default function Dashboard() {
  const { projects, projectsLoading, loadProjects } = useStore();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);


  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const getFilteredProjects = () => {
    if (activeTab === 'All') return projects;
    return projects.filter(p => p.status === activeTab);
  };

  const filteredProjects = getFilteredProjects();
  const groupedProjects = {
    Active: filteredProjects.filter(p => p.status === 'Active'),
    Paused: filteredProjects.filter(p => p.status === 'Paused'),
    Closed: filteredProjects.filter(p => p.status === 'Closed'),
  };

  return (
    <div className={styles.container}>

      {/* ── Sub header: title + new button + tabs ── */}
      <div className={styles.subHeader}>
        <div className={styles.titleRow}>
          <h2 className={styles.sectionTitle}>Hiring Projects</h2>
          <button className={styles.newBtn} onClick={() => setShowModal(true)}>+ New Project</button>
        </div>
        <div className={styles.tabs}>
          {['All', 'Active', 'Paused', 'Closed'].map(tab => (
            <button
              key={tab}
              className={`${styles.tabBtn} ${activeTab === tab ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === 'Active' && <span className={styles.tabPip} />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Split View ── */}
      <div className={styles.splitView}>

        {/* Left – project list */}
        <div className={styles.listColumn}>
          {projectsLoading ? (
            <div className={styles.loading}>
              <div className={styles.loadingSpinner} />
              Loading projects…
            </div>
          ) : (
            <>
              {Object.entries(groupedProjects).map(([status, group]) =>
                group.length > 0 && (
                  <div key={status} className={styles.projectGroup}>
                    <div className={styles.groupHeader}>
                      {status.toUpperCase()} <span className={styles.groupCount}>{group.length}</span>
                    </div>
                    <div className={styles.cardList}>
                      {group.map((proj) => (
                        <motion.div
                          key={proj.id}
                          className={`${styles.projectCard} ${selectedProjectId === proj.id ? styles.cardSelected : ''}`}
                          onClick={() => setSelectedProjectId(proj.id)}
                          whileHover={{ y: -2, boxShadow: '0 10px 28px rgba(0,0,0,0.08)' }}
                          layout
                        >
                          {selectedProjectId === proj.id && <div className={styles.cardAccent} />}
                          <div className={styles.cardHeader}>
                            <div className={styles.cardIconBox}>
                              <FcBriefcase size={18} />
                            </div>
                            <div className={styles.cardInfo}>
                              <h3 className={styles.cardTitle}>{proj.title}</h3>
                              <div className={styles.cardMeta}>
                                <span className={styles.metaItem}><FcGlobe size={13} /> {proj.location || 'Remote'}</span>
                                <span className={styles.metaItem}><FcStatistics size={13} /> {proj.total_candidates} candidates</span>
                              </div>
                            </div>
                            <span className={`${styles.badge} ${proj.status === 'Active' ? styles.badgeActive : proj.status === 'Paused' ? styles.badgePaused : styles.badgeClosed}`}>
                              {proj.status}
                            </span>
                          </div>

                          {/* Mini pipeline bar */}
                          <div className={styles.miniPipeline}>
                            {proj.total_candidates > 0 && (
                              <div
                                className={styles.miniPipelineBar}
                                style={{ width: `${Math.round((proj.shortlisted / Math.max(proj.total_candidates, 1)) * 100)}%` }}
                              />
                            )}
                          </div>
                          <div className={styles.miniPipelineLabels}>
                            <span>{proj.screened} screened</span>
                            <span>{proj.shortlisted} shortlisted</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )
              )}
              {filteredProjects.length === 0 && (
                <div className={styles.emptyList}>
                  <FcBriefcase size={48} />
                  <p>No projects found. Create one!</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right – details pane */}
        <div className={styles.detailsColumn}>
          <AnimatePresence mode="wait">
            {selectedProject ? (
              <motion.div
                key={selectedProject.id}
                className={styles.detailsPane}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {/* Toolbar */}
                <div className={styles.paneToolbar}>
                  <div className={styles.toolbarLeft}>
                    <FcBriefcase size={18} />
                    <span>Appointments</span>
                  </div>
                  <div className={styles.toolbarRight}>
                    <button className={styles.iconBtn}><FcShare size={16} /> Share</button>
                    <button className={styles.iconBtn} onClick={() => navigate(`/project/${selectedProject.id}`)}>
                      <FcExpand size={16} /> Expand
                    </button>
                    <button className={styles.iconBtnMore}>···</button>
                  </div>
                </div>

                {/* Content */}
                <div className={styles.paneContent}>
                  <h2 className={styles.paneTitle}>{selectedProject.title}</h2>

                  <div className={styles.paneBadges}>
                    <span className={`${styles.badge} ${selectedProject.status === 'Active' ? styles.badgeActive : selectedProject.status === 'Paused' ? styles.badgePaused : styles.badgeClosed}`}>
                      {selectedProject.status === 'Active' ? '🟢' : selectedProject.status === 'Paused' ? '🟡' : '⚫'} {selectedProject.status}
                    </span>
                    <span className={styles.badgeNeutral}>
                      <FcCalendar size={14} /> {new Date(selectedProject.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className={styles.badgeNeutral}>
                      <FcGlobe size={14} /> {selectedProject.location || 'Remote'}
                    </span>
                  </div>

                  {/* Time Tracker widget */}
                  <div className={styles.timeTracker}>
                    <div className={styles.timeIcon}><FcClock size={22} /></div>
                    <span className={styles.timeLabel}>Time Spent on this project</span>
                    <span className={styles.timeValue}>12:45:00</span>
                    <div className={styles.timeToggle}>⏱</div>
                  </div>

                  {/* Description */}
                  <div className={styles.section}>
                    <h3>Description</h3>
                    <p className={styles.description}>
                      We are looking for an experienced <strong>{selectedProject.title}</strong> with at least {selectedProject.required_experience_years} years of experience.
                      This is a {selectedProject.job_type || 'Full-time'} role{selectedProject.location ? ` based in ${selectedProject.location}` : ''}.
                      The ideal candidate will have a strong background in {selectedProject.department || 'the required field'} and a passion for excellence.
                    </p>
                  </div>

                  {/* Pipeline Stats */}
                  <div className={styles.section}>
                    <h3>Pipeline Overview</h3>
                    <div className={styles.pipelineStats}>
                      {[
                        { label: 'Total', value: selectedProject.total_candidates, color: '#6366f1' },
                        { label: 'Screened', value: selectedProject.screened, color: '#22c55e' },
                        { label: 'Shortlisted', value: selectedProject.shortlisted, color: '#f59e0b' },
                        { label: 'Rejected', value: selectedProject.rejected, color: '#ef4444' },
                      ].map(s => (
                        <div key={s.label} className={styles.statBox} style={{ borderTop: `3px solid ${s.color}` }}>
                          <div className={styles.statBoxValue}>{s.value}</div>
                          <div className={styles.statBoxLabel}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comments */}
                  <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <h3>Comments</h3>
                      <span className={styles.tabText}>Updates</span>
                    </div>
                    <div className={styles.commentList}>
                      {[
                        { initials: 'AM', name: 'Alice Manager', time: '15th Feb 2024', text: 'We need to focus on sourcing more candidates for this role.' },
                        { initials: 'HR', name: 'HR Team', time: 'Just Now', text: 'I have scheduled 3 interviews for tomorrow.' },
                      ].map((c, i) => (
                        <div key={i} className={styles.comment}>
                          <div className={styles.avatar}>{c.initials}</div>
                          <div className={styles.commentBody}>
                            <div className={styles.commentHead}>
                              <strong>{c.name}</strong> • <span>{c.time}</span>
                            </div>
                            <p>{c.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className={styles.commentInputBox}>
                      <input type="text" placeholder="Add a comment…" className={styles.commentInput} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className={styles.emptyDetails}>
                <FcBriefcase size={64} />
                <h3>Select a project</h3>
                <p>Choose a project from the list to view its details</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {showModal && <NewProjectModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
