import React, { useState } from 'react';
import styles from './ProjectSettings.module.css';
import { Save, Loader2, Trash2, Archive } from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function ProjectSettings() {
  const { activeProject } = useStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: activeProject?.title || '',
    department: activeProject?.department || '',
    location: activeProject?.location || '',
    jobType: activeProject?.job_type || 'Full-time',
    experienceYears: activeProject?.required_experience_years || 0,
    education: activeProject?.required_education || '',
    description: activeProject?.description || '',
    skills: activeProject?.required_skills?.join(', ') || '',
    status: activeProject?.status || 'Active',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // TODO: Implement save logic
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Saving project settings:', formData);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this project?')) return;
    
    setLoading(true);
    try {
      // TODO: Implement archive logic
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Archiving project');
    } catch (error) {
      console.error('Failed to archive:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    
    setLoading(true);
    try {
      // TODO: Implement delete logic
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Deleting project');
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Project Settings</h2>
          <p>Manage your hiring project configuration and requirements</p>
        </div>
      </div>

      <form onSubmit={handleSave} className={styles.form}>
        {/* Basic Information */}
        <div className={styles.section}>
          <h3>Basic Information</h3>
          
          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label>
                Project Title <span className={styles.req}>*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Senior Full Stack Developer"
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Department</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g., Engineering"
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Mumbai, India"
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Job Type</label>
              <select name="jobType" value={formData.jobType} onChange={handleChange}>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label>Required Experience (Years)</label>
              <input
                type="number"
                name="experienceYears"
                value={formData.experienceYears}
                onChange={handleChange}
                min="0"
                placeholder="e.g., 5"
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Project Status</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Job Requirements */}
        <div className={styles.section}>
          <h3>Job Requirements</h3>
          
          <div className={styles.inputGroupFull}>
            <label>Required Skills (comma-separated)</label>
            <input
              type="text"
              name="skills"
              value={formData.skills}
              onChange={handleChange}
              placeholder="e.g., React, TypeScript, Node.js, AWS"
            />
            <span className={styles.helpText}>
              Enter skills separated by commas. These will be used for candidate matching.
            </span>
          </div>

          <div className={styles.inputGroupFull}>
            <label>Education Requirements</label>
            <input
              type="text"
              name="education"
              value={formData.education}
              onChange={handleChange}
              placeholder="e.g., Bachelor's in Computer Science or equivalent"
            />
          </div>

          <div className={styles.inputGroupFull}>
            <label>Job Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={10}
              placeholder="Enter detailed job description, responsibilities, and requirements..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className={styles.formActions}>
          <button type="submit" className={styles.saveBtn} disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className={styles.spinner} />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className={styles.dangerZone}>
        <h3>Danger Zone</h3>
        <p>Irreversible actions that affect this project</p>
        
        <div className={styles.dangerActions}>
          <button 
            className={styles.archiveBtn} 
            onClick={handleArchive}
            disabled={loading}
          >
            <Archive size={18} />
            Archive Project
          </button>
          
          <button 
            className={styles.deleteBtn} 
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 size={18} />
            Delete Project
          </button>
        </div>
      </div>
    </div>
  );
}
