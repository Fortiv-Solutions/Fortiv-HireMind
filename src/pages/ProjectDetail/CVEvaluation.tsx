import React, { useState } from 'react';
import styles from './CVEvaluation.module.css';
import { Upload, FileText, Loader2, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

export default function CVEvaluation() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleEvaluate = async () => {
    if (!file) return;

    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Mock result
    setResult({
      candidateName: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+91 98765 43210',
      location: 'Mumbai, India',
      experienceYears: 5,
      totalScore: 87,
      skillsScore: 92,
      experienceScore: 85,
      educationScore: 84,
      matchedSkills: ['React', 'TypeScript', 'Node.js', 'AWS'],
      missingSkills: ['Docker', 'Kubernetes'],
      education: 'B.Tech in Computer Science, IIT Mumbai',
      companies: ['Google', 'Microsoft', 'Startup Inc.'],
      summary: 'Experienced full-stack developer with strong expertise in React and Node.js. Has worked at top tech companies and demonstrates excellent problem-solving skills. Strong match for the role requirements.',
      strengths: [
        'Extensive experience with required tech stack',
        'Proven track record at leading companies',
        'Strong educational background',
      ],
      concerns: [
        'Missing some DevOps skills',
        'Limited experience with cloud infrastructure',
      ],
    });
    
    setLoading(false);
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
  };

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

            {file && (
              <button 
                className={styles.evaluateBtn} 
                onClick={handleEvaluate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className={styles.spinner} />
                    Analyzing Resume...
                  </>
                ) : (
                  <>
                    <TrendingUp size={20} />
                    Evaluate Resume
                  </>
                )}
              </button>
            )}
          </div>

          <div className={styles.infoCard}>
            <h3>What we analyze</h3>
            <ul>
              <li>
                <CheckCircle size={18} />
                <span>Skills match against job requirements</span>
              </li>
              <li>
                <CheckCircle size={18} />
                <span>Years of experience and relevance</span>
              </li>
              <li>
                <CheckCircle size={18} />
                <span>Educational background</span>
              </li>
              <li>
                <CheckCircle size={18} />
                <span>Previous companies and projects</span>
              </li>
              <li>
                <CheckCircle size={18} />
                <span>Overall fit score and recommendations</span>
              </li>
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
                    cx="50" 
                    cy="50" 
                    r="45" 
                    className={styles.scoreRingFill}
                    style={{ 
                      strokeDasharray: `${result.totalScore * 2.827}, 282.7`,
                    }}
                  />
                </svg>
                <div className={styles.scoreValue}>
                  <span className={styles.scoreNumber}>{result.totalScore}</span>
                  <span className={styles.scorePercent}>%</span>
                </div>
              </div>
              <div className={styles.scoreLabel}>
                <h3>Overall Match Score</h3>
                <p className={styles.matchLevel}>
                  {result.totalScore >= 80 ? '🎯 Strong Match' : result.totalScore >= 60 ? '✓ Good Match' : '⚠ Weak Match'}
                </p>
              </div>
            </div>

            <div className={styles.scoreBreakdown}>
              <div className={styles.scoreItem}>
                <span className={styles.scoreItemLabel}>Skills Match</span>
                <div className={styles.scoreBar}>
                  <div 
                    className={styles.scoreBarFill} 
                    style={{ width: `${result.skillsScore}%` }}
                  ></div>
                </div>
                <span className={styles.scoreItemValue}>{result.skillsScore}%</span>
              </div>
              <div className={styles.scoreItem}>
                <span className={styles.scoreItemLabel}>Experience</span>
                <div className={styles.scoreBar}>
                  <div 
                    className={styles.scoreBarFill} 
                    style={{ width: `${result.experienceScore}%` }}
                  ></div>
                </div>
                <span className={styles.scoreItemValue}>{result.experienceScore}%</span>
              </div>
              <div className={styles.scoreItem}>
                <span className={styles.scoreItemLabel}>Education</span>
                <div className={styles.scoreBar}>
                  <div 
                    className={styles.scoreBarFill} 
                    style={{ width: `${result.educationScore}%` }}
                  ></div>
                </div>
                <span className={styles.scoreItemValue}>{result.educationScore}%</span>
              </div>
            </div>
          </div>

          {/* Candidate Info */}
          <div className={styles.candidateInfo}>
            <h3>Candidate Information</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Name</span>
                <span className={styles.infoValue}>{result.candidateName}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>{result.email}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Phone</span>
                <span className={styles.infoValue}>{result.phone}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Location</span>
                <span className={styles.infoValue}>{result.location}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Experience</span>
                <span className={styles.infoValue}>{result.experienceYears} years</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Education</span>
                <span className={styles.infoValue}>{result.education}</span>
              </div>
            </div>
          </div>

          {/* AI Summary */}
          <div className={styles.aiSummary}>
            <div className={styles.aiHeader}>
              <span className={styles.aiBadge}>✨ AI Summary</span>
            </div>
            <p>{result.summary}</p>
          </div>

          {/* Skills Analysis */}
          <div className={styles.skillsAnalysis}>
            <div className={styles.skillsColumn}>
              <h3>
                <CheckCircle size={20} className={styles.iconGreen} />
                Matched Skills
              </h3>
              <div className={styles.skillTags}>
                {result.matchedSkills.map((skill: string) => (
                  <span key={skill} className={styles.skillTagMatched}>{skill}</span>
                ))}
              </div>
            </div>
            <div className={styles.skillsColumn}>
              <h3>
                <XCircle size={20} className={styles.iconRed} />
                Missing Skills
              </h3>
              <div className={styles.skillTags}>
                {result.missingSkills.map((skill: string) => (
                  <span key={skill} className={styles.skillTagMissing}>{skill}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Strengths & Concerns */}
          <div className={styles.analysisGrid}>
            <div className={styles.analysisCard}>
              <h3>
                <CheckCircle size={20} className={styles.iconGreen} />
                Key Strengths
              </h3>
              <ul>
                {result.strengths.map((strength: string, idx: number) => (
                  <li key={idx}>{strength}</li>
                ))}
              </ul>
            </div>
            <div className={styles.analysisCard}>
              <h3>
                <XCircle size={20} className={styles.iconOrange} />
                Potential Concerns
              </h3>
              <ul>
                {result.concerns.map((concern: string, idx: number) => (
                  <li key={idx}>{concern}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.resultActions}>
            <button className={styles.resetBtn} onClick={handleReset}>
              Evaluate Another CV
            </button>
            <button className={styles.addToPipelineBtn}>
              Add to Candidate Pipeline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
