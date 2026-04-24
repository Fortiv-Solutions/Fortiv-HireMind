import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';

export default function Login() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) navigate('/dashboard-home');
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) { setError('Please enter both email and password'); return; }
    if (!email.includes('@')) { setError('Please enter a valid email address'); return; }

    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      if (data.user) navigate('/dashboard-home');
    } catch (err: any) {
      if (err.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Please verify your email address before logging in.');
      } else if (err.message?.includes('User not found')) {
        setError('No account found with this email address.');
      } else {
        setError(err.message || 'Failed to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>

      {/* ── Left panel ── */}
      <div className={styles.leftPanel}>
        {/* Brand mark */}
        <div className={styles.brand}>
          <span className={styles.brandUK}>UK</span>
          <span className={styles.brandRealty}>REALTY</span>
        </div>

        {/* Decorative geometric accent */}
        <div className={styles.accentCircle} />
        <div className={styles.accentCircle2} />

        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>Recruitment Intelligence</div>
          <h1>Hire smarter.<br />Move faster.</h1>
          <p>
            A unified platform to screen, evaluate, and shortlist top talent —
            powered by AI and built for modern hiring teams.
          </p>

          <div className={styles.heroPills}>
            <span className={styles.heroPill}>AI CV Evaluation</span>
            <span className={styles.heroPill}>Pipeline Analytics</span>
            <span className={styles.heroPill}>Bulk Screening</span>
          </div>
        </div>

        {/* Bottom stat strip */}
        <div className={styles.statStrip}>
          <div className={styles.statItem}>
            <span className={styles.statNum}>10×</span>
            <span className={styles.statLabel}>Faster screening</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statNum}>98%</span>
            <span className={styles.statLabel}>Accuracy rate</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statNum}>Zero</span>
            <span className={styles.statLabel}>Bias in scoring</span>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className={styles.rightPanel}>
        <div className={styles.formCard}>

          {/* Logo repeat on right for context */}
          <div className={styles.formLogo}>
            <span className={styles.formLogoUK}>UK</span>
            <span className={styles.formLogoRealty}>REALTY</span>
          </div>

          <div className={styles.formHeader}>
            <h2>Welcome back</h2>
            <p className={styles.subTitle}>Sign in to your HireMind workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <div className={styles.errorBanner}>
                {error}
              </div>
            )}

            <div className={styles.inputGroup}>
              <label>Email address</label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} size={15} />
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
              <label>Password</label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} size={15} />
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
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className={styles.optionsRow}>
              <label className={styles.rememberMe}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className={styles.checkmark} />
                Remember me
              </label>
              <a href="#" className={styles.forgot}>Forgot password?</a>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? (
                <Loader2 size={18} className={styles.spinner} />
              ) : (
                <>Sign In <ArrowRight size={17} className={styles.arrowIcon} /></>
              )}
            </button>
          </form>

          <div className={styles.troubleText}>
            Don't have an account? <a href="#">Request access</a>
          </div>
        </div>
      </div>
    </div>
  );
}
