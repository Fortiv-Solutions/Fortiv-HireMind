import React, { useState, useEffect } from 'react';
import styles from './CVEvaluator.module.css';
import { Upload, FileText, CheckCircle, AlertCircle, Sparkles, Plus, Edit2, Trash2, Copy, Eye, BarChart3, Target, Clock, Zap } from 'lucide-react';
import { useStore } from '../../store/useStore';
import {
  fetchCriteriaWithStats,
  evaluateCv,
  fetchExistingCandidates,
  evaluateExistingCandidate,
  deleteCriteriaSet,
  duplicateCriteriaSet,
  updateCriteriaSet,
  createCriteriaSetWithItems,
  fetchCriteriaWithItems,
  updateCriteriaSetWithItems,
} from '../../services/cvEvaluation';
import type { CriteriaWithStats, CvEvaluation, Candidate } from '../../types/database';
import CreateCriteriaModal from './CreateCriteriaModal';
import EditCriteriaModal from './EditCriteriaModal';
import CriteriaDetailModal from './CriteriaDetailModal';

type ViewMode = 'upload' | 'criteria';

export default function CVEvaluator() {
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const { projects, loadProjects } = useStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedCriteriaId, setSelectedCriteriaId] = useState<string>('');
  const [uploadMode, setUploadMode] = useState<'new' | 'existing'>('new');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<CvEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Criteria management
  const [criteriaList, setCriteriaList] = useState<CriteriaWithStats[]>([]);
  const [criteriaFilter, setCriteriaFilter] = useState<'Active' | 'Inactive' | 'Archived' | 'Draft'>('Active');
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCriteriaId, setEditingCriteriaId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailCriteriaId, setDetailCriteriaId] = useState<string | null>(null);

  // Existing candidates
  const [existingCandidates, setExistingCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Auto-consider mode
  const [autoConsiderMode, setAutoConsiderMode] = useState<'criteria' | 'project'>('project');

  useEffect(() => {
    loadProjects();
    loadCriteria();
  }, [loadProjects]);

  useEffect(() => {
    if (uploadMode === 'existing') {
      loadExistingCandidates();
    }
  }, [uploadMode]);

  const loadCriteria = async () => {
    setLoadingCriteria(true);
    try {
      const data = await fetchCriteriaWithStats();
      setCriteriaList(data);
    } catch (err) {
      console.error('Error loading criteria:', err);
      setError('Failed to load evaluation criteria');
    } finally {
      setLoadingCriteria(false);
    }
  };

  const loadExistingCandidates = async () => {
    setLoadingCandidates(true);
    try {
      const data = await fetchExistingCandidates();
      setExistingCandidates(data);
    } catch (err) {
      console.error('Error loading candidates:', err);
      setError('Failed to load existing candidates');
    } finally {
      setLoadingCandidates(false);
    }
  };

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
    if (uploadMode === 'new' && !uploadedFile) {
      setError('Please upload a CV file');
      return;
    }
    if (uploadMode === 'existing' && !selectedCandidateId) {
      setError('Please select a candidate');
      return;
    }
    if (!selectedProjectId) {
      setError('Please select a hiring project');
      return;
    }

    setEvaluating(true);
    setError(null);

    try {
      let evaluation: CvEvaluation;

      if (uploadMode === 'new' && uploadedFile) {
        // Evaluate new CV upload
        evaluation = await evaluateCv(
          uploadedFile,
          selectedProjectId,
          autoConsiderMode === 'criteria' ? selectedCriteriaId : undefined
        );
      } else if (uploadMode === 'existing' && selectedCandidateId) {
        // Evaluate existing candidate
        evaluation = await evaluateExistingCandidate(
          selectedCandidateId,
          selectedProjectId,
          autoConsiderMode === 'criteria' ? selectedCriteriaId : undefined
        );
      } else {
        throw new Error('Invalid evaluation mode');
      }

      setEvaluationResult(evaluation);
      setUploadedFile(null);
      setSelectedCandidateId('');
    } catch (err: any) {
      console.error('Error evaluating CV:', err);
      setError(err.message || 'Failed to evaluate CV. Please try again.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleDeleteCriteria = async (id: string) => {
    if (!confirm('Are you sure you want to delete this criteria set?')) return;

    try {
      await deleteCriteriaSet(id);
      await loadCriteria();
    } catch (err) {
      console.error('Error deleting criteria:', err);
      setError('Failed to delete criteria set');
    }
  };

  const handleDuplicateCriteria = async (id: string) => {
    try {
      await duplicateCriteriaSet(id);
      await loadCriteria();
    } catch (err) {
      console.error('Error duplicating criteria:', err);
      setError('Failed to duplicate criteria set');
    }
  };

  const handleArchiveCriteria = async (id: string) => {
    try {
      await updateCriteriaSet(id, { status: 'Archived' });
      await loadCriteria();
    } catch (err) {
      console.error('Error archiving criteria:', err);
      setError('Failed to archive criteria set');
    }
  };

  const handleCreateCriteria = async (data: {
    name: string;
    description: string;
    status: 'Active' | 'Inactive' | 'Draft' | 'Archived';
    items: Array<{
      criterion_name: string;
      criterion_description: string;
      weight: number;
      criterion_type: 'skill' | 'experience' | 'education' | 'custom';
      expected_value: string;
    }>;
  }) => {
    try {
      await createCriteriaSetWithItems(
        {
          name: data.name,
          description: data.description,
          status: data.status,
        },
        data.items
      );
      await loadCriteria();
      setShowCreateModal(false);
    } catch (err: any) {
      console.error('Error creating criteria:', err);
      throw new Error(err.message || 'Failed to create criteria set');
    }
  };

  const handleEditCriteria = (id: string) => {
    setEditingCriteriaId(id);
    setShowEditModal(true);
  };

  const handleUpdateCriteria = async (
    criteriaId: string,
    data: {
      name: string;
      description: string;
      status: 'Active' | 'Inactive' | 'Draft' | 'Archived';
      itemsToAdd: Array<{
        criterion_name: string;
        criterion_description: string;
        weight: number;
        criterion_type: 'skill' | 'experience' | 'education' | 'custom';
        expected_value: string;
      }>;
      itemsToUpdate: Array<{
        id: string;
        criterion_name?: string;
        criterion_description?: string;
        weight?: number;
        criterion_type?: 'skill' | 'experience' | 'education' | 'custom';
        expected_value?: string;
      }>;
      itemsToDelete: string[];
    }
  ) => {
    try {
      await updateCriteriaSetWithItems(
        criteriaId,
        {
          name: data.name,
          description: data.description,
          status: data.status,
        },
        data.itemsToAdd,
        data.itemsToUpdate,
        data.itemsToDelete
      );
      await loadCriteria();
      setShowEditModal(false);
      setEditingCriteriaId(null);
    } catch (err: any) {
      console.error('Error updating criteria:', err);
      throw new Error(err.message || 'Failed to update criteria set');
    }
  };

  const handleLoadCriteriaForEdit = async (id: string) => {
    return await fetchCriteriaWithItems(id);
  };

  const handleViewCriteriaDetail = (id: string) => {
    setDetailCriteriaId(id);
    setShowDetailModal(true);
  };

  const filteredCriteria = criteriaList.filter(c => c.status === criteriaFilter);

  // Generate recommendation text based on score
  const getRecommendation = (score: number): string => {
    if (score >= 80) return 'Strong Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Moderate Match';
    return 'Weak Match';
  };

  // Generate strengths and concerns from evaluation data
  const getInsights = (evaluation: CvEvaluation) => {
    const strengths: string[] = [];
    const concerns: string[] = [];

    if (evaluation.skills_match_score >= 70) {
      strengths.push(`Strong skills match (${evaluation.skills_match_score}%)`);
    } else if (evaluation.skills_match_score < 50) {
      concerns.push(`Limited skills match (${evaluation.skills_match_score}%)`);
    }

    if (evaluation.experience_score >= 70) {
      strengths.push(`${evaluation.parsed_experience_years || 0}+ years of relevant experience`);
    } else if (evaluation.experience_score < 50) {
      concerns.push(`Limited experience (${evaluation.parsed_experience_years || 0} years)`);
    }

    if (evaluation.parsed_skills && evaluation.parsed_skills.length > 5) {
      strengths.push(`Diverse skill set (${evaluation.parsed_skills.length} skills)`);
    }

    if (evaluation.parsed_companies && evaluation.parsed_companies.length > 2) {
      strengths.push(`Experience across ${evaluation.parsed_companies.length} companies`);
    }

    if (evaluation.education_score < 60) {
      concerns.push('Education background needs review');
    }

    // Default messages if none generated
    if (strengths.length === 0) {
      strengths.push('Candidate profile available for review');
    }
    if (concerns.length === 0) {
      concerns.push('No major concerns identified');
    }

    return { strengths, concerns };
  };

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

      {/* Error Display */}
      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className={styles.closeError}>×</button>
        </div>
      )}

      {/* Create Criteria Modal */}
      <CreateCriteriaModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateCriteria}
      />

      {/* Edit Criteria Modal */}
      <EditCriteriaModal
        isOpen={showEditModal}
        criteriaId={editingCriteriaId}
        onClose={() => {
          setShowEditModal(false);
          setEditingCriteriaId(null);
        }}
        onSave={handleUpdateCriteria}
        onLoadCriteria={handleLoadCriteriaForEdit}
      />

      {/* Criteria Detail Modal */}
      <CriteriaDetailModal
        isOpen={showDetailModal}
        criteriaId={detailCriteriaId}
        onClose={() => {
          setShowDetailModal(false);
          setDetailCriteriaId(null);
        }}
        onLoadCriteria={handleLoadCriteriaForEdit}
      />

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
                  {loadingCandidates ? (
                    <p className={styles.loading}>Loading candidates...</p>
                  ) : existingCandidates.length === 0 ? (
                    <p className={styles.comingSoon}>No existing candidates found</p>
                  ) : (
                    <div className={styles.candidatesList}>
                      <label>Select a candidate</label>
                      <select
                        className={styles.select}
                        value={selectedCandidateId}
                        onChange={(e) => setSelectedCandidateId(e.target.value)}
                      >
                        <option value="">Choose candidate...</option>
                        {existingCandidates.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.full_name} ({candidate.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
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
                    <input
                      type="radio"
                      name="autoConsider"
                      checked={autoConsiderMode === 'criteria'}
                      onChange={() => setAutoConsiderMode('criteria')}
                    />
                    <span>Select CV Criteria</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="autoConsider"
                      checked={autoConsiderMode === 'project'}
                      onChange={() => setAutoConsiderMode('project')}
                    />
                    <span>Select a Hiring Project</span>
                  </label>
                </div>
              </div>

              {autoConsiderMode === 'criteria' && (
                <div className={styles.formGroup}>
                  <label>Select CV Criteria</label>
                  <select
                    className={styles.select}
                    value={selectedCriteriaId}
                    onChange={(e) => setSelectedCriteriaId(e.target.value)}
                  >
                    <option value="">Choose criteria set...</option>
                    {criteriaList
                      .filter((c) => c.status === 'Active')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

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
                disabled={
                  evaluating ||
                  !selectedProjectId ||
                  (uploadMode === 'new' && !uploadedFile) ||
                  (uploadMode === 'existing' && !selectedCandidateId)
                }
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
                    <h2>{evaluationResult.parsed_name || evaluationResult.candidate?.full_name}</h2>
                    <p className={styles.contactInfo}>
                      {evaluationResult.parsed_email || evaluationResult.candidate?.email}
                      {(evaluationResult.parsed_phone || evaluationResult.candidate?.phone) && 
                        ` · ${evaluationResult.parsed_phone || evaluationResult.candidate?.phone}`}
                    </p>
                  </div>
                  <div className={styles.scoreCircle}>
                    <div className={styles.scoreValue}>{evaluationResult.total_score}</div>
                    <div className={styles.scoreLabel}>Overall</div>
                  </div>
                </div>

                <div className={styles.scoreBreakdown}>
                  <div className={styles.scoreItem}>
                    <span className={styles.scoreItemLabel}>Skills Match</span>
                    <div className={styles.scoreBar}>
                      <div
                        className={styles.scoreBarFill}
                        style={{ width: `${evaluationResult.skills_match_score}%` }}
                      ></div>
                    </div>
                    <span className={styles.scoreItemValue}>{evaluationResult.skills_match_score}%</span>
                  </div>
                  <div className={styles.scoreItem}>
                    <span className={styles.scoreItemLabel}>Experience</span>
                    <div className={styles.scoreBar}>
                      <div
                        className={styles.scoreBarFill}
                        style={{ width: `${evaluationResult.experience_score}%` }}
                      ></div>
                    </div>
                    <span className={styles.scoreItemValue}>{evaluationResult.experience_score}%</span>
                  </div>
                  <div className={styles.scoreItem}>
                    <span className={styles.scoreItemLabel}>Education</span>
                    <div className={styles.scoreBar}>
                      <div
                        className={styles.scoreBarFill}
                        style={{ width: `${evaluationResult.education_score}%` }}
                      ></div>
                    </div>
                    <span className={styles.scoreItemValue}>{evaluationResult.education_score}%</span>
                  </div>
                </div>

                <div className={styles.recommendation}>
                  <CheckCircle size={20} className={styles.recommendIcon} />
                  <span className={styles.recommendText}>
                    {getRecommendation(evaluationResult.total_score)}
                  </span>
                </div>

                <div className={styles.insights}>
                  <div className={styles.insightSection}>
                    <h4>
                      <CheckCircle size={18} className={styles.strengthIcon} />
                      Key Strengths
                    </h4>
                    <ul>
                      {getInsights(evaluationResult).strengths.map((s: string, i: number) => (
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
                      {getInsights(evaluationResult).concerns.map((c: string, i: number) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className={styles.resultsActions}>
                  {evaluationResult.cv_file_url && (
                    <a
                      href={evaluationResult.cv_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.btnSecondary}
                    >
                      <Eye size={16} />
                      View CV File
                    </a>
                  )}
                  <button
                    className={styles.btnPrimary}
                    onClick={() => {
                      // Navigate to project detail page
                      window.location.href = `/project/${evaluationResult.hiring_project_id}`;
                    }}
                  >
                    <Eye size={16} />
                    View in Project
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
                Inactive ({criteriaList.filter(c => c.status === 'Inactive').length})
              </button>
              <button
                className={criteriaFilter === 'Archived' ? styles.filterBtnActive : styles.filterBtn}
                onClick={() => setCriteriaFilter('Archived')}
              >
                Archived ({criteriaList.filter(c => c.status === 'Archived').length})
              </button>
              <button
                className={criteriaFilter === 'Draft' ? styles.filterBtnActive : styles.filterBtn}
                onClick={() => setCriteriaFilter('Draft')}
              >
                Draft ({criteriaList.filter(c => c.status === 'Draft').length})
              </button>
            </div>

            <button className={styles.newCriteriaBtn} onClick={() => setShowCreateModal(true)}>
              <Plus size={18} />
              New CV Evaluation Criteria
            </button>
          </div>

          {loadingCriteria ? (
            <div className={styles.loading}>Loading criteria...</div>
          ) : (
            <div className={styles.criteriaGrid}>
              {filteredCriteria.length === 0 ? (
                <div className={styles.emptyCriteria}>
                  <Target size={64} className={styles.emptyIcon} />
                  <h3>No {criteriaFilter.toLowerCase()} criteria</h3>
                  <p>Create your first evaluation criteria set to get started.</p>
                  <button className={styles.createFirstBtn} onClick={() => setShowCreateModal(true)}>
                    <Plus size={18} />
                    Create First Criteria
                  </button>
                </div>
              ) : (
                filteredCriteria.map((criteria) => (
                  <div 
                    key={criteria.id} 
                    className={styles.criteriaCard}
                    onClick={() => handleViewCriteriaDetail(criteria.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.criteriaCardHeader}>
                      <h3>{criteria.name}</h3>
                      <div className={styles.criteriaActions}>
                        <button
                          className={styles.iconBtn}
                          title="Duplicate"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateCriteria(criteria.id);
                          }}
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          className={styles.iconBtn}
                          title="Edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCriteria(criteria.id);
                          }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className={styles.iconBtn}
                          title="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCriteria(criteria.id);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <p className={styles.criteriaDescription}>
                      {criteria.description || 'No description'}
                    </p>

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
                        Created {new Date(criteria.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <button
                      className={styles.evaluateCriteriaBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCriteriaId(criteria.id);
                        setAutoConsiderMode('criteria');
                        setViewMode('upload');
                      }}
                    >
                      <Sparkles size={16} />
                      Evaluate CV
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
