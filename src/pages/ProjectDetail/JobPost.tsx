import React, { useState } from 'react';
import styles from './JobPost.module.css';
import { ExternalLink, Plus, ToggleLeft, ToggleRight, Loader2, Edit2, Briefcase } from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function JobPost() {
  const { activeProject } = useStore();
  const [jobPosts, setJobPosts] = useState([
    { id: '1', platform: 'LinkedIn', url: 'https://linkedin.com/jobs/view/123456', status: 'Active', postedAt: '2024-01-15' },
    { id: '2', platform: 'Naukri', url: 'https://naukri.com/job-listings/123456', status: 'Active', postedAt: '2024-01-16' },
  ]);

  const toggleJobStatus = (id: string) => {
    setJobPosts(posts => posts.map(post => 
      post.id === id 
        ? { ...post, status: post.status === 'Active' ? 'Closed' : 'Active' }
        : post
    ));
  };

  return (
    <div className={styles.container}>
      {/* Job Description Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <Briefcase size={20} />
            <h2>Job Description</h2>
          </div>
          <button className={styles.editBtn}>
            <Edit2 size={16} />
            Edit
          </button>
        </div>

        <div className={styles.descriptionCard}>
          {activeProject?.description ? (
            <div className={styles.descriptionContent}>
              <p>{activeProject.description}</p>
            </div>
          ) : (
            <div className={styles.emptyDescription}>
              <p>No job description available. Click Edit to add one.</p>
            </div>
          )}

          <div className={styles.jobMeta}>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Department</span>
                <span className={styles.metaValue}>{activeProject?.department || '—'}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Location</span>
                <span className={styles.metaValue}>{activeProject?.location || '—'}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Job Type</span>
                <span className={styles.metaValue}>{activeProject?.job_type || '—'}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Experience Required</span>
                <span className={styles.metaValue}>
                  {activeProject?.required_experience_years != null 
                    ? `${activeProject.required_experience_years}+ years` 
                    : '—'}
                </span>
              </div>
            </div>

            {activeProject?.required_skills && activeProject.required_skills.length > 0 && (
              <div className={styles.skillsSection}>
                <span className={styles.metaLabel}>Required Skills</span>
                <div className={styles.skillTags}>
                  {activeProject.required_skills.map((skill) => (
                    <span key={skill} className={styles.skillTag}>{skill}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Job Postings Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <ExternalLink size={20} />
            <h2>Job Postings</h2>
          </div>
          <button className={styles.addBtn}>
            <Plus size={16} />
            Add Posting
          </button>
        </div>

        <div className={styles.postingsGrid}>
          {jobPosts.length === 0 ? (
            <div className={styles.emptyState}>
              <ExternalLink size={48} className={styles.emptyIcon} />
              <h3>No job postings yet</h3>
              <p>Add job postings to track applications from different platforms.</p>
              <button className={styles.emptyActionBtn}>
                <Plus size={16} />
                Add First Posting
              </button>
            </div>
          ) : (
            jobPosts.map((post) => (
              <div key={post.id} className={styles.postCard}>
                <div className={styles.postHeader}>
                  <div className={styles.platformBadge}>
                    {post.platform}
                  </div>
                  <button 
                    className={styles.toggleBtn}
                    onClick={() => toggleJobStatus(post.id)}
                    title={post.status === 'Active' ? 'Deactivate' : 'Activate'}
                  >
                    {post.status === 'Active' ? (
                      <ToggleRight size={24} className={styles.toggleActive} />
                    ) : (
                      <ToggleLeft size={24} className={styles.toggleInactive} />
                    )}
                  </button>
                </div>

                <div className={styles.postBody}>
                  <div className={styles.postStatus}>
                    <span className={`${styles.statusDot} ${post.status === 'Active' ? styles.statusDotActive : styles.statusDotInactive}`}></span>
                    <span className={styles.statusText}>{post.status}</span>
                  </div>

                  <div className={styles.postMeta}>
                    <span className={styles.postDate}>
                      Posted on {new Date(post.postedAt).toLocaleDateString('en-IN', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>

                  <a 
                    href={post.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={styles.postLink}
                  >
                    View on {post.platform}
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
