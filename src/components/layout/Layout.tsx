import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Layout.module.css';
import { LayoutDashboard, Briefcase, FileCheck2, Search, Bell, BrainCircuit, Target, Users, ChevronRight } from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const { user } = useStore();

  const userName = user?.user_metadata?.full_name
                ?? user?.user_metadata?.name
                ?? user?.email?.split('@')[0]
                ?? 'User';
  const userEmail = user?.email ?? '';
  const initials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

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
            <NavLink to="/dashboard-home" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
              <LayoutDashboard size={18} className={styles.icon} strokeWidth={2} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
              <Briefcase size={18} className={styles.icon} strokeWidth={2} />
              <span>Hiring Projects</span>
            </NavLink>
            <NavLink to="/candidates" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
              <Users size={18} className={styles.icon} strokeWidth={2} />
              <span>Candidates</span>
            </NavLink>
            <NavLink to="/cv-evaluator" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
              <FileCheck2 size={18} className={styles.icon} strokeWidth={2} />
              <span>CV Evaluator</span>
            </NavLink>
            <NavLink to="/evaluation-criteria" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
              <Target size={18} className={styles.icon} strokeWidth={2} />
              <span>Evaluation Criteria</span>
            </NavLink>
          </div>
        </nav>

        {/* Footer */}
        <div className={styles.sidebarFooter}>
          <div className={styles.profileSection}>
            <NavLink to="/profile" className={({ isActive }) => isActive ? `${styles.profileItem} ${styles.profileItemActive}` : styles.profileItem}>
              <div className={styles.profileAvatar}>
                <span style={{ fontSize: '12px', fontWeight: 700 }}>{initials}</span>
              </div>
              <div className={styles.profileInfo}>
                <span className={styles.profileName}>{userName}</span>
                <span className={styles.profileSubtext}>{userEmail}</span>
              </div>
              <ChevronRight size={14} className={styles.profileIcon} />
            </NavLink>
          </div>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarRight}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={15} className={styles.searchIcon} style={{ position: 'absolute', left: '14px', pointerEvents: 'none', color: 'var(--color-text-tertiary)' }} />
              <input type="text" placeholder="Search…" className={styles.searchBar} aria-label="Search" />
            </div>
            <div className={styles.iconGrp}>
              <Bell size={18} aria-label="Notifications" />
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
