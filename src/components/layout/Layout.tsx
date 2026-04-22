import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Layout.module.css';
import { LayoutDashboard, Briefcase, FileCheck2, BarChart2, HelpCircle, LogOut, Plus, Search, Bell, Settings, BrainCircuit } from 'lucide-react';

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

        {/* New Opening Button */}
        <div className={styles.actionSection}>
          <button className={styles.newOpeningBtn}>
            <Plus size={16} strokeWidth={2.5} />
            <span>New Opening</span>
          </button>
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
            <NavLink to="/analytics" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
              <BarChart2 size={18} className={styles.icon} strokeWidth={2} />
              <span>Analytics</span>
            </NavLink>
          </div>
        </nav>

        {/* Footer */}
        <div className={styles.sidebarFooter}>
          <NavLink to="/help" className={({ isActive }) => isActive ? `${styles.footerItem} ${styles.footerItemActive}` : styles.footerItem}>
            <HelpCircle size={18} strokeWidth={2} />
            <span>Help Center</span>
          </NavLink>
          <NavLink to="/login" className={styles.footerItem}>
            <LogOut size={18} strokeWidth={2} />
            <span>Log Out</span>
          </NavLink>
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
              <Settings size={20} />
              <div className={styles.topUserAvatar}></div>
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
