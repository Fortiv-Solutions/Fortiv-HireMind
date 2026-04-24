import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './CVEvaluator.module.css';
import { 
  Upload, 
  FileText, 
  CheckCircle2 as CheckCircle, 
  AlertCircle, 
  Sparkles, 
  BarChart3, 
  Settings as Target, 
  Search as Eye, 
  Trash2, 
  ClipboardCheck as Zap, 
  ExternalLink, 
  Layers as Files, 
  XCircle, 
  RotateCcw,
  CheckCircle2,
  Users
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import {
  fetchCriteriaWithStats,
  evaluateCv,
  fetchExistingCandidates,
  evaluateExistingCandidate,
  bulkUploadCVs,
} from '../../services/cvEvaluation';
import type { CriteriaWithStats, CvEvaluation } from '../../types/database';
import type { WebhookResponseData, BulkFileResult } from '../../services/cvEvaluation';

type ViewMode = 'upload' | 'bulk';

const ACCEPTED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ACCEPTED_EXT = ['.pdf', '.doc', '.docx'];
const MAX_BULK_MB = 10;
const MAX_BULK_FILES = 20;

function validateBulkFile(file: File): string | null {
  if (!ACCEPTED_MIME.includes(file.type) && !ACCEPTED_EXT.some((e) => file.name.toLowerCase().endsWith(e)))
    return 'Unsupported format. Use PDF, DOC, or DOCX.';
  if (file.size > MAX_BULK_MB * 1024 * 1024) return `Exceeds ${MAX_BULK_MB}MB limit.`;
  return null;
}

interface EvalResult {
  evaluation: CvEvaluation;
  webhookData: WebhookResponseData;
}

export default function CVEvaluator() {
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const { projects, loadProjects } = useStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedCriteriaId, setSelectedCriteriaId] = useState<string>('');
  const [uploadMode, setUploadMode] = useState<'new' | 'existing'>('new');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Criteria list (for dropdowns)
  const [criteriaList, setCriteriaList] = useState<CriteriaWithStats[]>([]);

  // Existing candidates
  const [existingCandidates, setExistingCandidates] = useState<Array<{ id: string; full_name: string; email: string; phone: string | null; location: string | null }>>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Auto-consider mode
  const [autoConsiderMode, setAutoConsiderMode] = useState<'criteria' | 'project'>('project');

  // ── Bulk upload state ──
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkFileErrors, setBulkFileErrors] = useState<Record<string, string>>({});
  const [bulkResults, setBulkResults] = useState<BulkFileResult[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkDone, setBulkDone] = useState(false);
  const [bulkGlobalError, setBulkGlobalError] = useState<string | null>(null);
  const [bulkIsDragging, setBulkIsDragging] = useState(false);
  const [bulkProjectId, setBulkProjectId] = useState<string>('');
  const [bulkCriteriaId, setBulkCriteriaId] = useState<string>('');
  const bulkInputRef = useRef<HTMLInputElement>(null);

  const addBulkFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    const errors: Record<string, string> = {};
    const valid: File[] = [];
    for (const f of arr) {
      const err = validateBulkFile(f);
      if (err) errors[f.name] = err;
      else valid.push(f);
    }
    setBulkFiles((prev) => {
      const combined = [...prev, ...valid];
      if (combined.length > MAX_BULK_FILES) {
        setBulkGlobalError(`Maximum ${MAX_BULK_FILES} files allowed at once.`);
        return combined.slice(0, MAX_BULK_FILES);
      }
      setBulkGlobalError(null);
      return combined;
    });
    if (Object.keys(errors).length) setBulkFileErrors((prev) => ({ ...prev, ...errors }));
  }, []);

  const handleBulkUpload = async () => {
    if (!bulkFiles.length) return;
    if (!bulkProjectId) { setBulkGlobalError('Please select a hiring project first.'); return; }
    setBulkRunning(true); setBulkGlobalError(null);
    setBulkResults(bulkFiles.map((f) => ({ file: f, status: 'pending' })));
    try {
      await bulkUploadCVs(bulkFiles, bulkProjectId, bulkCriteriaId || undefined, (updated) => {
        setBulkResults([...updated]);
      });
    } catch (err: any) {
      setBulkGlobalError(err.message || 'An unexpected error occurred.');
    } finally {
      setBulkRunning(false); setBulkDone(true);
    }
  };

  const handleBulkReset = () => {
    setBulkFiles([]); setBulkFileErrors({}); setBulkResults([]);
    setBulkDone(false); setBulkRunning(false); setBulkGlobalError(null);
  };

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
    try {
      const data = await fetchCriteriaWithStats();
      setCriteriaList(data);
    } catch (err) {
      console.error('Error loading criteria:', err);
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
      let result: EvalResult;

      if (uploadMode === 'new' && uploadedFile) {
        result = await evaluateCv(
          uploadedFile,
          selectedProjectId,
          autoConsiderMode === 'criteria' ? selectedCriteriaId : undefined
        );
      } else if (uploadMode === 'existing' && selectedCandidateId) {
        const evaluation = await evaluateExistingCandidate(
          selectedCandidateId,
          selectedProjectId,
          autoConsiderMode === 'criteria' ? selectedCriteriaId : undefined
        );
        // evaluateExistingCandidate returns CvEvaluation directly — wrap it
        result = {
          evaluation,
          webhookData: {
            candidate_id: evaluation.candidate_id ?? '',
            cv_evaluation_id: evaluation.id,
            job_post_id: evaluation.job_post_id ?? '',
            job_title: '',
            original_filename: '',
            cv_file_url: evaluation.cv_file_url ?? '',
            total_score: evaluation.total_score,
            status: evaluation.status,
            shortlisted: evaluation.shortlisted,
            processing_status: 'completed',
            timestamp: evaluation.created_at,
          },
        };
      } else {
        throw new Error('Invalid evaluation mode');
      }

      setEvaluationResult(result);
      setUploadedFile(null);
      setSelectedCandidateId('');
    } catch (err: any) {
      console.error('Error evaluating CV:', err);
      setError(err.message || 'Failed to evaluate CV. Please try again.');
    } finally {
      setEvaluating(false);
    }
  };


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

    if (strengths.length === 0) strengths.push('Candidate profile available for review');
    if (concerns.length === 0) concerns.push('No major concerns identified');

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
          className={viewMode === 'bulk' ? styles.tabActive : styles.tab}
          onClick={() => setViewMode('bulk')}
        >
          <Files size={18} />
          Bulk Upload
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
                    Waiting for AI analysis...
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
                  <Users size={20} />
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
            {evaluating ? (
              <div className={styles.emptyResults}>
                <Sparkles size={64} className={`${styles.emptyIcon} ${styles.spinner}`} />
                <h3>Analysing CV...</h3>
                <p>CV sent to AI. Waiting for n8n to process and save the evaluation — checking every few seconds.</p>
              </div>
            ) : !evaluationResult ? (
              <div className={styles.emptyResults}>
                <BarChart3 size={64} className={styles.emptyIcon} />
                <h3>No evaluation yet</h3>
                <p>Upload a CV and select a project to see AI-powered evaluation results here.</p>
              </div>
            ) : (
              <div className={styles.resultsCard}>

                {/* ── Candidate Header ── */}
                <div className={styles.candidateHeader}>
                  <div className={styles.candidateAvatar}>
                    {(evaluationResult.evaluation.parsed_name || evaluationResult.evaluation.candidate?.full_name || 'C')[0].toUpperCase()}
                  </div>
                  <div className={styles.candidateMeta}>
                    <h2 className={styles.candidateName}>
                      {evaluationResult.evaluation.parsed_name || evaluationResult.evaluation.candidate?.full_name || 'Candidate'}
                    </h2>
                    <div className={styles.candidateContact}>
                      {(evaluationResult.evaluation.parsed_email || evaluationResult.evaluation.candidate?.email) && (
                        <span>{evaluationResult.evaluation.parsed_email || evaluationResult.evaluation.candidate?.email}</span>
                      )}
                      {(evaluationResult.evaluation.parsed_phone || evaluationResult.evaluation.candidate?.phone) && (
                        <span>{evaluationResult.evaluation.parsed_phone || evaluationResult.evaluation.candidate?.phone}</span>
                      )}
                      {(evaluationResult.evaluation.parsed_location || evaluationResult.evaluation.candidate?.location) && (
                        <span>📍 {evaluationResult.evaluation.parsed_location || evaluationResult.evaluation.candidate?.location}</span>
                      )}
                    </div>
                  </div>
                  <span className={`${styles.statusBadge} ${evaluationResult.evaluation.shortlisted ? styles.statusShortlisted : styles.statusRejected}`}>
                    {evaluationResult.evaluation.status}
                  </span>
                </div>

                {/* ── Total Score ── */}
                <div className={styles.totalScoreRow}>
                  <div className={styles.totalScoreCircle}>
                    <svg viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="var(--color-bg-base)" strokeWidth="7" />
                      <circle cx="40" cy="40" r="34" fill="none"
                        stroke="url(#scoreGrad)" strokeWidth="7" strokeLinecap="round"
                        strokeDasharray={`${evaluationResult.evaluation.total_score * 2.136} 213.6`}
                        transform="rotate(-90 40 40)"
                      />
                      <defs>
                        <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="var(--color-brand-purple)" />
                          <stop offset="100%" stopColor="var(--color-brand-indigo)" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className={styles.totalScoreInner}>
                      <span className={styles.totalScoreNum}>{evaluationResult.evaluation.total_score}</span>
                      <span className={styles.totalScorePct}>%</span>
                    </div>
                  </div>
                  <div className={styles.totalScoreInfo}>
                    <p className={styles.totalScoreLabel}>Total Score</p>
                    <p className={styles.totalScoreMatch}>{getRecommendation(evaluationResult.evaluation.total_score)}</p>
                  </div>
                </div>

                {/* ── Score Breakdown ── */}
                <div className={styles.scoreBreakdown}>
                  {[
                    { label: 'Skills Match', value: evaluationResult.evaluation.skills_match_score },
                    { label: 'Experience',   value: evaluationResult.evaluation.experience_score },
                    { label: 'Education',    value: evaluationResult.evaluation.education_score },
                  ].map(({ label, value }) => (
                    <div key={label} className={styles.scoreItem}>
                      <span className={styles.scoreItemLabel}>{label}</span>
                      <div className={styles.scoreBar}>
                        <div className={styles.scoreBarFill} style={{ width: `${value}%` }} />
                      </div>
                      <span className={styles.scoreItemValue}>{value}%</span>
                    </div>
                  ))}
                </div>

                {/* ── AI Summary ── */}
                {evaluationResult.evaluation.parsed_summary && (
                  <div className={styles.summaryBox}>
                    <div className={styles.summaryLabel}><Sparkles size={13} /> AI Summary</div>
                    <p>{evaluationResult.evaluation.parsed_summary}</p>
                  </div>
                )}

                {/* ── Skills ── */}
                {evaluationResult.evaluation.parsed_skills && evaluationResult.evaluation.parsed_skills.length > 0 && (
                  <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>Skills</h4>
                    <div className={styles.skillTags}>
                      {evaluationResult.evaluation.parsed_skills.map((skill, i) => (
                        <span key={i} className={styles.skillTag}>{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Key Details ── */}
                <div className={styles.detailsGrid}>
                  {evaluationResult.evaluation.parsed_education && (
                    <div className={styles.detailCard}>
                      <span className={styles.detailLabel}>Education</span>
                      <span className={styles.detailValue}>{evaluationResult.evaluation.parsed_education}</span>
                    </div>
                  )}
                  {evaluationResult.evaluation.parsed_experience_years != null && (
                    <div className={styles.detailCard}>
                      <span className={styles.detailLabel}>Experience</span>
                      <span className={styles.detailValue}>{evaluationResult.evaluation.parsed_experience_years} years</span>
                    </div>
                  )}
                  {evaluationResult.evaluation.parsed_companies && evaluationResult.evaluation.parsed_companies.length > 0 && (
                    <div className={styles.detailCard}>
                      <span className={styles.detailLabel}>Companies</span>
                      <span className={styles.detailValue}>{evaluationResult.evaluation.parsed_companies.join(', ')}</span>
                    </div>
                  )}
                  {evaluationResult.evaluation.parsed_projects && evaluationResult.evaluation.parsed_projects.length > 0 && (
                    <div className={styles.detailCard}>
                      <span className={styles.detailLabel}>Projects</span>
                      <span className={styles.detailValue}>{evaluationResult.evaluation.parsed_projects.join(', ')}</span>
                    </div>
                  )}
                  {evaluationResult.evaluation.additional_score > 0 && (
                    <div className={styles.detailCard}>
                      <span className={styles.detailLabel}>Additional Score</span>
                      <span className={styles.detailValue}>{evaluationResult.evaluation.additional_score}%</span>
                    </div>
                  )}
                </div>

                {/* ── Shortlist / Reject Reason ── */}
                {evaluationResult.evaluation.shortlist_reason && (
                  <div className={styles.reasonBox} data-type="shortlist">
                    <CheckCircle size={14} />
                    <span>{evaluationResult.evaluation.shortlist_reason}</span>
                  </div>
                )}
                {evaluationResult.evaluation.reject_reason && (
                  <div className={styles.reasonBox} data-type="reject">
                    <AlertCircle size={14} />
                    <span>{evaluationResult.evaluation.reject_reason}</span>
                  </div>
                )}

                {/* ── Strengths & Concerns ── */}
                <div className={styles.insights}>
                  <div className={styles.insightSection}>
                    <h4><CheckCircle size={16} className={styles.strengthIcon} /> Key Strengths</h4>
                    <ul>{getInsights(evaluationResult.evaluation).strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                  <div className={styles.insightSection}>
                    <h4><AlertCircle size={16} className={styles.concernIcon} /> Potential Concerns</h4>
                    <ul>{getInsights(evaluationResult.evaluation).concerns.map((c, i) => <li key={i}>{c}</li>)}</ul>
                  </div>
                </div>

                {/* ── Actions ── */}
                <div className={styles.resultsActions}>
                  {evaluationResult.webhookData.cv_file_url && (
                    <a href={evaluationResult.webhookData.cv_file_url} target="_blank" rel="noopener noreferrer" className={styles.btnSecondary}>
                      <ExternalLink size={16} /> View CV File
                    </a>
                  )}
                  {evaluationResult.evaluation.hiring_project_id && (
                    <button className={styles.btnPrimary} onClick={() => { window.location.href = `/project/${evaluationResult.evaluation.hiring_project_id}`; }}>
                      <Eye size={16} /> View in Project
                    </button>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Upload View */}
      {viewMode === 'bulk' && (
        <div className={styles.uploadView}>
          {/* Left: settings + drop zone */}
          <div className={styles.uploadSection}>
            {/* Project / Criteria settings */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>Bulk Settings</h3>
                <p>Select a project before uploading. Criteria is optional.</p>
              </div>
              <div className={styles.formGroup}>
                <label>Hiring Project <span style={{ color: '#DC2626' }}>*</span></label>
                <select className={styles.select} value={bulkProjectId} onChange={(e) => setBulkProjectId(e.target.value)}>
                  <option value="">Choose project…</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Evaluation Criteria (optional)</label>
                <select className={styles.select} value={bulkCriteriaId} onChange={(e) => setBulkCriteriaId(e.target.value)}>
                  <option value="">None</option>
                  {criteriaList.filter((c) => c.status === 'Active').map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Drop zone — hidden while running */}
            {!bulkRunning && !bulkDone && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3>Upload CVs</h3>
                  <p>PDF, DOC, DOCX · Max {MAX_BULK_MB}MB per file · Up to {MAX_BULK_FILES} files</p>
                </div>

                <div
                  className={`${styles.uploadArea} ${bulkIsDragging ? styles.uploadAreaActive : ''}`}
                  onDragEnter={(e) => { e.preventDefault(); setBulkIsDragging(true); }}
                  onDragOver={(e) => { e.preventDefault(); setBulkIsDragging(true); }}
                  onDragLeave={() => setBulkIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setBulkIsDragging(false); addBulkFiles(e.dataTransfer.files); }}
                  onClick={() => bulkInputRef.current?.click()}
                >
                  <input ref={bulkInputRef} type="file" multiple accept=".pdf,.doc,.docx"
                    onChange={(e) => { if (e.target.files) addBulkFiles(e.target.files); e.target.value = ''; }}
                    className={styles.fileInput}
                  />
                  <Upload size={40} className={styles.uploadIcon} />
                  <p className={styles.uploadText}>Drag & drop or click to browse</p>
                  <p className={styles.uploadHint}>Select multiple files at once</p>
                </div>

                {bulkGlobalError && (
                  <div className={styles.bulkInlineError}>
                    <AlertCircle size={14} /> {bulkGlobalError}
                  </div>
                )}

                {bulkFiles.length > 0 && (
                  <div className={styles.bulkFileList}>
                    <div className={styles.bulkFileListHeader}>
                      <span>{bulkFiles.length} file{bulkFiles.length !== 1 ? 's' : ''} selected</span>
                      <button className={styles.bulkClearBtn} onClick={() => { setBulkFiles([]); setBulkFileErrors({}); setBulkGlobalError(null); }}>Clear all</button>
                    </div>
                    {bulkFiles.map((f, i) => (
                      <div key={`${f.name}-${i}`} className={`${styles.bulkFileRow} ${bulkFileErrors[f.name] ? styles.bulkFileRowError : ''}`}>
                        <FileText size={14} style={{ color: 'var(--color-brand-purple)', flexShrink: 0 }} />
                        <div className={styles.bulkFileInfo}>
                          <span className={styles.bulkFileName}>{f.name}</span>
                          {bulkFileErrors[f.name]
                            ? <span className={styles.bulkFileErrText}>{bulkFileErrors[f.name]}</span>
                            : <span className={styles.bulkFileSize}>{(f.size / 1024).toFixed(0)} KB</span>}
                        </div>
                        <button className={styles.removeFileBtn} onClick={() => {
                          setBulkFiles((prev) => { const u = [...prev]; u.splice(i, 1); return u; });
                          setBulkFileErrors((e) => { const c = { ...e }; delete c[f.name]; return c; });
                        }}><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  className={styles.evaluateBtn}
                  onClick={handleBulkUpload}
                  disabled={bulkFiles.length === 0 || !bulkProjectId}
                >
                  <Files size={18} />
                  Upload & Evaluate {bulkFiles.length > 0 ? `${bulkFiles.length} CV${bulkFiles.length !== 1 ? 's' : ''}` : 'CVs'}
                </button>
              </div>
            )}

            {/* Features */}
            <div className={styles.featuresCard}>
              <div className={styles.feature}>
                <div className={styles.featureIcon}><Files size={20} /></div>
                <div><h4>Up to {MAX_BULK_FILES} CVs at once</h4><p>Batch process your entire applicant pool.</p></div>
              </div>
              <div className={styles.feature}>
                <div className={styles.featureIcon}><Zap size={20} /></div>
                <div><h4>Real-time progress</h4><p>Watch each CV get evaluated as it processes.</p></div>
              </div>
              <div className={styles.feature}>
                <div className={styles.featureIcon}><Target size={20} /></div>
                <div><h4>Auto-added to pipeline</h4><p>All candidates land in My Candidates automatically.</p></div>
              </div>
            </div>
          </div>

          {/* Right: results */}
          <div className={styles.resultsSection}>
            {!bulkRunning && !bulkDone ? (
              <div className={styles.emptyResults}>
                <Files size={64} className={styles.emptyIcon} />
                <h3>No bulk upload yet</h3>
                <p>Select a project, add your CV files, and click Upload & Evaluate to get started.</p>
              </div>
            ) : (
              <div className={styles.resultsCard}>
                {/* Summary */}
                {bulkDone && (() => {
                  const ok  = bulkResults.filter((r) => r.status === 'success').length;
                  const err = bulkResults.filter((r) => r.status === 'error').length;
                  return (
                    <div className={`${styles.bulkSummaryBanner} ${err > 0 && ok === 0 ? styles.bulkSummaryErr : err > 0 ? styles.bulkSummaryPartial : styles.bulkSummaryOk}`}>
                      {err === 0
                        ? <><CheckCircle size={16} /> All {ok} CV{ok !== 1 ? 's' : ''} evaluated successfully</>
                        : ok === 0
                        ? <><XCircle size={16} /> All {err} upload{err !== 1 ? 's' : ''} failed</>
                        : <><AlertCircle size={16} /> {ok} succeeded · {err} failed</>}
                    </div>
                  );
                })()}

                {bulkRunning && (
                  <div className={styles.bulkProgressInfo}>
                    <Sparkles size={14} className={styles.spinner} />
                    <span>Processing {bulkResults.findIndex((r) => r.status === 'processing') + 1} of {bulkResults.length}…</span>
                  </div>
                )}

                <div className={styles.bulkResultGrid}>
                  {bulkResults.map((r, i) => (
                    <div key={i} className={`${styles.bulkResultRow} ${styles[`bulkResult_${r.status}`]}`}>
                      <div className={styles.bulkResultIcon}>
                        {r.status === 'pending'    && <div className={styles.pendingDot} />}
                        {r.status === 'processing' && <Sparkles size={15} className={styles.spinner} />}
                        {r.status === 'success'    && <CheckCircle size={15} />}
                        {r.status === 'error'      && <XCircle size={15} />}
                      </div>
                      <div className={styles.bulkResultInfo}>
                        <span className={styles.bulkResultName}>{r.candidateName ?? r.file.name}</span>
                        {r.status === 'success' && r.totalScore !== undefined && (
                          <span className={styles.bulkResultScore}>Score: {Math.round(r.totalScore)}%</span>
                        )}
                        {r.status === 'error'      && <span className={styles.bulkResultError}>{r.error}</span>}
                        {r.status === 'pending'    && <span className={styles.bulkResultMeta}>Waiting…</span>}
                        {r.status === 'processing' && <span className={styles.bulkResultMeta}>Evaluating…</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {bulkDone && (
                  <div style={{ paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                    <button className={styles.btnSecondary} onClick={handleBulkReset}>
                      <RotateCcw size={15} /> Upload More CVs
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
