import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './ProjectDetail.module.css';
import { ChevronRight, MapPin, Loader2, AlertCircle, Users, FileText, TrendingUp, Settings, Building2, Briefcase, Clock, Bot } from 'lucide-react';
import { useStore } from '../../store/useStore';
import MyCandidates from './MyCandidates';
import JobPost from './JobPost';
import CVEvaluation from './CVEvaluation';
import ProjectSettings from './ProjectSettings';
import ProjectAIInterviews from './ProjectAIInterviews';

type TabType = 'candidates' | 'jobPost' | 'cvEvaluation' | 'aiInterviews' | 'settings';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const {
    activeProject,
    evaluationsLoading,
    evaluationsError,
    loadProjectDetail,
  } = useStore();

  const [activeTab, setActiveTab] = useState<TabType>('candidates');

  useEffect(() => {
    if (id) loadProjectDetail(id);
  }, [id, loadProjectDetail]);

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

  if (evaluationsLoading && !activeProject) {
    return (
      <div className={styles.loadingState}>
        <Loader2 size={40} className={styles.spinner} />
        <p>Loading project…</p>
      </div>
    );
  }

  const tabs = [
    { id: 'candidates' as TabType, label: 'My Candidates', icon: Users },
    { id: 'jobPost' as TabType, label: 'Job Post', icon: FileText },
    { id: 'cvEvaluation' as TabType, label: 'CV Evaluation', icon: TrendingUp },
    { id: 'aiInterviews' as TabType, label: 'AI Interviews', icon: Bot },
    { id: 'settings' as TabType, label: 'Project Settings', icon: Settings },
  ];

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
                <span className={styles.metaItem}><Building2 size={14} /> {activeProject.department}</span>
              )}
              {activeProject?.job_type && (
                <span className={styles.metaItem}><Briefcase size={14} /> {activeProject.job_type}</span>
              )}
              {activeProject?.required_experience_years != null && (
                <span className={styles.metaItem}><Clock size={14} /> {activeProject.required_experience_years}+ years exp.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabs} role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} strokeWidth={2} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'candidates' && <MyCandidates />}
        {activeTab === 'jobPost' && <JobPost />}
        {activeTab === 'cvEvaluation' && <CVEvaluation projectId={id!} />}
        {activeTab === 'aiInterviews' && <ProjectAIInterviews />}
        {activeTab === 'settings' && <ProjectSettings />}
      </div>
    </div>
  );
}
