import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Profile.module.css';
import {
  LogOut, Key, Edit3, Eye, EyeOff,
  ChevronDown, ChevronUp, ChevronRight, Shield,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useStore();

  const [showEditNameModal, setShowEditNameModal]         = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState('');
  const [error, setError]       = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const [newName, setNewName]               = useState('');
  const [newPassword, setNewPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw]           = useState(false);
  const [showConfirmPw, setShowConfirmPw]   = useState(false);

  const userEmail = user?.email ?? 'No email available';
  const userName  = user?.user_metadata?.full_name
                 ?? user?.user_metadata?.name
                 ?? user?.email?.split('@')[0]
                 ?? 'User';
  const userRole  = user?.user_metadata?.role ?? 'Member';
  const initials  = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—';

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const openEditName = () => {
    setNewName(userName);
    setMessage('');
    setError('');
    setShowEditNameModal(true);
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) { setError('Name cannot be empty'); return; }
    setLoading(true); setError('');
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: newName.trim() } });
      if (error) throw error;
      setMessage('Name updated successfully!');
      setTimeout(() => { setShowEditNameModal(false); setMessage(''); }, 1800);
    } catch (err: any) {
      setError(err.message ?? 'Failed to update name');
    } finally { setLoading(false); }
  };

  const openChangePassword = () => {
    setNewPassword(''); setConfirmPassword('');
    setMessage(''); setError('');
    setShowChangePasswordModal(true);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) { setError('Please fill in all fields'); return; }
    if (newPassword !== confirmPassword)  { setError('Passwords do not match'); return; }
    if (newPassword.length < 6)           { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMessage('Password updated successfully!');
      setTimeout(() => { setShowChangePasswordModal(false); setMessage(''); }, 1800);
    } catch (err: any) {
      setError(err.message ?? 'Failed to update password');
    } finally { setLoading(false); }
  };

  const faqs = [
    { q: 'How do I reset my password?',           a: 'Click "Change Password" in Account Settings above. Enter your new password twice to confirm.' },
    { q: 'How do I update my profile information?', a: 'Click "Edit Name" next to your profile to update your display name. Email is managed through your auth provider.' },
    { q: 'How do I create a new hiring project?',  a: 'Go to Hiring Projects in the sidebar and click "+ New Hiring Project". Fill in the job details and requirements.' },
    { q: 'How does CV evaluation work?',           a: 'The CV Evaluator uses AI to score resumes against your criteria. Upload CVs or add candidates manually for detailed evaluations.' },
    { q: 'Can I customize evaluation criteria?',   a: 'Yes — in Evaluation Criteria you can create custom sets or generate them with AI from a job description.' },
    { q: 'How do I manage candidates in a project?', a: 'Inside each project, add candidates manually or via bulk upload. Track status and move them through hiring stages.' },
    { q: 'Is my data secure?',                     a: 'Yes. All data is encrypted in transit and at rest using industry-standard cloud security. Only authorized users can access your data.' },
  ];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.breadcrumbs}>
          <span>Dashboard</span>
          <ChevronRight size={14} />
          <span className={styles.breadcrumbActive}>Profile</span>
        </div>
        <h1>Profile & Settings</h1>
        <p>Manage your account information and preferences</p>
      </div>

      {/* Profile hero card */}
      <div className={styles.heroCard}>
        <div className={styles.heroCardBanner} />
        <div className={styles.heroCardBody}>
          <div className={styles.heroRow}>
            <div className={styles.avatarWrap}>
              <div className={styles.avatar}>{initials}</div>
            </div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>{userName}</div>
              <div className={styles.userEmail}>{userEmail}</div>
              <span className={styles.roleBadge}>{userRole}</span>
            </div>
            <button className={styles.editBtn} onClick={openEditName}>
              <Edit3 size={14} /> Edit Name
            </button>
          </div>

          <div className={styles.divider} />

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Email</span>
              <span className={styles.infoValue}>{userEmail}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Member since</span>
              <span className={styles.infoValue}>{joinedDate}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Role</span>
              <span className={styles.infoValue}>{userRole}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Account ID</span>
              <span className={styles.infoValue}>{user?.id?.slice(0, 8) ?? '—'}…</span>
            </div>
          </div>
        </div>
      </div>

      {/* Account settings card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <Key size={16} />
          <h2>Account Settings</h2>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Password</h3>
            <p>Update your account password</p>
          </div>
          <button className={styles.outlineBtn} onClick={openChangePassword}>
            <Shield size={13} /> Change Password
          </button>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Email address</h3>
            <p>{userEmail}</p>
          </div>
          <button className={styles.outlineBtn} disabled style={{ opacity: 0.45, cursor: 'not-allowed' }}>
            Managed externally
          </button>
        </div>
      </div>

      {/* FAQ card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <ChevronDown size={16} />
          <h2>Frequently Asked Questions</h2>
        </div>
        <div className={styles.faqList}>
          {faqs.map((faq, i) => (
            <div key={i} className={styles.faqItem}>
              <button className={styles.faqQuestion} onClick={() => setExpandedFAQ(expandedFAQ === i ? null : i)}>
                <span>{faq.q}</span>
                {expandedFAQ === i ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
              {expandedFAQ === i && (
                <div className={styles.faqAnswer}>{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sign out card */}
      <div className={styles.card}>
        <div className={styles.dangerRow}>
          <div className={styles.dangerInfo}>
            <div className={styles.dangerIcon}><LogOut size={16} /></div>
            <div>
              <h3>Sign Out</h3>
              <p>Sign out of your account on this device</p>
            </div>
          </div>
          <button className={styles.dangerBtn} onClick={handleLogout}>
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </div>

      {/* Edit Name Modal */}
      {showEditNameModal && (
        <div className={styles.modalOverlay} onClick={() => setShowEditNameModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Edit Name</h3>
              <button className={styles.closeBtn} onClick={() => setShowEditNameModal(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateName}>
              <div className={styles.formGroup}>
                <label htmlFor="newName">Full Name</label>
                <input
                  id="newName" type="text" className={styles.input}
                  value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter your full name" disabled={loading}
                />
              </div>
              {error   && <div className={styles.errorMsg}>{error}</div>}
              {message && <div className={styles.successMsg}>{message}</div>}
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowEditNameModal(false)} disabled={loading}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={loading}>{loading ? 'Saving…' : 'Save Name'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className={styles.modalOverlay} onClick={() => setShowChangePasswordModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Change Password</h3>
              <button className={styles.closeBtn} onClick={() => setShowChangePasswordModal(false)}>×</button>
            </div>
            <form onSubmit={handleUpdatePassword}>
              <div className={styles.formGroup}>
                <label htmlFor="newPw">New Password</label>
                <div className={styles.passwordWrap}>
                  <input
                    id="newPw" type={showNewPw ? 'text' : 'password'} className={styles.input}
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password" disabled={loading}
                  />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowNewPw(!showNewPw)}>
                    {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="confirmPw">Confirm Password</label>
                <div className={styles.passwordWrap}>
                  <input
                    id="confirmPw" type={showConfirmPw ? 'text' : 'password'} className={styles.input}
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password" disabled={loading}
                  />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirmPw(!showConfirmPw)}>
                    {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {error   && <div className={styles.errorMsg}>{error}</div>}
              {message && <div className={styles.successMsg}>{message}</div>}
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowChangePasswordModal(false)} disabled={loading}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={loading}>{loading ? 'Saving…' : 'Update Password'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
