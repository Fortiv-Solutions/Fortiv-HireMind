import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';

export default function Login() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard-home');
    }
  }, [user, navigate]);

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

    try {
      // Authenticate with Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (signInError) {
        throw signInError;
      }

      if (data.user) {
        // Successfully logged in, navigate to dashboard home
        navigate('/dashboard-home');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Handle specific error messages
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
      <div className={styles.leftPanel}>
        <div className={styles.brand}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 8C18.2091 8 20 9.79086 20 12C20 14.2091 18.2091 16 16 16C13 16 11 8 8 8C5.79086 8 4 9.79086 4 12C4 14.2091 5.79086 16 8 16C11 16 13 8 16 8Z" stroke="#8c6a28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className={styles.brandName}>HireFlow</span>
        </div>

        <div className={styles.heroContent}>
          <h1>Intelligence Suite for<br/>Modern Recruitment</h1>
          <p>
            Streamline your talent acquisition pipeline with data-driven<br/>insights and a frictionless candidate experience.
          </p>
        </div>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Welcome back</h2>
            <p className={styles.subTitle}>Please enter your details to sign in.</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <div className={styles.errorBanner}>
                {error}
              </div>
            )}

            <div className={styles.inputGroup}>
              <label>Email</label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} size={16} />
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
                <Lock className={styles.inputIcon} size={16} />
                <input 
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className={styles.optionsRow}>
              <label className={styles.rememberMe}>
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className={styles.checkmark}></span>
                Remember me
              </label>
              <a href="#" className={styles.forgot}>Forgot password?</a>
            </div>

            <button 
              type="submit" 
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={18} className={styles.spinner} />
              ) : (
                <>Sign In <ArrowRight size={18} className={styles.arrowIcon} /></>
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
