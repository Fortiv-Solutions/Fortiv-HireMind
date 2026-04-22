import React, { useState, useRef, useEffect } from 'react';
import styles from './StatusDropdown.module.css';
import { ChevronDown } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { EvaluationStatus } from '../../types/database';

interface Props {
  evaluationId: string;
  currentStatus: EvaluationStatus;
}

const statusOptions: EvaluationStatus[] = ['New', 'Under Review', 'Screened', 'Shortlisted', 'Rejected'];

const statusConfig = {
  'New': { color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD' },
  'Under Review': { color: '#C2410C', bg: '#FFF7ED', border: '#FED7AA' },
  'Screened': { color: '#4338CA', bg: '#EEF2FF', border: '#C7D2FE' },
  'Shortlisted': { color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
  'Rejected': { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
};

export default function StatusDropdown({ evaluationId, currentStatus }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { updateEvaluationStatus, loadProjectDetail, activeProject } = useStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleStatusChange = async (newStatus: EvaluationStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (newStatus === currentStatus) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    
    try {
      const updates: any = { status: newStatus };
      
      // If shortlisting, also set the shortlisted flag
      if (newStatus === 'Shortlisted') {
        updates.shortlisted = true;
      }
      
      await updateEvaluationStatus(evaluationId, updates);
      
      // Reload the project to refresh the list
      if (activeProject) {
        await loadProjectDetail(activeProject.id);
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const config = statusConfig[currentStatus];

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={styles.statusButton}
        onClick={toggleDropdown}
        style={{
          backgroundColor: config.bg,
          color: config.color,
          borderColor: config.border,
        }}
        disabled={isUpdating}
      >
        <span className={styles.statusDot} style={{ backgroundColor: config.color }}></span>
        <span>{currentStatus}</span>
        <ChevronDown size={14} className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {statusOptions.map((status) => {
            const statusConf = statusConfig[status];
            const isActive = status === currentStatus;
            
            return (
              <button
                key={status}
                className={`${styles.dropdownItem} ${isActive ? styles.dropdownItemActive : ''}`}
                onClick={(e) => handleStatusChange(status, e)}
                style={{
                  backgroundColor: isActive ? statusConf.bg : 'transparent',
                }}
              >
                <span className={styles.statusDot} style={{ backgroundColor: statusConf.color }}></span>
                <span style={{ color: statusConf.color }}>{status}</span>
                {isActive && <span className={styles.checkmark}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
