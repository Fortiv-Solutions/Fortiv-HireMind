import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Layout.module.css';
import { LayoutDashboard, Briefcase, FileCheck2, BarChart2, HelpCircle, LogOut, Plus, Search, Bell, Settings } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          Fortiv<span>HireMind</span>
        </div>

        <div className={styles.userProfile}>
          <div className={styles.userAvatar}>RH</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>Recruitment Hub</span>
            <span className={styles.userMeta}>Intelligence Suite</span>
          </div>
        </div>

        <button className={styles.newOpeningBtn}>
          <Plus size={16} /> New Opening
        </button>

        <nav className={styles.nav}>
          <NavLink to="/dashboard-home" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
            <LayoutDashboard size={18} className={styles.icon} /> Dashboard
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
            <Briefcase size={18} className={styles.icon} /> Hiring Projects
          </NavLink>
          <NavLink to="/cv-evaluator" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
            <FileCheck2 size={18} className={styles.icon} /> CV Evaluator
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
            <BarChart2 size={18} className={styles.icon} /> Analytics
          </NavLink>
        </nav>

        <div className={styles.sidebarFooter}>
          <NavLink to="/help" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
            <HelpCircle size={18} /> Help Center
          </NavLink>
          <NavLink to="/login" className={styles.navItem}>
            <LogOut size={18} /> Log Out
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
