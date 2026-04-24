import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Layout.module.css';
import { FcPortraitMode } from 'react-icons/fc';

export default function Layout({ children }: { children: React.ReactNode }) {

  return (
    <div className={styles.container}>
      <header className={styles.topnav}>
        {/* Brand Logo */}
        <div className={styles.logoBox} style={{ border: 'none', padding: '8px 16px', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ color: '#a6192e', fontWeight: 900, fontSize: '24px', letterSpacing: '-0.02em', fontFamily: 'Arial, sans-serif' }}>UK</span>
            <span style={{ color: '#3a3b3c', fontWeight: 700, fontSize: '24px', letterSpacing: '0.05em', fontFamily: 'Arial, sans-serif', marginLeft: '4px' }}>REALTY</span>
          </div>
        </div>

        {/* Navigation Pills */}
        <nav className={styles.nav}>
          <NavLink to="/dashboard-home" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
            Dashboard
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
            Hiring
          </NavLink>
          <NavLink to="/candidates" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
            Candidates
          </NavLink>
          <NavLink to="/cv-evaluator" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
            Evaluator
          </NavLink>
          <NavLink to="/evaluation-criteria" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
            Criteria
          </NavLink>
        </nav>

        {/* Actions */}
        <div className={styles.actions}>
          <a href="/profile" className={styles.profileAvatar} title="Profile">
            <FcPortraitMode size={26} />
          </a>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
