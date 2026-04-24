import React from 'react';
import { X, Download, Loader2, AlertCircle, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import styles from './CVPreviewModal.module.css';

interface Props {
  cvFileUrl: string;
  candidateName: string;
  onClose: () => void;
}

type LoadState = 'loading' | 'ready' | 'error';

/**
 * Downloads the CV file from Supabase storage and creates a blob URL.
 * This bypasses any URL formatting issues by fetching the actual file data.
 */
async function downloadAndCreateBlobUrl(rawUrl: string): Promise<string> {
  console.log('[CVPreview] Raw URL from database:', rawUrl);
  
  // Clean the URL
  const cleaned = rawUrl.trim();
  
  // Extract bucket and file path from the URL
  // Handle both /object/ and /objject/ typo
  const match = cleaned.match(/\/storage\/v1\/obj+ect\/public\/([^/]+)\/(.+?)(?:\?|$)/);
  
  if (!match) {
    console.error('[CVPreview] Could not parse storage URL');
    throw new Error('Invalid storage URL format');
  }
  
  const bucket = match[1];
  const filePath = decodeURIComponent(match[2]);
  
  console.log('[CVPreview] Extracted bucket:', bucket);
  console.log('[CVPreview] Extracted file path:', filePath);
  
  // Download the file from Supabase storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(filePath);
  
  if (error) {
    console.error('[CVPreview] Download error:', error);
    throw new Error(`Failed to download file: ${error.message}`);
  }
  
  if (!data) {
    throw new Error('No file data received');
  }
  
  console.log('[CVPreview] File downloaded successfully, size:', data.size);
  
  // Create a blob URL from the downloaded file
  const blobUrl = URL.createObjectURL(data);
  console.log('[CVPreview] Created blob URL:', blobUrl);
  
  return blobUrl;
}

function getFileType(url: string): 'pdf' | 'image' | 'other' {
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.pdf')) return 'pdf';
  if (clean.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return 'image';
  return 'other';
}

export default function CVPreviewModal({ cvFileUrl, candidateName, onClose }: Props) {
  const [state, setState] = React.useState<LoadState>('loading');
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState('');
  const [fileType, setFileType] = React.useState<'pdf' | 'image' | 'other'>('pdf');

  React.useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;

    setState('loading');
    setPreviewUrl(null);
    setErrorMsg('');

    downloadAndCreateBlobUrl(cvFileUrl)
      .then((url) => {
        if (cancelled) {
          // Clean up blob URL if component unmounted
          URL.revokeObjectURL(url);
          return;
        }
        blobUrl = url;
        setPreviewUrl(url);
        setFileType(getFileType(cvFileUrl));
        setState('ready');
      })
      .catch((err: Error) => {
        if (cancelled) return;
        console.error('[CVPreview] Error:', err);
        setErrorMsg(err.message || 'Failed to load CV');
        setState('error');
      });

    // Cleanup: revoke blob URL when component unmounts
    return () => {
      cancelled = true;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [cvFileUrl]);

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`CV Preview — ${candidateName}`}
      >
        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <FileText size={15} className={styles.headerIcon} />
            <div>
              <p className={styles.headerLabel}>CV Preview</p>
              <p className={styles.headerName}>{candidateName}</p>
            </div>
          </div>
          <div className={styles.headerActions}>
            {previewUrl && (
              <a
                href={previewUrl}
                download={`${candidateName}_CV.pdf`}
                className={styles.downloadBtn}
                title="Download CV"
              >
                <Download size={14} />
                Download
              </a>
            )}
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close preview">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className={styles.body}>

          {state === 'loading' && (
            <div className={styles.centered}>
              <Loader2 size={28} className={styles.spinner} />
              <p className={styles.loadingText}>Loading CV…</p>
            </div>
          )}

          {state === 'error' && (
            <div className={styles.centered}>
              <AlertCircle size={32} className={styles.errorIcon} />
              <p className={styles.errorTitle}>Could not load CV</p>
              <p className={styles.errorMsg}>{errorMsg}</p>
              <a
                href={cvFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.fallbackLink}
              >
                Open in new tab instead →
              </a>
            </div>
          )}

          {state === 'ready' && previewUrl && fileType === 'pdf' && (
            <iframe
              src={previewUrl}
              className={styles.pdfFrame}
              title={`CV — ${candidateName}`}
            />
          )}

          {state === 'ready' && previewUrl && fileType === 'image' && (
            <div className={styles.imageWrap}>
              <img
                src={previewUrl}
                alt={`CV — ${candidateName}`}
                className={styles.cvImage}
              />
            </div>
          )}

          {state === 'ready' && previewUrl && fileType === 'other' && (
            <div className={styles.centered}>
              <FileText size={40} className={styles.fileIcon} />
              <p className={styles.errorTitle}>Preview not available</p>
              <p className={styles.errorMsg}>
                This file type can't be previewed in the browser.
              </p>
              <a href={previewUrl} download className={styles.fallbackLink}>
                <Download size={13} /> Download to view
              </a>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
