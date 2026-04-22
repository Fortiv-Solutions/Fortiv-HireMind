import React, { useState, useEffect } from 'react';
import styles from './CVEvaluator.module.css';
import { Upload, FileText, CheckCircle, AlertCircle, Sparkles, Plus, Edit2, Trash2, Copy, Eye, BarChart3, Target, Clock, Zap } from 'lucide-react';
import { useStore } from '../../store/useStore';

type ViewMode = 'upload' | 'criteria';

interface EvaluationCriteria {
  id: string;
  name: string;
  description: string;
  criteriaCount: number;
  projectsUsed: number;
  status: 'Active' | 'Inactive' | 'Draft' | 'Archived';
  createdAt: string;
}

export default function CVEvaluator() {
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const { projects, loadProjects } = useStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [uploadMode, setUploadMode] = useState<'new' | 'existing'>('new');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);

  // Mock criteria data
  const [criteriaList, setCriteriaList] = useState<EvaluationCriteria[]>([
    {
      id: '1',
      name: 'Software Engineer',
      description: 'Screen every applicant against custom criteria.',
      criteriaCount: 5,
      projectsUsed: 1,
      status: 'Active',
      createdAt: '2024-04-27',
    },
  ]);

  const [criteriaFilter, setCriteriaFilter] = useState<'Active' | 'Inactive' | 'Archived' | 'Draft'>('Active');

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PDF or DOCX file');
      return;
    }

    setUploadedFile(file);
  };

  const handleEvaluate = async () => {
    if (!uploadedFile || !selectedProjectId) return;

    setEvaluating(true);
    
    // Simulate evaluation (replace with actual API call)
    setTimeout(() => {
      setEvaluationResult({
        candidateName: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+91 98765 43210',
        totalScore: 78,
        skillsMatch: 85,
        experienceScore: 75,
        educationScore: 70,
        strengths: [
          'Strong proficiency in React and TypeScript',
          '5+ years of relevant experience',
          'Led multiple successful projects',
        ],
        concerns: [
          'Limited experience with cloud platforms',
          'No mention of testing frameworks',
        ],
        recommendation: 'Strong Match',
      });
      setEvaluating(false);
    }, 2500);
  };

  const filteredCriteria = criteriaList.filter(c => c.status === criteriaFilter);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1>CV Evaluator</h1>
          <p className={styles.subtitle}>
            Screen every applicant against custom criteria. Spend less time on CVs — more time on candidates who matter.
          </p>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className={styles.tabs}>
        <button
          className={viewMode === 'upload' ? styles.tabActive : styles.tab}
          onClick={() => setViewMode('upload')}
        >
          <Upload size={18} />
          CV Upload & Evaluation
        </button>
        <button
          className={viewMode === 'criteria' ? styles.tabActive : styles.tab}
          onClick={() => setViewMode('criteria')}
        >
          <Target size={18} />
          Evaluation Criteria
        </button>
      </div>

      {/* Upload View */}
      {viewMode === 'upload' && (
        <div className={styles.uploadView}>
          {/* Left Section - Upload & Settings */}
          <div className={styles.uploadSection}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>Add CVs</h3>
                <p>Upload new files or add from candidates you've already worked with.</p>
              </div>

              {/* Mode Selector */}
              <div className={styles.modeSelector}>
                <button
                  className={uploadMode === 'new' ? styles.modeBtnActive : styles.modeBtn}
                  onClick={() => setUploadMode('new')}
                >
                  Upload new
                </button>
                <button
                  className={uploadMode === 'existing' ? styles.modeBtnActive : styles.modeBtn}
                  onClick={() => setUploadMode('existing')}
                >
                  Use existing
                </button>
              </div>

              {/* Upload Area */}
              {uploadMode === 'new' && (
                <div
                  className={`${styles.uploadArea} ${dragActive ? styles.uploadAreaActive : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload size={48} className={styles.uploadIcon} />
                  <p className={styles.uploadText}>
                    Drag & drop or click to upload
                  </p>
                  <p className={styles.uploadHint}>
                    PDF, DOCX · 10 MB limit remaining
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileInput}
                    className={styles.fileInput}
                    id="cv-upload"
                  />
                  <label htmlFor="cv-upload" className={styles.uploadBtn}>
                    Choose File
                  </label>
                </div>
              )}

              {uploadMode === 'existing' && (
                <div className={styles.existingCandidates}>
                  <p className={styles.comingSoon}>
                    Select from existing candidates (Coming soon)
                  </p>
                </div>
              )}

              {/* Uploaded File Display */}
              {uploadedFile && (
                <div className={styles.uploadedFile}>
                  <FileText size={20} className={styles.fileIcon} />
                  <div className={styles.fileInfo}>
                    <p className={styles.fileName}>{uploadedFile.name}</p>
                    <p className={styles.fileSize}>
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    className={styles.removeFileBtn}
                    onClick={() => setUploadedFile(null)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Settings Card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>Evaluation Settings</h3>
              </div>

              <div className={styles.formGroup}>
                <label>Auto-Consider CVs</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input type="radio" name="autoConsider" defaultChecked />
                    <span>Select CV Criteria</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input type="radio" name="autoConsider" />
                    <span>Select a Hiring Project</span>
                  </label>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Select CV Criteria</label>
                <select className={styles.select} disabled>
                  <option>Choose criteria set...</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Select a Hiring Project</label>
                <select
                  className={styles.select}
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                  <option value="">Choose project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className={styles.evaluateBtn}
                onClick={handleEvaluate}
                disabled={!uploadedFile || !selectedProjectId || evaluating}
              >
                {evaluating ? (
                  <>
                    <Sparkles size={18} className={styles.spinner} />
                    Evaluating...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Evaluate CV
                  </>
                )}
              </button>
            </div>

            {/* Features */}
            <div className={styles.featuresCard}>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>
                  <Target size={20} />
                </div>
                <div>
                  <h4>Reusable criteria sets</h4>
                  <p>Not once. Reuse across every role.</p>
                </div>
              </div>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>
                  <Zap size={20} />
                </div>
                <div>
                  <h4>Consistent scoring</h4>
                  <p>Same rubric. No human. No bias.</p>
                </div>
              </div>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>
                  <Eye size={20} />
                </div>
                <div>
                  <h4>Shared visibility</h4>
                  <p>Everyone has same access. No domain.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Results */}
          <div className={styles.resultsSection}>
            {!evaluationResult ? (
              <div className={styles.emptyResults}>
                <BarChart3 size={64} className={styles.emptyIcon} />
                <h3>No evaluation yet</h3>
                <p>Upload a CV and select a project to see AI-powered evaluation results here.</p>
              </div>
            ) : (
              <div className={styles.resultsCard}>
                <div className={styles.resultsHeader}>
                  <div>
                    <h2>{evaluationResult.candidateName}</h2>
                    <p className={styles.contactInfo}>
                      {evaluationResult.email} · {evaluationResult.phone}
                    </p>
                  </div>
                  <div className={styles.scoreCircle}>
                    <div className={styles.scoreValue}>{evaluationResult.totalScore}</div>
                    <div className={styles.scoreLabel}>Overall</div>
                  </div>
                </div>

                <div className={styles.scoreBreakdown}>
                  <div className={styles.scoreItem}>
                    <span className={styles.scoreItemLabel}>Skills Match</span>
                    <div className={styles.scoreBar}>
                      <div
                        className={styles.scoreBarFill}
                        style={{ width: `${evaluationResult.skillsMatch}%` }}
                      ></div>
                    </div>
                    <span className={styles.scoreItemValue}>{evaluationResult.skillsMatch}%</span>
                  </div>
                  <div className={styles.scoreItem}>
                    <span className={styles.scoreItemLabel}>Experience</span>
                    <div className={styles.scoreBar}>
                      <div
                        className={styles.scoreBarFill}
                        style={{ width: `${evaluationResult.experienceScore}%` }}
                      ></div>
                    </div>
                    <span className={styles.scoreItemValue}>{evaluationResult.experienceScore}%</span>
                  </div>
                  <div className={styles.scoreItem}>
                    <span className={styles.scoreItemLabel}>Education</span>
                    <div className={styles.scoreBar}>
                      <div
                        className={styles.scoreBarFill}
                        style={{ width: `${evaluationResult.educationScore}%` }}
                      ></div>
                    </div>
                    <span className={styles.scoreItemValue}>{evaluationResult.educationScore}%</span>
                  </div>
                </div>

                <div className={styles.recommendation}>
                  <CheckCircle size={20} className={styles.recommendIcon} />
                  <span className={styles.recommendText}>{evaluationResult.recommendation}</span>
                </div>

                <div className={styles.insights}>
                  <div className={styles.insightSection}>
                    <h4>
                      <CheckCircle size={18} className={styles.strengthIcon} />
                      Key Strengths
                    </h4>
                    <ul>
                      {evaluationResult.strengths.map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className={styles.insightSection}>
                    <h4>
                      <AlertCircle size={18} className={styles.concernIcon} />
                      Potential Concerns
                    </h4>
                    <ul>
                      {evaluationResult.concerns.map((c: string, i: number) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className={styles.resultsActions}>
                  <button className={styles.btnSecondary}>
                    <Eye size={16} />
                    View Full Report
                  </button>
                  <button className={styles.btnPrimary}>
                    <Plus size={16} />
                    Add to Project
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Criteria Management View */}
      {viewMode === 'criteria' && (
        <div className={styles.criteriaView}>
          <div className={styles.criteriaHeader}>
            <div className={styles.criteriaFilters}>
              <button
                className={criteriaFilter === 'Active' ? styles.filterBtnActive : styles.filterBtn}
                onClick={() => setCriteriaFilter('Active')}
              >
                Active ({criteriaList.filter(c => c.status === 'Active').length})
              </button>
              <button
                className={criteriaFilter === 'Inactive' ? styles.filterBtnActive : styles.filterBtn}
                onClick={() => setCriteriaFilter('Inactive')}
              >
                Inactive
              </button>
              <button
                className={criteriaFilter === 'Archived' ? styles.filterBtnActive : styles.filterBtn}
                onClick={() => setCriteriaFilter('Archived')}
              >
                Archived
              </button>
              <button
                className={criteriaFilter === 'Draft' ? styles.filterBtnActive : styles.filterBtn}
                onClick={() => setCriteriaFilter('Draft')}
              >
                Draft
              </button>
            </div>

            <button className={styles.newCriteriaBtn}>
              <Plus size={18} />
              New CV Evaluation Criteria
            </button>
          </div>

          <div className={styles.criteriaGrid}>
            {filteredCriteria.length === 0 ? (
              <div className={styles.emptyCriteria}>
                <Target size={64} className={styles.emptyIcon} />
                <h3>No {criteriaFilter.toLowerCase()} criteria</h3>
                <p>Create your first evaluation criteria set to get started.</p>
                <button className={styles.createFirstBtn}>
                  <Plus size={18} />
                  Create First Criteria
                </button>
              </div>
            ) : (
              filteredCriteria.map((criteria) => (
                <div key={criteria.id} className={styles.criteriaCard}>
                  <div className={styles.criteriaCardHeader}>
                    <h3>{criteria.name}</h3>
                    <div className={styles.criteriaActions}>
                      <button className={styles.iconBtn} title="Duplicate">
                        <Copy size={16} />
                      </button>
                      <button className={styles.iconBtn} title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button className={styles.iconBtn} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <p className={styles.criteriaDescription}>{criteria.description}</p>

                  <div className={styles.criteriaStats}>
                    <div className={styles.criteriaStat}>
                      <span className={styles.statValue}>{criteria.criteriaCount}</span>
                      <span className={styles.statLabel}>Criteria</span>
                    </div>
                    <div className={styles.criteriaStat}>
                      <span className={styles.statValue}>{criteria.projectsUsed}</span>
                      <span className={styles.statLabel}>Projects</span>
                    </div>
                  </div>

                  <div className={styles.criteriaFooter}>
                    <span className={`${styles.statusBadge} ${styles[`status${criteria.status}`]}`}>
                      {criteria.status}
                    </span>
                    <span className={styles.criteriaDate}>
                      <Clock size={14} />
                      Created {new Date(criteria.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <button className={styles.evaluateCriteriaBtn}>
                    <Sparkles size={16} />
                    Evaluate CV
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
