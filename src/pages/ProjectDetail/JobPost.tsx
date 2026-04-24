import React, { useState, useEffect } from 'react';
import styles from './JobPost.module.css';
import { ExternalLink, Plus, ToggleLeft, ToggleRight, Edit2, Briefcase, Save, X, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function JobPost() {
  const { activeProject, jobPosts, loadJobPosts, addJobPost, toggleJobPostStatus, removeJobPost, updateProjectDescription } = useStore();
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionText, setDescriptionText] = useState('');
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);

  // Load job posts when component mounts or project changes
  useEffect(() => {
    if (activeProject?.id) {
      loadJobPosts(activeProject.id);
    }
  }, [activeProject?.id, loadJobPosts]);

  // Initialize description text
  useEffect(() => {
    if (activeProject?.description) {
      setDescriptionText(activeProject.description);
    }
  }, [activeProject?.description]);

  const handleEditDescription = () => {
    setIsEditingDescription(true);
  };

  const handleSaveDescription = async () => {
    if (!activeProject?.id) return;
    
    setSavingDescription(true);
    try {
      await updateProjectDescription(activeProject.id, descriptionText);
      setIsEditingDescription(false);
    } catch (error) {
      console.error('Failed to save description:', error);
      alert('Failed to save description. Please try again.');
    } finally {
      setSavingDescription(false);
    }
  };

  const handleCancelEdit = () => {
    setDescriptionText(activeProject?.description || '');
    setIsEditingDescription(false);
  };

  const handleToggleStatus = async (postId: string, currentStatus: 'Active' | 'Closed') => {
    try {
      await toggleJobPostStatus(postId, currentStatus);
    } catch (error) {
      console.error('Failed to toggle status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this job posting?')) return;
    
    try {
      await removeJobPost(postId);
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Failed to delete posting. Please try again.');
    }
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
          {!isEditingDescription ? (
            <button className={styles.editBtn} onClick={handleEditDescription}>
              <Edit2 size={16} />
              Edit
            </button>
          ) : (
            <div className={styles.editActions}>
              <button 
                className={styles.cancelBtn} 
                onClick={handleCancelEdit}
                disabled={savingDescription}
              >
                <X size={16} />
                Cancel
              </button>
              <button 
                className={styles.saveBtn} 
                onClick={handleSaveDescription}
                disabled={savingDescription}
              >
                <Save size={16} />
                {savingDescription ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        <div className={styles.descriptionCard}>
          {isEditingDescription ? (
            <textarea
              className={styles.descriptionTextarea}
              value={descriptionText}
              onChange={(e) => setDescriptionText(e.target.value)}
              placeholder="Enter job description..."
              rows={10}
              disabled={savingDescription}
            />
          ) : (
            <>
              {activeProject?.description ? (
                <div className={styles.descriptionContent}>
                  <p>{activeProject.description}</p>
                </div>
              ) : (
                <div className={styles.emptyDescription}>
                  <p>No job description available. Click Edit to add one.</p>
                </div>
              )}
            </>
          )}

          {!isEditingDescription && (
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
          )}
        </div>
      </div>

      {/* Job Postings Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <ExternalLink size={20} />
            <h2>Job Postings</h2>
          </div>
          <button className={styles.addBtn} onClick={() => setShowAddPostModal(true)}>
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
              <button className={styles.emptyActionBtn} onClick={() => setShowAddPostModal(true)}>
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
                  <div className={styles.postHeaderActions}>
                    <button 
                      className={styles.toggleBtn}
                      onClick={() => handleToggleStatus(post.id, post.status)}
                      title={post.status === 'Active' ? 'Deactivate' : 'Activate'}
                    >
                      {post.status === 'Active' ? (
                        <ToggleRight size={24} className={styles.toggleActive} />
                      ) : (
                        <ToggleLeft size={24} className={styles.toggleInactive} />
                      )}
                    </button>
                    <button 
                      className={styles.deleteBtn}
                      onClick={() => handleDeletePost(post.id)}
                      title="Delete posting"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className={styles.postBody}>
                  <div className={styles.postStatus}>
                    <span className={`${styles.statusDot} ${post.status === 'Active' ? styles.statusDotActive : styles.statusDotInactive}`}></span>
                    <span className={styles.statusText}>{post.status}</span>
                  </div>

                  <div className={styles.postMeta}>
                    <span className={styles.postDate}>
                      Posted on {post.posted_at ? new Date(post.posted_at).toLocaleDateString('en-IN', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      }) : 'N/A'}
                    </span>
                  </div>

                  {post.post_url && (
                    <a 
                      href={post.post_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={styles.postLink}
                    >
                      View on {post.platform}
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Job Post Modal */}
      {showAddPostModal && (
        <AddJobPostModal
          projectId={activeProject?.id || ''}
          onClose={() => setShowAddPostModal(false)}
          onAdd={addJobPost}
        />
      )}
    </div>
  );
}

// Add Job Post Modal Component
function AddJobPostModal({ 
  projectId, 
  onClose, 
  onAdd 
}: { 
  projectId: string; 
  onClose: () => void; 
  onAdd: (data: any) => Promise<void>;
}) {
  const [platform, setPlatform] = useState('LinkedIn');
  const [postUrl, setPostUrl] = useState('');
  const [externalJobId, setExternalJobId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!postUrl.trim()) {
      setError('Please enter a job posting URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(postUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onAdd({
        hiring_project_id: projectId,
        platform,
        post_url: postUrl.trim(),
        external_job_id: externalJobId.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add job posting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Add Job Posting</h2>
          <button className={styles.modalClose} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && (
              <div className={styles.errorBanner}>
                {error}
              </div>
            )}

            <div className={styles.formGroup}>
              <label>Platform *</label>
              <select 
                value={platform} 
                onChange={(e) => setPlatform(e.target.value)}
                disabled={loading}
                className={styles.select}
              >
                <option value="LinkedIn">LinkedIn</option>
                <option value="Naukri">Naukri</option>
                <option value="Indeed">Indeed</option>
                <option value="Website">Company Website</option>
                <option value="Email">Email</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Job Posting URL *</label>
              <input
                type="url"
                placeholder="https://linkedin.com/jobs/view/123456"
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                disabled={loading}
                className={styles.input}
              />
              <span className={styles.hint}>Enter the full URL where the job is posted</span>
            </div>

            <div className={styles.formGroup}>
              <label>External Job ID (Optional)</label>
              <input
                type="text"
                placeholder="e.g., 123456"
                value={externalJobId}
                onChange={(e) => setExternalJobId(e.target.value)}
                disabled={loading}
                className={styles.input}
              />
              <span className={styles.hint}>Job ID from the platform (if applicable)</span>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button 
              type="button" 
              className={styles.btnSecondary} 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={styles.btnPrimary}
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Posting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
