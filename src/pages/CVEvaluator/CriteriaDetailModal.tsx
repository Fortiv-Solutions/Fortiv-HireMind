import { useEffect, useState } from 'react';
import styles from './CriteriaDetailModal.module.css';
import { X, Target, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import type { CvCriteriaItem, CriteriaStatus } from '../../types/database';

interface CriteriaDetailModalProps {
  isOpen: boolean;
  criteriaId: string | null;
  onClose: () => void;
  onLoadCriteria: (id: string) => Promise<{
    name: string;
    description: string;
    status: CriteriaStatus;
    items: CvCriteriaItem[];
  }>;
}

export default function CriteriaDetailModal({
  isOpen,
  criteriaId,
  onClose,
  onLoadCriteria,
}: CriteriaDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [criteria, setCriteria] = useState<{
    name: string;
    description: string;
    status: CriteriaStatus;
  } | null>(null);
  const [items, setItems] = useState<CvCriteriaItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && criteriaId) {
      loadCriteriaDetails();
    }
  }, [isOpen, criteriaId]);

  const loadCriteriaDetails = async () => {
    if (!criteriaId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await onLoadCriteria(criteriaId);
      setCriteria({
        name: data.name,
        description: data.description,
        status: data.status,
      });
      setItems(data.items);
    } catch (err: any) {
      console.error('Error loading criteria details:', err);
      setError(err.message || 'Failed to load criteria details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getCriterionTypeLabel = (type: string | null) => {
    if (!type) return 'Custom';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getCriterionTypeColor = (type: string | null) => {
    switch (type) {
      case 'skill':
        return styles.typeSkill;
      case 'experience':
        return styles.typeExperience;
      case 'education':
        return styles.typeEducation;
      default:
        return styles.typeCustom;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return styles.statusActive;
      case 'Inactive':
        return styles.statusInactive;
      case 'Archived':
        return styles.statusArchived;
      case 'Draft':
        return styles.statusDraft;
      default:
        return '';
    }
  };

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <div className={styles.iconWrapper}>
              <Target size={24} />
            </div>
            <div>
              <h2>{criteria?.name || 'Loading...'}</h2>
              {criteria && (
                <span className={`${styles.statusBadge} ${getStatusColor(criteria.status)}`}>
                  {criteria.status}
                </span>
              )}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading criteria details...</p>
            </div>
          ) : error ? (
            <div className={styles.error}>
              <AlertCircle size={48} />
              <p>{error}</p>
              <button className={styles.retryBtn} onClick={loadCriteriaDetails}>
                Try Again
              </button>
            </div>
          ) : criteria ? (
            <>
              {/* Description Section */}
              <div className={styles.section}>
                <h3>Description</h3>
                <p className={styles.description}>
                  {criteria.description || 'No description provided'}
                </p>
              </div>

              {/* Metadata Section */}
              <div className={styles.metadataGrid}>
                <div className={styles.metadataItem}>
                  <CheckCircle size={16} />
                  <div>
                    <span className={styles.metadataLabel}>Total Criteria</span>
                    <span className={styles.metadataValue}>{items.length}</span>
                  </div>
                </div>
                <div className={styles.metadataItem}>
                  <TrendingUp size={16} />
                  <div>
                    <span className={styles.metadataLabel}>Total Weight</span>
                    <span className={styles.metadataValue}>{totalWeight}</span>
                  </div>
                </div>
              </div>

              {/* Criteria Items Section */}
              <div className={styles.section}>
                <h3>Evaluation Criteria ({items.length})</h3>
                {items.length === 0 ? (
                  <div className={styles.emptyState}>
                    <Target size={48} />
                    <p>No criteria items defined yet</p>
                  </div>
                ) : (
                  <div className={styles.criteriaList}>
                    {items.map((item, index) => (
                      <div key={item.id} className={styles.criteriaItem}>
                        <div className={styles.criteriaItemHeader}>
                          <div className={styles.criteriaItemTitle}>
                            <span className={styles.criteriaNumber}>{index + 1}</span>
                            <h4>{item.criterion_name}</h4>
                          </div>
                          <div className={styles.criteriaItemMeta}>
                            <span className={`${styles.typeBadge} ${getCriterionTypeColor(item.criterion_type)}`}>
                              {getCriterionTypeLabel(item.criterion_type)}
                            </span>
                            <span className={styles.weightBadge}>
                              Weight: {item.weight}
                            </span>
                          </div>
                        </div>
                        {item.criterion_description && (
                          <p className={styles.criteriaItemDescription}>
                            {item.criterion_description}
                          </p>
                        )}
                        {item.expected_value && (
                          <div className={styles.expectedValue}>
                            <span className={styles.expectedValueLabel}>Expected:</span>
                            <span className={styles.expectedValueText}>{item.expected_value}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
