import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import styles from './Layout.module.css';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fullName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split('@')[0] ??
    'User';
  const firstName = fullName.split(' ')[0];
  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    navigate('/login');
  };

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

        {/* Profile dropdown */}
        <div className={styles.actions}>
          <div className={styles.profileWrap} ref={dropdownRef}>
            <button
              className={styles.profileTrigger}
              onClick={() => setDropdownOpen((o) => !o)}
              aria-expanded={dropdownOpen}
            >
              <div className={styles.profileAvatar}>{initials}</div>
              <span className={styles.profileName}>{firstName}</span>
              <ChevronDown size={14} className={`${styles.chevron} ${dropdownOpen ? styles.chevronOpen : ''}`} />
            </button>

            {dropdownOpen && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownHeader}>
                  <div className={styles.dropdownAvatar}>{initials}</div>
                  <div className={styles.dropdownUserInfo}>
                    <span className={styles.dropdownName}>{fullName}</span>
                    <span className={styles.dropdownEmail}>{user?.email ?? ''}</span>
                  </div>
                </div>
                <div className={styles.dropdownDivider} />
                <button
                  className={styles.dropdownItem}
                  onClick={() => { setDropdownOpen(false); navigate('/profile'); }}
                >
                  <User size={15} />
                  Profile
                </button>
                <div className={styles.dropdownDivider} />
                <button
                  className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                  onClick={handleSignOut}
                >
                  <LogOut size={15} />
                  Log Out
                </button>
              </div>
            )}
          </div>
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
