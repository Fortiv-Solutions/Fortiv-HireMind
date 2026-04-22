import React, { useState } from 'react';
import styles from './AddCandidateModal.module.css';
import { X, Upload, User, Loader2, CheckCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface Props {
  onClose: () => void;
  projectId: string;
}

type AddMode = 'upload' | 'manual';

export default function AddCandidateModal({ onClose, projectId }: Props) {
  const [mode, setMode] = useState<AddMode>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { addCandidate } = useStore();

  // Upload mode state
  const [file, setFile] = useState<File | null>(null);

  // Manual mode state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    linkedinUrl: '',
    experienceYears: '',
    resume: null as File | null,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleManualResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, resume: e.target.files[0] });
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a resume file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // TODO: Implement resume upload and parsing logic
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      console.log('Uploading file:', file.name);
      onClose();
    } catch (err) {
      setError('Failed to upload resume. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email) {
      setError('Please fill in all required fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await addCandidate(projectId, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        linkedinUrl: formData.linkedinUrl,
        experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : undefined,
      });
      
      setSuccess(true);
      
      // Close modal after a short delay to show success
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Error adding candidate:', err);
      setError(err.message || 'Failed to add candidate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose}></div>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Add Candidate</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Mode Selector */}
        <div className={styles.modeSelector}>
          <button
            className={`${styles.modeBtn} ${mode === 'upload' ? styles.modeBtnActive : ''}`}
            onClick={() => setMode('upload')}
          >
            <Upload size={18} />
            <span>Upload Resume</span>
          </button>
          <button
            className={`${styles.modeBtn} ${mode === 'manual' ? styles.modeBtnActive : ''}`}
            onClick={() => setMode('manual')}
          >
            <User size={18} />
            <span>Enter Manually</span>
          </button>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            {error}
          </div>
        )}

        {success && (
          <div className={styles.successBanner}>
            <CheckCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
            Candidate added successfully!
          </div>
        )}

        {/* Upload Mode */}
        {mode === 'upload' && (
          <form onSubmit={handleUploadSubmit} className={styles.form}>
            <div className={styles.uploadArea}>
              <input
                type="file"
                id="resume-upload"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className={styles.fileInput}
              />
              <label htmlFor="resume-upload" className={styles.uploadLabel}>
                <Upload size={40} className={styles.uploadIcon} />
                <h3>Drop resume here or click to browse</h3>
                <p>Supports PDF, DOC, DOCX (Max 10MB)</p>
                {file && (
                  <div className={styles.selectedFile}>
                    <CheckCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                    <span>{file.name}</span>
                  </div>
                )}
              </label>
            </div>

            <div className={styles.uploadInfo}>
              <p>Our AI will automatically extract:</p>
              <ul>
                <li>Contact information</li>
                <li>Work experience and skills</li>
                <li>Education background</li>
                <li>Match score against job requirements</li>
              </ul>
            </div>

            <div className={styles.formFooter}>
              <button type="button" className={styles.cancelBtn} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={styles.submitBtn} disabled={loading || !file}>
                {loading ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    Processing...
                  </>
                ) : (
                  'Upload & Evaluate'
                )}
              </button>
            </div>
          </form>
        )}

        {/* Manual Mode */}
        {mode === 'manual' && (
          <form onSubmit={handleManualSubmit} className={styles.form}>
            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label>
                  First Name <span className={styles.req}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label>
                  Last Name <span className={styles.req}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label>
                  Email <span className={styles.req}>*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john.doe@example.com"
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Mumbai, India"
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Years of Experience</label>
                <input
                  type="number"
                  value={formData.experienceYears}
                  onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                  placeholder="5"
                  min="0"
                />
              </div>
            </div>

            <div className={styles.inputGroupFull}>
              <label>LinkedIn URL</label>
              <input
                type="url"
                value={formData.linkedinUrl}
                onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/johndoe"
              />
            </div>

            <div className={styles.inputGroupFull}>
              <label>Resume (Optional)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleManualResumeChange}
                className={styles.fileInputSmall}
              />
              {formData.resume && (
                <div className={styles.fileNameDisplay}>
                  <CheckCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                  {formData.resume.name}
                </div>
              )}
            </div>

            <div className={styles.formFooter}>
              <button type="button" className={styles.cancelBtn} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    Adding...
                  </>
                ) : (
                  'Add Candidate'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
