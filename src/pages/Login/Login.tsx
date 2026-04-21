import React from 'react';
import styles from './Login.module.css';
import { Mail, Lock, Eye, Loader2, BrainCircuit } from 'lucide-react';

export default function Login() {
  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        <div className={styles.brand}>
          <div className={styles.logoBox}>
            <BrainCircuit size={20} color="white" strokeWidth={2} />
          </div>
          <div className={styles.wordmark}>
            <span className={styles.fortiv}>Fortiv</span>
            <span className={styles.hiremind}>HireMind</span>
          </div>
        </div>

        <div className={styles.heroText}>
          <h1>Intelligence Suite for Modern Recruitment</h1>
          <p>
            Empower your hiring decisions with AI-driven insights. Streamline workflows, evaluate candidates with precision, and build exceptional teams faster.
          </p>
        </div>

        <div className={styles.features}>
          <span className={styles.chip}>✨ AI Evaluation</span>
          <span className={styles.chip}>📊 Deep Analytics</span>
          <span className={styles.chip}>⚡ Accelerated Hiring</span>
        </div>

        <div className={styles.footerBrand}>
          <span className={styles.shield}>🛡️</span> Enterprise Grade Security & Compliance
        </div>

        {/* Placeholder for the 3D Glassmorphism element (using CSS bubbles instead since no WebGL configured) */}
        <div className={styles.glassOrb1}></div>
        <div className={styles.glassOrb2}></div>
        <div className={styles.glassOrb3}></div>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.formContainer}>
          <h2>Welcome back</h2>
          <p className={styles.subTitle}>Sign in to your account to continue.</p>

          <div className={styles.inputGroup}>
            <label>Work Email</label>
            <div className={styles.inputWrapper}>
              <Mail className={styles.inputIcon} size={18} />
              <input type="email" placeholder="name@company.com" />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <div className={styles.labelRow}>
              <label>Password</label>
              <a href="#" className={styles.forgot}>Forgot password?</a>
            </div>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} size={18} />
              <input type="password" placeholder="••••••••" />
              <Eye className={styles.inputActionIcon} size={18} />
            </div>
          </div>

          <button className={styles.submitBtn} onClick={() => window.location.href = '/dashboard'}>
            Sign In to Workspace
          </button>

          <div className={styles.troubleText}>
            Having trouble signing in? <a href="#">Contact IT Support</a>
          </div>
        </div>
      </div>
    </div>
  );
}
