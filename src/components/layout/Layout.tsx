import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Layout.module.css';
import { LayoutDashboard, Briefcase, FileCheck2, Search, Bell, BrainCircuit, User } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      setScrolled(target.scrollTop > 10);
    };

    const navElement = document.querySelector(`.${styles.nav}`);
    navElement?.addEventListener('scroll', handleScroll);

    return () => navElement?.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        {/* Brand Header with Logo */}
        <div className={styles.sidebarHeader}>
          <div className={styles.logoBox}>
            <BrainCircuit size={20} strokeWidth={2} />
          </div>
          <div className={styles.wordmark}>
            <span className={styles.fortiv}>Fortiv</span>
            <span className={styles.hiremind}>HireMind</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
          <div className={styles.navSection}>
            <span className={styles.navLabel}>Main</span>
            <NavLink to="/dashboard-home" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
              <LayoutDashboard size={18} className={styles.icon} strokeWidth={2} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
              <Briefcase size={18} className={styles.icon} strokeWidth={2} />
              <span>Hiring Projects</span>
            </NavLink>
            <NavLink to="/cv-evaluator" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
              <FileCheck2 size={18} className={styles.icon} strokeWidth={2} />
              <span>CV Evaluator</span>
            </NavLink>
          </div>
        </nav>

        {/* Footer */}
        <div className={styles.sidebarFooter}>
          <div className={styles.profileSection}>
            <NavLink to="/profile" className={({ isActive }) => isActive ? `${styles.profileItem} ${styles.profileItemActive}` : styles.profileItem}>
              <div className={styles.profileAvatar}>
                <User size={18} strokeWidth={2.5} />
              </div>
              <div className={styles.profileInfo}>
                <span className={styles.profileName}>Profile</span>
                <span className={styles.profileSubtext}>Account & Settings</span>
              </div>
              <User size={16} strokeWidth={2} className={styles.profileIcon} />
            </NavLink>
          </div>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            HireMind
          </div>
          <div className={styles.topbarRight}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#9CA3AF' }} />
              <input type="text" placeholder="Search..." className={styles.searchBar} />
            </div>
            <div className={styles.iconGrp}>
              <Bell size={20} />
            </div>
          </div>
        </header>
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}
