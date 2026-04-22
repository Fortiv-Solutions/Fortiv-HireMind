import React, { useState } from 'react';
import styles from './CVEvaluation.module.css';
import {
  Upload, FileText, Loader2, CheckCircle, TrendingUp,
  Target, CheckCheck, AlertTriangle, ExternalLink, Hash
} from 'lucide-react';
import { evaluateCv } from '../../services/cvEvaluation';
import type { CvEvaluation as CvEvaluationResult, WebhookResponseData } from '../../services/cvEvaluation';

interface Props {
  projectId: string;
}

interface EvalResult {
  evaluation: CvEvaluationResult;
  webhookData: WebhookResponseData;
}

export default function CVEvaluation({ projectId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleEvaluate = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await evaluateCv(file, projectId);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Evaluation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  const score = result?.webhookData.total_score ?? 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>CV Evaluation</h2>
          <p>Upload a candidate's resume to get an instant AI-powered evaluation and match score</p>
        </div>
      </div>

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
              <button
                className={styles.evaluateBtn}
                onClick={handleEvaluate}
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 size={20} className={styles.spinner} /> Analyzing Resume...</>
                ) : (
                  <><TrendingUp size={20} /> Evaluate Resume</>
                )}
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
          {/* Score Overview */}
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
                  {score >= 80 ? (
                    <><Target size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Strong Match</>
                  ) : score >= 60 ? (
                    <><CheckCheck size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Good Match</>
                  ) : (
                    <><AlertTriangle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Weak Match</>
                  )}
                </p>
                <span className={styles.statusBadge} data-shortlisted={result.webhookData.shortlisted}>
                  {result.webhookData.status}
                </span>
              </div>
            </div>
          </div>

          {/* IDs from webhook response */}
          <div className={styles.idsCard}>
            <div className={styles.idsHeader}>
              <Hash size={16} />
              <span>Evaluation IDs</span>
            </div>
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

          {/* File info */}
          <div className={styles.fileInfoCard}>
            <FileText size={16} />
            <span className={styles.fileName}>{result.webhookData.original_filename}</span>
            {result.webhookData.cv_file_url && (
              <a
                href={result.webhookData.cv_file_url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.viewFileLink}
              >
                View File <ExternalLink size={13} />
              </a>
            )}
          </div>

          {/* Candidate info from DB */}
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

          {/* Actions */}
          <div className={styles.resultActions}>
            <button className={styles.resetBtn} onClick={handleReset}>
              Evaluate Another CV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
