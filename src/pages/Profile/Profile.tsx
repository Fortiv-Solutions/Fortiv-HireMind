import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Profile.module.css';
import { User, Settings, LogOut, Bell, Shield, Key, Palette, Globe, HelpCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useStore();

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
            <button className={styles.editButton}>Edit Profile</button>
          </div>
        </div>

        {/* Settings Grid */}
        <div className={styles.settingsGrid}>
          <div className={styles.settingCard}>
            <div className={styles.settingIcon}>
              <Settings size={24} />
            </div>
            <div className={styles.settingContent}>
              <h3>General Settings</h3>
              <p>Update your personal information and preferences</p>
            </div>
            <button className={styles.settingButton}>Configure</button>
          </div>

          <div className={styles.settingCard}>
            <div className={styles.settingIcon}>
              <Bell size={24} />
            </div>
            <div className={styles.settingContent}>
              <h3>Notifications</h3>
              <p>Manage email and push notification preferences</p>
            </div>
            <button className={styles.settingButton}>Configure</button>
          </div>

          <div className={styles.settingCard}>
            <div className={styles.settingIcon}>
              <Shield size={24} />
            </div>
            <div className={styles.settingContent}>
              <h3>Privacy & Security</h3>
              <p>Control your privacy settings and security options</p>
            </div>
            <button className={styles.settingButton}>Configure</button>
          </div>

          <div className={styles.settingCard}>
            <div className={styles.settingIcon}>
              <Key size={24} />
            </div>
            <div className={styles.settingContent}>
              <h3>Password & Authentication</h3>
              <p>Update your password and two-factor authentication</p>
            </div>
            <button className={styles.settingButton}>Configure</button>
          </div>

          <div className={styles.settingCard}>
            <div className={styles.settingIcon}>
              <Palette size={24} />
            </div>
            <div className={styles.settingContent}>
              <h3>Appearance</h3>
              <p>Customize theme, layout, and display preferences</p>
            </div>
            <button className={styles.settingButton}>Configure</button>
          </div>

          <div className={styles.settingCard}>
            <div className={styles.settingIcon}>
              <Globe size={24} />
            </div>
            <div className={styles.settingContent}>
              <h3>Language & Region</h3>
              <p>Set your language, timezone, and regional preferences</p>
            </div>
            <button className={styles.settingButton}>Configure</button>
          </div>
        </div>

        {/* Action Cards */}
        <div className={styles.actionCards}>
          <div className={styles.actionCard}>
            <HelpCircle size={20} />
            <div>
              <h3>Help & Support</h3>
              <p>Get help with your account or report issues</p>
            </div>
            <button className={styles.actionButton}>Get Help</button>
          </div>

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
    </div>
  );
}