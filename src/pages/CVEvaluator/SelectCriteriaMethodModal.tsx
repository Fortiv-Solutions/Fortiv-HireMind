import { useState } from 'react';
import styles from './SelectCriteriaMethodModal.module.css';
import { X, FileText, Edit3, Sparkles, ArrowRight, Loader } from 'lucide-react';
import { generateCriteriaFromJobDescription } from '../../services/aiCriteriaGenerator';
import type { GeneratedCriteria } from '../../services/aiCriteriaGenerator';

type Step = 'select' | 'jd-input';
type Method = 'generate' | 'manual';

interface SelectCriteriaMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when user picks manual — open the regular create modal */
  onSelectManual: () => void;
  /** Called when AI generation is done — open create modal pre-filled */
  onGenerateDone: (generated: GeneratedCriteria) => void;
}

export default function SelectCriteriaMethodModal({
  isOpen,
  onClose,
  onSelectManual,
  onGenerateDone,
}: SelectCriteriaMethodModalProps) {
  const [step, setStep] = useState<Step>('select');
  const [selectedMethod, setSelectedMethod] = useState<Method>('generate');
  const [jobDescription, setJobDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setStep('select');
    setSelectedMethod('generate');
    setJobDescription('');
    setGenerating(false);
    setError(null);
    onClose();
  };

  const handleContinue = () => {
    if (selectedMethod === 'manual') {
      handleClose();
      onSelectManual();
    } else {
      setStep('jd-input');
      setError(null);
    }
  };

  const handleGenerate = async () => {
    if (!jobDescription.trim()) {
      setError('Please paste your job description before generating.');
      return;
    }
    if (jobDescription.trim().length < 50) {
      setError('Job description is too short. Please provide more detail.');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const generated = await generateCriteriaFromJobDescription(jobDescription.trim());
      handleClose();
      onGenerateDone(generated);
    } catch (err: any) {
      setError(err.message || 'Failed to generate criteria. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleBack = () => {
    setStep('select');
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* ── Step 1: Method Selection ── */}
        {step === 'select' && (
          <>
            <div className={styles.header}>
              <button className={styles.backBtn} onClick={handleClose}>
                ← Back
              </button>
              <button className={styles.closeBtn} onClick={handleClose}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.titleBlock}>
              <h2>Create New CV Evaluation Criteria</h2>
              <p className={styles.subtitle}>
                Select a method to quickly generate a new CV evaluation criteria
              </p>
            </div>

            <div className={styles.options}>
              {/* Option 1: Generate from JD */}
              <button
                className={`${styles.option} ${selectedMethod === 'generate' ? styles.optionSelected : ''}`}
                onClick={() => setSelectedMethod('generate')}
              >
                <div className={styles.optionLeft}>
                  <div className={styles.radio}>
                    <div className={selectedMethod === 'generate' ? styles.radioDotActive : styles.radioDot} />
                  </div>
                  <div className={styles.optionText}>
                    <div className={styles.optionTitle}>
                      Generate from job description and create a scratch score
                      <span className={styles.badge}>Recommended</span>
                    </div>
                    <div className={styles.optionDesc}>
                      Paste your JD to auto-generate CV evaluation criteria with AI
                    </div>
                  </div>
                </div>
                <FileText size={22} className={styles.optionIcon} />
              </button>

              {/* Option 2: Manual */}
              <button
                className={`${styles.option} ${selectedMethod === 'manual' ? styles.optionSelected : ''}`}
                onClick={() => setSelectedMethod('manual')}
              >
                <div className={styles.optionLeft}>
                  <div className={styles.radio}>
                    <div className={selectedMethod === 'manual' ? styles.radioDotActive : styles.radioDot} />
                  </div>
                  <div className={styles.optionText}>
                    <div className={styles.optionTitle}>Create new from scratch</div>
                    <div className={styles.optionDesc}>
                      Tell us the role or position; we'll generate evaluation criteria for your needs
                    </div>
                  </div>
                </div>
                <Edit3 size={22} className={styles.optionIcon} />
              </button>
            </div>

            <div className={styles.footer}>
              <button className={styles.continueBtn} onClick={handleContinue}>
                Continue
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: JD Input ── */}
        {step === 'jd-input' && (
          <>
            <div className={styles.header}>
              <button className={styles.backBtn} onClick={handleBack} disabled={generating}>
                ← Back
              </button>
              <button className={styles.closeBtn} onClick={handleClose} disabled={generating}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.titleBlock}>
              <h2>Paste Your Job Description</h2>
              <p className={styles.subtitle}>
                Our AI will analyse the JD and generate tailored evaluation criteria for you
              </p>
            </div>

            <div className={styles.jdSection}>
              {error && (
                <div className={styles.error}>
                  <span>{error}</span>
                </div>
              )}

              <label className={styles.jdLabel} htmlFor="jd-input">
                Job Description
              </label>
              <textarea
                id="jd-input"
                className={styles.jdTextarea}
                placeholder="Paste your full job description here…&#10;&#10;Include the role title, responsibilities, required skills, experience, and qualifications for the best results."
                value={jobDescription}
                onChange={(e) => {
                  setJobDescription(e.target.value);
                  if (error) setError(null);
                }}
                disabled={generating}
                rows={12}
              />
              <p className={styles.jdHint}>
                {jobDescription.trim().length} characters
                {jobDescription.trim().length > 0 && jobDescription.trim().length < 50 && (
                  <span className={styles.hintWarn}> — add more detail for better results</span>
                )}
              </p>
            </div>

            <div className={styles.footer}>
              <button
                className={styles.continueBtn}
                onClick={handleGenerate}
                disabled={generating || !jobDescription.trim()}
              >
                {generating ? (
                  <>
                    <Loader size={16} className={styles.spinner} />
                    Generating criteria…
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate Criteria
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
