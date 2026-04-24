import React, { useState, useRef, useCallback } from 'react';
import styles from './CVEvaluation.module.css';
import {
  Upload, FileText, Loader2, CheckCircle, TrendingUp,
  Target, CheckCheck, AlertTriangle, ExternalLink, Hash,
  Files, Trash2, XCircle, RotateCcw,
} from 'lucide-react';
import { evaluateCv, bulkUploadCVs, type BulkFileResult, type WebhookResponseData } from '../../services/cvEvaluation';
import type { CvEvaluation as CvEvaluationResult } from '../../types/database';
import { useStore } from '../../store/useStore';

interface Props {
  projectId: string;
}

interface EvalResult {
  evaluation: CvEvaluationResult;
  webhookData: WebhookResponseData;
}

type Mode = 'single' | 'bulk';

// ─── Bulk helpers ────────────────────────────────────────────────────────────
const ACCEPTED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ACCEPTED_EXT = ['.pdf', '.doc', '.docx'];
const MAX_MB = 10;
const MAX_FILES = 20;

function validateFile(file: File): string | null {
  if (!ACCEPTED_MIME.includes(file.type) && !ACCEPTED_EXT.some((e) => file.name.toLowerCase().endsWith(e))) {
    return 'Unsupported format. Use PDF, DOC, or DOCX.';
  }
  if (file.size > MAX_MB * 1024 * 1024) return `Exceeds ${MAX_MB}MB limit.`;
  return null;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function CVEvaluation({ projectId }: Props) {
  const { loadProjectDetail } = useStore();
  const [mode, setMode] = useState<Mode>('single');

  // ── Single mode state ──
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Bulk mode state ──
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkFileErrors, setBulkFileErrors] = useState<Record<string, string>>({});
  const [bulkResults, setBulkResults] = useState<BulkFileResult[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkDone, setBulkDone] = useState(false);
  const [bulkGlobalError, setBulkGlobalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  // ── Single mode handlers ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) { setFile(e.target.files[0]); setResult(null); setError(null); }
  };

  const handleEvaluate = async () => {
    if (!file) return;
    setLoading(true); setError(null);
    try {
      const res = await evaluateCv(file, projectId);
      setResult(res);
      await loadProjectDetail(projectId);
    } catch (err: any) {
      setError(err.message || 'Evaluation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => { setFile(null); setResult(null); setError(null); };

  // ── Bulk mode handlers ──
  const addBulkFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    const errors: Record<string, string> = {};
    const valid: File[] = [];
    for (const f of arr) {
      const err = validateFile(f);
      if (err) errors[f.name] = err;
      else valid.push(f);
    }
    setBulkFiles((prev) => {
      const combined = [...prev, ...valid];
      if (combined.length > MAX_FILES) {
        setBulkGlobalError(`Maximum ${MAX_FILES} files allowed at once.`);
        return combined.slice(0, MAX_FILES);
      }
      setBulkGlobalError(null);
      return combined;
    });
    if (Object.keys(errors).length) setBulkFileErrors((prev) => ({ ...prev, ...errors }));
  }, []);

  const handleBulkDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false); addBulkFiles(e.dataTransfer.files);
  }, [addBulkFiles]);

  const handleBulkInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addBulkFiles(e.target.files);
    e.target.value = '';
  };

  const removeBulkFile = (index: number) => {
    setBulkFiles((prev) => {
      const updated = [...prev];
      const removed = updated.splice(index, 1)[0];
      setBulkFileErrors((errs) => { const c = { ...errs }; delete c[removed.name]; return c; });
      return updated;
    });
    if (bulkFiles.length - 1 <= MAX_FILES) setBulkGlobalError(null);
  };

  const handleBulkUpload = async () => {
    if (!bulkFiles.length) return;
    setBulkRunning(true); setBulkGlobalError(null);
    setBulkResults(bulkFiles.map((f) => ({ file: f, status: 'pending' })));
    try {
      const final = await bulkUploadCVs(bulkFiles, projectId, undefined, (updated) => {
        setBulkResults([...updated]);
      });
      if (final.some((r) => r.status === 'success')) await loadProjectDetail(projectId);
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

  const successCount = bulkResults.filter((r) => r.status === 'success').length;
  const errorCount   = bulkResults.filter((r) => r.status === 'error').length;
  const score = result?.webhookData.total_score ?? 0;

  return (
    <div className={styles.container}>
      {/* Header + mode toggle */}
      <div className={styles.header}>
        <div>
          <h2>CV Evaluation</h2>
          <p>Upload resumes to get instant AI-powered evaluation and match scores</p>
        </div>
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeBtn} ${mode === 'single' ? styles.modeBtnActive : ''}`}
            onClick={() => setMode('single')}
          >
            <FileText size={15} /> Single CV
          </button>
          <button
            className={`${styles.modeBtn} ${mode === 'bulk' ? styles.modeBtnActive : ''}`}
            onClick={() => setMode('bulk')}
          >
            <Files size={15} /> Bulk Upload
          </button>
        </div>
      </div>

      {/* ── SINGLE MODE ── */}
      {mode === 'single' && (
        <>
          {!result ? (
            <div className={styles.uploadSection}>
              <div className={styles.uploadCard}>
                <input
                  type="file"
                  id="cv-upload"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className={styles.fileInput}
                />
                <label htmlFor="cv-upload" className={styles.uploadLabel}>
                  <Upload size={48} className={styles.uploadIcon} />
                  <h3>Drop CV here or click to browse</h3>
                  <p>Supports PDF, DOC, DOCX (Max 10MB)</p>
                  {file && (
                    <div className={styles.selectedFile}>
                      <FileText size={20} />
                      <span>{file.name}</span>
                    </div>
                  )}
                </label>

                {error && <p className={styles.errorMsg}>{error}</p>}

                {file && (
                  <button className={styles.evaluateBtn} onClick={handleEvaluate} disabled={loading}>
                    {loading
                      ? <><Loader2 size={20} className={styles.spinner} /> Analyzing Resume...</>
                      : <><TrendingUp size={20} /> Evaluate Resume</>}
                  </button>
                )}
              </div>

              <div className={styles.infoCard}>
                <h3>What we analyze</h3>
                <ul>
                  <li><CheckCircle size={18} /><span>Skills match against job requirements</span></li>
                  <li><CheckCircle size={18} /><span>Years of experience and relevance</span></li>
                  <li><CheckCircle size={18} /><span>Educational background</span></li>
                  <li><CheckCircle size={18} /><span>Previous companies and projects</span></li>
                  <li><CheckCircle size={18} /><span>Overall fit score and recommendations</span></li>
                </ul>
              </div>
            </div>
          ) : (
            <div className={styles.resultSection}>
              <div className={styles.scoreOverview}>
                <div className={styles.mainScore}>
                  <div className={styles.scoreCircle}>
                    <svg viewBox="0 0 100 100" className={styles.scoreRing}>
                      <circle cx="50" cy="50" r="45" className={styles.scoreRingBg} />
                      <circle
                        cx="50" cy="50" r="45"
                        className={styles.scoreRingFill}
                        style={{ strokeDasharray: `${score * 2.827}, 282.7` }}
                      />
                    </svg>
                    <div className={styles.scoreValue}>
                      <span className={styles.scoreNumber}>{score}</span>
                      <span className={styles.scorePercent}>%</span>
                    </div>
                  </div>
                  <div className={styles.scoreLabel}>
                    <h3>{result.webhookData.job_title}</h3>
                    <p className={styles.matchLevel}>
                      {score >= 80
                        ? <><Target size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Strong Match</>
                        : score >= 60
                        ? <><CheckCheck size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Good Match</>
                        : <><AlertTriangle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Weak Match</>}
                    </p>
                    <span className={styles.statusBadge} data-shortlisted={result.webhookData.shortlisted}>
                      {result.webhookData.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.idsCard}>
                <div className={styles.idsHeader}><Hash size={16} /><span>Evaluation IDs</span></div>
                <div className={styles.idsGrid}>
                  <div className={styles.idItem}>
                    <span className={styles.idLabel}>Candidate ID</span>
                    <span className={styles.idValue}>{result.webhookData.candidate_id}</span>
                  </div>
                  <div className={styles.idItem}>
                    <span className={styles.idLabel}>CV Evaluation ID</span>
                    <span className={styles.idValue}>{result.webhookData.cv_evaluation_id}</span>
                  </div>
                  <div className={styles.idItem}>
                    <span className={styles.idLabel}>Job Post ID</span>
                    <span className={styles.idValue}>{result.webhookData.job_post_id}</span>
                  </div>
                  <div className={styles.idItem}>
                    <span className={styles.idLabel}>Hiring Project ID</span>
                    <span className={styles.idValue}>{result.evaluation.hiring_project_id}</span>
                  </div>
                </div>
              </div>

              <div className={styles.fileInfoCard}>
                <FileText size={16} />
                <span className={styles.fileName}>{result.webhookData.original_filename}</span>
                {result.webhookData.cv_file_url && (
                  <a href={result.webhookData.cv_file_url} target="_blank" rel="noopener noreferrer" className={styles.viewFileLink}>
                    View File <ExternalLink size={13} />
                  </a>
                )}
              </div>

              {result.evaluation.candidate && (
                <div className={styles.candidateInfo}>
                  <h3>Candidate Information</h3>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Name</span>
                      <span className={styles.infoValue}>{result.evaluation.candidate.full_name}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Email</span>
                      <span className={styles.infoValue}>{result.evaluation.candidate.email}</span>
                    </div>
                    {result.evaluation.candidate.phone && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Phone</span>
                        <span className={styles.infoValue}>{result.evaluation.candidate.phone}</span>
                      </div>
                    )}
                    {result.evaluation.candidate.location && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Location</span>
                        <span className={styles.infoValue}>{result.evaluation.candidate.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className={styles.resultActions}>
                <button className={styles.resetBtn} onClick={handleReset}>Evaluate Another CV</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── BULK MODE ── */}
      {mode === 'bulk' && (
        <div className={styles.bulkSection}>
          {/* Drop zone — hidden once running */}
          {!bulkRunning && !bulkDone && (
            <div className={styles.bulkUploadCard}>
              <div
                className={`${styles.bulkDropZone} ${isDragging ? styles.bulkDropZoneDragging : ''}`}
                onDrop={handleBulkDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => bulkInputRef.current?.click()}
              >
                <input
                  ref={bulkInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx"
                  onChange={handleBulkInputChange}
                  className={styles.fileInput}
                />
                <Upload size={44} className={styles.uploadIcon} />
                <h3>Drop multiple CVs here or click to browse</h3>
                <p>PDF, DOC, DOCX · Max {MAX_MB}MB per file · Up to {MAX_FILES} files</p>
              </div>

              {bulkGlobalError && (
                <div className={styles.bulkGlobalError}>
                  <AlertTriangle size={15} /> {bulkGlobalError}
                </div>
              )}

              {bulkFiles.length > 0 && (
                <div className={styles.bulkFileList}>
                  <div className={styles.bulkFileListHeader}>
                    <span>{bulkFiles.length} file{bulkFiles.length !== 1 ? 's' : ''} selected</span>
                    <button className={styles.clearAllBtn} onClick={() => { setBulkFiles([]); setBulkFileErrors({}); setBulkGlobalError(null); }}>
                      Clear all
                    </button>
                  </div>
                  {bulkFiles.map((f, i) => (
                    <div key={`${f.name}-${i}`} className={`${styles.bulkFileRow} ${bulkFileErrors[f.name] ? styles.bulkFileRowError : ''}`}>
                      <FileText size={15} className={styles.fileRowIcon} />
                      <div className={styles.fileRowInfo}>
                        <span className={styles.fileRowName}>{f.name}</span>
                        {bulkFileErrors[f.name]
                          ? <span className={styles.fileRowErrText}>{bulkFileErrors[f.name]}</span>
                          : <span className={styles.fileRowSize}>{(f.size / 1024).toFixed(0)} KB</span>}
                      </div>
                      <button className={styles.removeFileBtn} onClick={() => removeBulkFile(i)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.bulkActions}>
                <button
                  className={styles.evaluateBtn}
                  onClick={handleBulkUpload}
                  disabled={bulkFiles.length === 0}
                >
                  <Upload size={18} />
                  Upload & Evaluate {bulkFiles.length > 0 ? `${bulkFiles.length} CV${bulkFiles.length !== 1 ? 's' : ''}` : 'CVs'}
                </button>
              </div>
            </div>
          )}

          {/* Progress / results */}
          {(bulkRunning || bulkDone) && bulkResults.length > 0 && (
            <div className={styles.bulkResultsCard}>
              {/* Summary banner */}
              {bulkDone && (
                <div className={`${styles.bulkSummary} ${
                  errorCount > 0 && successCount === 0 ? styles.bulkSummaryError
                  : errorCount > 0 ? styles.bulkSummaryPartial
                  : styles.bulkSummarySuccess}`}
                >
                  {errorCount === 0
                    ? <><CheckCircle size={16} /> All {successCount} CV{successCount !== 1 ? 's' : ''} evaluated successfully</>
                    : successCount === 0
                    ? <><XCircle size={16} /> All {errorCount} upload{errorCount !== 1 ? 's' : ''} failed</>
                    : <><AlertTriangle size={16} /> {successCount} succeeded · {errorCount} failed</>}
                </div>
              )}

              {bulkRunning && (
                <div className={styles.bulkProgressInfo}>
                  <Loader2 size={14} className={styles.spinner} />
                  <span>
                    Processing {bulkResults.findIndex((r) => r.status === 'processing') + 1} of {bulkResults.length}…
                  </span>
                </div>
              )}

              <div className={styles.bulkResultList}>
                {bulkResults.map((r, i) => (
                  <div key={i} className={`${styles.bulkResultRow} ${styles[`bulkResult_${r.status}`]}`}>
                    <div className={styles.bulkResultIcon}>
                      {r.status === 'pending'    && <div className={styles.pendingDot} />}
                      {r.status === 'processing' && <Loader2 size={16} className={styles.spinner} />}
                      {r.status === 'success'    && <CheckCircle size={16} />}
                      {r.status === 'error'      && <XCircle size={16} />}
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
                <div className={styles.bulkActions}>
                  <button className={styles.resetBtn} onClick={handleBulkReset}>
                    <RotateCcw size={15} /> Upload More CVs
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Info card — always visible in bulk mode when not running */}
          {!bulkRunning && !bulkDone && (
            <div className={styles.infoCard}>
              <h3>Bulk evaluation</h3>
              <ul>
                <li><CheckCircle size={18} /><span>Upload up to {MAX_FILES} CVs at once</span></li>
                <li><CheckCircle size={18} /><span>Each CV is evaluated sequentially by AI</span></li>
                <li><CheckCircle size={18} /><span>Results appear in real time as each CV is processed</span></li>
                <li><CheckCircle size={18} /><span>All candidates are automatically added to the pipeline</span></li>
                <li><CheckCircle size={18} /><span>View detailed results in the My Candidates tab</span></li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
