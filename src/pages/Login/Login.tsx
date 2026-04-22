import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';
import { Mail, Lock, Eye, EyeOff, Loader2, BrainCircuit, Sparkles, BarChart3, Zap, Shield } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    // Simulate login (replace with actual authentication later)
    setTimeout(() => {
      setLoading(false);
      // Navigate to dashboard on successful login
      navigate('/dashboard');
    }, 1000);
  };

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
          <span className={styles.chip}><Sparkles size={14} /> AI Evaluation</span>
          <span className={styles.chip}><BarChart3 size={14} /> Deep Analytics</span>
          <span className={styles.chip}><Zap size={14} /> Accelerated Hiring</span>
        </div>

        <div className={styles.footerBrand}>
          <Shield size={16} /> Enterprise Grade Security & Compliance
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

          <form onSubmit={handleSubmit}>
            {error && (
              <div className={styles.errorBanner}>
                {error}
              </div>
            )}

            <div className={styles.inputGroup}>
              <label>Work Email</label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} size={18} />
                <input 
                  type="email" 
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <div className={styles.labelRow}>
                <label>Password</label>
                <a href="#" className={styles.forgot}>Forgot password?</a>
              </div>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} size={18} />
                <input 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className={styles.inputActionIcon} size={18} />
                  ) : (
                    <Eye className={styles.inputActionIcon} size={18} />
                  )}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className={styles.spinner} />
                  Signing in...
                </>
              ) : (
                'Sign In to Workspace'
              )}
            </button>
          </form>

          <div className={styles.troubleText}>
            Having trouble signing in? <a href="#">Contact IT Support</a>
          </div>
        </div>
      </div>
    </div>
  );
}
