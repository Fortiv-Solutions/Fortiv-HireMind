import React, { useState, useRef, useCallback } from 'react';
import styles from './BulkUploadModal.module.css';
import { X, Upload, FileText, CheckCircle, XCircle, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { bulkUploadCVs, type BulkFileResult } from '../../services/cvEvaluation';
import { useStore } from '../../store/useStore';

interface Props {
  onClose: () => void;
  projectId: string;
}

const ACCEPTED_TYPES = ['.pdf', '.doc', '.docx'];
const ACCEPTED_MIME = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILES = 20;

function validateFile(file: File): string | null {
  if (!ACCEPTED_MIME.includes(file.type) && !ACCEPTED_TYPES.some((ext) => file.name.toLowerCase().endsWith(ext))) {
    return `Unsupported format. Use PDF, DOC, or DOCX.`;
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `File exceeds ${MAX_FILE_SIZE_MB}MB limit.`;
  }
  return null;
}

export default function BulkUploadModal({ onClose, projectId }: Props) {
  const { loadProjectDetail } = useStore();
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [results, setResults] = useState<BulkFileResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    const errors: Record<string, string> = {};
    const valid: File[] = [];

    for (const f of arr) {
      const err = validateFile(f);
      if (err) {
        errors[f.name] = err;
      } else {
        valid.push(f);
      }
    }

    setFiles((prev) => {
      const combined = [...prev, ...valid];
      if (combined.length > MAX_FILES) {
        setGlobalError(`You can upload a maximum of ${MAX_FILES} CVs at once.`);
        return combined.slice(0, MAX_FILES);
      }
      setGlobalError(null);
      return combined;
    });

    if (Object.keys(errors).length > 0) {
      setFileErrors((prev) => ({ ...prev, ...errors }));
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    // Reset input so same files can be re-added after removal
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const updated = [...prev];
      const removed = updated.splice(index, 1)[0];
      setFileErrors((errs) => {
        const copy = { ...errs };
        delete copy[removed.name];
        return copy;
      });
      return updated;
    });
    if (files.length - 1 <= MAX_FILES) setGlobalError(null);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsRunning(true);
    setGlobalError(null);

    // Initialise results list from current files
    setResults(files.map((file) => ({ file, status: 'pending' })));

    try {
      const finalResults = await bulkUploadCVs(files, projectId, undefined, (updated) => {
        setResults([...updated]);
      });

      const anySuccess = finalResults.some((r) => r.status === 'success');
      if (anySuccess) {
        await loadProjectDetail(projectId);
      }
    } catch (err: any) {
      setGlobalError(err.message || 'An unexpected error occurred during bulk upload.');
    } finally {
      setIsRunning(false);
      setDone(true);
    }
  };

  const successCount = results.filter((r) => r.status === 'success').length;
  const errorCount = results.filter((r) => r.status === 'error').length;
  const pendingCount = results.filter((r) => r.status === 'pending' || r.status === 'processing').length;

  const canClose = !isRunning;

  return (
    <>
      <div className={styles.overlay} onClick={canClose ? onClose : undefined} />
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2>Bulk Upload CVs</h2>
            <p>Upload up to {MAX_FILES} resumes at once for AI evaluation</p>
          </div>
          <button className={styles.closeBtn} onClick={canClose ? onClose : undefined} disabled={isRunning}>
            <X size={20} />
          </button>
        </div>

        {/* Global error */}
        {globalError && (
          <div className={styles.globalError}>
            <AlertTriangle size={16} />
            <span>{globalError}</span>
          </div>
        )}

        {/* Drop zone — hidden once upload starts */}
        {!isRunning && !done && (
          <>
            <div
              className={`${styles.dropZone} ${isDragging ? styles.dropZoneDragging : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                onChange={handleInputChange}
                className={styles.hiddenInput}
              />
              <Upload size={40} className={styles.dropIcon} />
              <h3>Drop CVs here or click to browse</h3>
              <p>PDF, DOC, DOCX · Max {MAX_FILE_SIZE_MB}MB per file · Up to {MAX_FILES} files</p>
            </div>

            {/* File list with validation errors */}
            {files.length > 0 && (
              <div className={styles.fileList}>
                <div className={styles.fileListHeader}>
                  <span>{files.length} file{files.length !== 1 ? 's' : ''} selected</span>
                  <button className={styles.clearAllBtn} onClick={() => { setFiles([]); setFileErrors({}); setGlobalError(null); }}>
                    Clear all
                  </button>
                </div>
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} className={`${styles.fileRow} ${fileErrors[f.name] ? styles.fileRowError : ''}`}>
                    <FileText size={16} className={styles.fileIcon} />
                    <div className={styles.fileInfo}>
                      <span className={styles.fileName}>{f.name}</span>
                      {fileErrors[f.name]
                        ? <span className={styles.fileErrorText}>{fileErrors[f.name]}</span>
                        : <span className={styles.fileSize}>{(f.size / 1024).toFixed(0)} KB</span>
                      }
                    </div>
                    <button className={styles.removeBtn} onClick={() => removeFile(i)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Progress list — shown during and after upload */}
        {(isRunning || done) && results.length > 0 && (
          <div className={styles.progressSection}>
            {done && (
              <div className={`${styles.summary} ${errorCount > 0 && successCount === 0 ? styles.summaryError : errorCount > 0 ? styles.summaryPartial : styles.summarySuccess}`}>
                {errorCount === 0
                  ? <><CheckCircle size={16} /> All {successCount} CV{successCount !== 1 ? 's' : ''} evaluated successfully</>
                  : successCount === 0
                  ? <><XCircle size={16} /> All {errorCount} upload{errorCount !== 1 ? 's' : ''} failed</>
                  : <><AlertTriangle size={16} /> {successCount} succeeded · {errorCount} failed</>
                }
              </div>
            )}

            {isRunning && pendingCount > 0 && (
              <div className={styles.progressInfo}>
                <Loader2 size={14} className={styles.spinnerSmall} />
                <span>Processing {results.findIndex((r) => r.status === 'processing') + 1} of {results.length}…</span>
              </div>
            )}

            <div className={styles.resultList}>
              {results.map((r, i) => (
                <div key={i} className={`${styles.resultRow} ${styles[`result_${r.status}`]}`}>
                  <div className={styles.resultIcon}>
                    {r.status === 'pending' && <div className={styles.pendingDot} />}
                    {r.status === 'processing' && <Loader2 size={16} className={styles.spinnerSmall} />}
                    {r.status === 'success' && <CheckCircle size={16} />}
                    {r.status === 'error' && <XCircle size={16} />}
                  </div>
                  <div className={styles.resultInfo}>
                    <span className={styles.resultName}>
                      {r.candidateName ?? r.file.name}
                    </span>
                    {r.status === 'success' && r.totalScore !== undefined && (
                      <span className={styles.resultScore}>Score: {Math.round(r.totalScore)}%</span>
                    )}
                    {r.status === 'error' && (
                      <span className={styles.resultError}>{r.error}</span>
                    )}
                    {r.status === 'pending' && (
                      <span className={styles.resultPending}>Waiting…</span>
                    )}
                    {r.status === 'processing' && (
                      <span className={styles.resultPending}>Evaluating…</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={isRunning}>
            {done ? 'Close' : 'Cancel'}
          </button>
          {!done && (
            <button
              className={styles.uploadBtn}
              onClick={handleUpload}
              disabled={isRunning || files.length === 0}
            >
              {isRunning ? (
                <><Loader2 size={16} className={styles.spinnerSmall} /> Processing…</>
              ) : (
                <><Upload size={16} /> Upload {files.length > 0 ? `${files.length} CV${files.length !== 1 ? 's' : ''}` : 'CVs'}</>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
