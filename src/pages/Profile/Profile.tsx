import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Profile.module.css';
import { User, LogOut, Key, Edit3, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useStore();
  
  // State for modals and forms
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  
  // Form states
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // Extract user information from Supabase user object
  const userEmail = user?.email || 'No email available';
  const userName = user?.user_metadata?.full_name || 
                   user?.user_metadata?.name || 
                   user?.email?.split('@')[0] || 
                   'User';
  const userRole = user?.user_metadata?.role || 'User';

  const handleEditName = () => {
    setNewName(userName);
    setShowEditNameModal(true);
    setMessage('');
    setError('');
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setError('Name cannot be empty');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: newName.trim() }
      });

      if (error) throw error;

      setMessage('Name updated successfully!');
      setTimeout(() => {
        setShowEditNameModal(false);
        setMessage('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update name');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = () => {
    setShowChangePasswordModal(true);
    setNewPassword('');
    setConfirmPassword('');
    setMessage('');
    setError('');
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setMessage('Password updated successfully!');
      setTimeout(() => {
        setShowChangePasswordModal(false);
        setMessage('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const faqs = [
    {
      question: "How do I reset my password?",
      answer: "You can reset your password by clicking the 'Change Password' button in the Account Settings section above. You'll need to enter your new password twice to confirm the change."
    },
    {
      question: "How do I update my profile information?",
      answer: "Click the 'Edit Name' button next to your profile information to update your display name. Your email address is managed through your account settings and cannot be changed here."
    },
    {
      question: "How do I create a new hiring project?",
      answer: "Navigate to the 'Hiring Projects' section from the sidebar and click the 'New Project' button. Fill in the project details including job title, description, and requirements."
    },
    {
      question: "How does the CV evaluation feature work?",
      answer: "The CV Evaluator uses AI to analyze resumes against your job criteria. Upload CVs or add candidates manually, and the system will provide detailed evaluations and recommendations."
    },
    {
      question: "Can I customize evaluation criteria?",
      answer: "Yes! In the CV Evaluator, you can create custom criteria sets or use AI-generated criteria based on your job description. You can also edit existing criteria to match your specific requirements."
    },
    {
      question: "How do I manage candidates in a project?",
      answer: "In each hiring project, you can add candidates manually or upload their CVs. You can track their status, view evaluations, and move them through different stages of your hiring process."
    },
    {
      question: "Is my data secure?",
      answer: "Yes, we use industry-standard security measures including encrypted data transmission and secure cloud storage. Your candidate data and evaluations are protected and only accessible to authorized users."
    },
    {
      question: "How do I get support if I have issues?",
      answer: "If you encounter any issues or have questions not covered here, you can contact our support team through the contact information provided in your account dashboard."
    }
  ];

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Profile</h1>
        <p className={styles.subtitle}>Manage your account settings and preferences</p>
      </div>

      <div className={styles.content}>
        {/* Profile Info Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <User size={20} />
            <h2>Profile Information</h2>
          </div>
          <div className={styles.profileInfo}>
            <div className={styles.avatar}></div>
            <div className={styles.userDetails}>
              <h3>{userName}</h3>
              <p>{userEmail}</p>
              <span className={styles.role}>{userRole}</span>
            </div>
            <button className={styles.editButton} onClick={handleEditName}>
              <Edit3 size={16} />
              Edit Name
            </button>
          </div>
        </div>

        {/* Account Settings */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Key size={20} />
            <h2>Account Settings</h2>
          </div>
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <h3>Password</h3>
              <p>Update your account password</p>
            </div>
            <button className={styles.settingButton} onClick={handleChangePassword}>
              Change Password
            </button>
          </div>
        </div>

        {/* FAQ Section */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <User size={20} />
            <h2>Frequently Asked Questions</h2>
          </div>
          <div className={styles.faqContainer}>
            {faqs.map((faq, index) => (
              <div key={index} className={styles.faqItem}>
                <button 
                  className={styles.faqQuestion}
                  onClick={() => toggleFAQ(index)}
                >
                  <span>{faq.question}</span>
                  {expandedFAQ === index ? 
                    <ChevronUp size={16} /> : 
                    <ChevronDown size={16} />
                  }
                </button>
                {expandedFAQ === index && (
                  <div className={styles.faqAnswer}>
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Cards */}
        <div className={styles.actionCards}>
          <div className={`${styles.actionCard} ${styles.dangerCard}`}>
            <LogOut size={20} />
            <div>
              <h3>Sign Out</h3>
              <p>Sign out of your account on this device</p>
            </div>
            <button 
              className={`${styles.actionButton} ${styles.dangerButton}`}
              onClick={handleLogout}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Edit Name Modal */}
      {showEditNameModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Edit Name</h3>
              <button 
                className={styles.closeButton}
                onClick={() => setShowEditNameModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpdateName}>
              <div className={styles.formGroup}>
                <label htmlFor="newName">Full Name</label>
                <input
                  id="newName"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={styles.input}
                  placeholder="Enter your full name"
                  disabled={loading}
                />
              </div>
              {error && <div className={styles.error}>{error}</div>}
              {message && <div className={styles.success}>{message}</div>}
              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  className={styles.cancelButton}
                  onClick={() => setShowEditNameModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Name'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Change Password</h3>
              <button 
                className={styles.closeButton}
                onClick={() => setShowChangePasswordModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpdatePassword}>
              <div className={styles.formGroup}>
                <label htmlFor="newPassword">New Password</label>
                <div className={styles.passwordInput}>
                  <input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={styles.input}
                    placeholder="Enter new password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className={styles.eyeButton}
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <div className={styles.passwordInput}>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={styles.input}
                    placeholder="Confirm new password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className={styles.eyeButton}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {error && <div className={styles.error}>{error}</div>}
              {message && <div className={styles.success}>{message}</div>}
              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  className={styles.cancelButton}
                  onClick={() => setShowChangePasswordModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}