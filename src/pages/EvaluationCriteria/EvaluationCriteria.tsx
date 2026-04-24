import { useState, useEffect } from 'react';
import styles from './EvaluationCriteria.module.css';
import {
  Plus, Edit2, Trash2, Copy, Eye, Target, Clock, Sparkles,
} from 'lucide-react';
import {
  fetchCriteriaWithStats,
  deleteCriteriaSet,
  duplicateCriteriaSet,
  updateCriteriaSet,
  createCriteriaSetWithItems,
  fetchCriteriaWithItems,
  updateCriteriaSetWithItems,
} from '../../services/cvEvaluation';
import type { CriteriaWithStats } from '../../types/database';
import CreateCriteriaModal from '../CVEvaluator/CreateCriteriaModal';
import EditCriteriaModal from '../CVEvaluator/EditCriteriaModal';
import CriteriaDetailModal from '../CVEvaluator/CriteriaDetailModal';
import SelectCriteriaMethodModal from '../CVEvaluator/SelectCriteriaMethodModal';
import type { GeneratedCriteria } from '../../services/aiCriteriaGenerator';

export default function EvaluationCriteria() {
  const [criteriaList, setCriteriaList] = useState<CriteriaWithStats[]>([]);
  const [criteriaFilter, setCriteriaFilter] = useState<'Active' | 'Inactive' | 'Archived' | 'Draft'>('Active');
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCriteriaId, setEditingCriteriaId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailCriteriaId, setDetailCriteriaId] = useState<string | null>(null);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [prefilledCriteria, setPrefilledCriteria] = useState<GeneratedCriteria | null>(null);

  useEffect(() => {
    loadCriteria();
  }, []);

  const loadCriteria = async () => {
    setLoadingCriteria(true);
    try {
      const data = await fetchCriteriaWithStats();
      setCriteriaList(data);
    } catch (err) {
      console.error('Error loading criteria:', err);
      setError('Failed to load evaluation criteria');
    } finally {
      setLoadingCriteria(false);
    }
  };

  const handleDeleteCriteria = async (id: string) => {
    if (!confirm('Are you sure you want to delete this criteria set?')) return;
    try {
      await deleteCriteriaSet(id);
      await loadCriteria();
    } catch (err: any) {
      const message = err?.message || 'Failed to delete criteria set';
      if (
        message.includes('referenced') ||
        message.includes('evaluations') ||
        message.includes('Archive')
      ) {
        const shouldArchive = confirm(`${message}\n\nWould you like to archive it instead?`);
        if (shouldArchive) await handleArchiveCriteria(id);
      } else {
        setError(message);
      }
    }
  };

  const handleDuplicateCriteria = async (id: string) => {
    try {
      await duplicateCriteriaSet(id);
      await loadCriteria();
    } catch (err) {
      setError('Failed to duplicate criteria set');
    }
  };

  const handleArchiveCriteria = async (id: string) => {
    try {
      await updateCriteriaSet(id, { status: 'Archived' });
      await loadCriteria();
    } catch (err) {
      setError('Failed to archive criteria set');
    }
  };

  const handleCreateCriteria = async (data: {
    name: string;
    description: string;
    status: 'Active' | 'Inactive' | 'Draft' | 'Archived';
    items: Array<{
      criterion_name: string;
      criterion_description: string;
      weight: number;
      criterion_type: 'skill' | 'experience' | 'education' | 'custom';
      expected_value: string;
    }>;
  }) => {
    try {
      await createCriteriaSetWithItems(
        { name: data.name, description: data.description, status: data.status },
        data.items
      );
      await loadCriteria();
      setShowCreateModal(false);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create criteria set');
    }
  };

  const handleEditCriteria = (id: string) => {
    setEditingCriteriaId(id);
    setShowEditModal(true);
  };

  const handleGenerateDone = (generated: GeneratedCriteria) => {
    setPrefilledCriteria(generated);
    setShowCreateModal(true);
  };

  const handleUpdateCriteria = async (
    criteriaId: string,
    data: {
      name: string;
      description: string;
      status: 'Active' | 'Inactive' | 'Draft' | 'Archived';
      itemsToAdd: Array<{
        criterion_name: string;
        criterion_description: string;
        weight: number;
        criterion_type: 'skill' | 'experience' | 'education' | 'custom';
        expected_value: string;
      }>;
      itemsToUpdate: Array<{
        id: string;
        criterion_name?: string;
        criterion_description?: string;
        weight?: number;
        criterion_type?: 'skill' | 'experience' | 'education' | 'custom';
        expected_value?: string;
      }>;
      itemsToDelete: string[];
    }
  ) => {
    try {
      await updateCriteriaSetWithItems(
        criteriaId,
        { name: data.name, description: data.description, status: data.status },
        data.itemsToAdd,
        data.itemsToUpdate,
        data.itemsToDelete
      );
      await loadCriteria();
      setShowEditModal(false);
      setEditingCriteriaId(null);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update criteria set');
    }
  };

  const handleLoadCriteriaForEdit = async (id: string) => {
    return await fetchCriteriaWithItems(id);
  };

  const handleViewCriteriaDetail = (id: string) => {
    setDetailCriteriaId(id);
    setShowDetailModal(true);
  };

  const filteredCriteria = criteriaList.filter(c => c.status === criteriaFilter);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <span className={styles.breadcrumbLink}>Dashboard</span>
          <span className={styles.breadcrumbSep}>›</span>
          <span className={styles.breadcrumbCurrent}>Evaluation Criteria</span>
        </div>
        <div>
          <h1>Evaluation Criteria</h1>
          <p className={styles.subtitle}>
            Define and manage your CV evaluation criteria sets. Reuse them across roles for consistent, unbiased scoring.
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <button onClick={() => setError(null)} className={styles.closeError}>×</button>
        </div>
      )}

      {/* Modals */}
      <SelectCriteriaMethodModal
        isOpen={showMethodModal}
        onClose={() => setShowMethodModal(false)}
        onSelectManual={() => {
          setPrefilledCriteria(null);
          setShowCreateModal(true);
        }}
        onGenerateDone={handleGenerateDone}
      />

      <CreateCriteriaModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setPrefilledCriteria(null); }}
        onSave={handleCreateCriteria}
        prefilled={prefilledCriteria}
      />

      <EditCriteriaModal
        isOpen={showEditModal}
        criteriaId={editingCriteriaId}
        onClose={() => { setShowEditModal(false); setEditingCriteriaId(null); }}
        onSave={handleUpdateCriteria}
        onLoadCriteria={handleLoadCriteriaForEdit}
      />

      <CriteriaDetailModal
        isOpen={showDetailModal}
        criteriaId={detailCriteriaId}
        onClose={() => { setShowDetailModal(false); setDetailCriteriaId(null); }}
        onLoadCriteria={handleLoadCriteriaForEdit}
      />

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.criteriaFilters}>
          {(['Active', 'Inactive', 'Draft', 'Archived'] as const).map((status) => (
            <button
              key={status}
              className={criteriaFilter === status ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setCriteriaFilter(status)}
            >
              {status} ({criteriaList.filter(c => c.status === status).length})
            </button>
          ))}
        </div>

        <button className={styles.newCriteriaBtn} onClick={() => setShowMethodModal(true)}>
          <Plus size={18} />
          New Criteria Set
        </button>
      </div>

      {/* Grid */}
      {loadingCriteria ? (
        <div className={styles.loading}>Loading criteria...</div>
      ) : (
        <div className={styles.criteriaGrid}>
          {filteredCriteria.length === 0 ? (
            <div className={styles.emptyCriteria}>
              <Target size={64} className={styles.emptyIcon} />
              <h3>No {criteriaFilter.toLowerCase()} criteria</h3>
              <p>Create your first evaluation criteria set to get started.</p>
              <button className={styles.createFirstBtn} onClick={() => setShowMethodModal(true)}>
                <Plus size={18} />
                Create First Criteria
              </button>
            </div>
          ) : (
            filteredCriteria.map((criteria) => (
              <div
                key={criteria.id}
                className={styles.criteriaCard}
                onClick={() => handleViewCriteriaDetail(criteria.id)}
              >
                <div className={styles.criteriaCardHeader}>
                  <h3>{criteria.name}</h3>
                  <div className={styles.criteriaActions}>
                    <button
                      className={styles.iconBtn}
                      title="View"
                      onClick={(e) => { e.stopPropagation(); handleViewCriteriaDetail(criteria.id); }}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className={styles.iconBtn}
                      title="Duplicate"
                      onClick={(e) => { e.stopPropagation(); handleDuplicateCriteria(criteria.id); }}
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      className={styles.iconBtn}
                      title="Edit"
                      onClick={(e) => { e.stopPropagation(); handleEditCriteria(criteria.id); }}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className={styles.iconBtn}
                      title="Delete"
                      onClick={(e) => { e.stopPropagation(); handleDeleteCriteria(criteria.id); }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <p className={styles.criteriaDescription}>
                  {criteria.description || 'No description'}
                </p>

                <div className={styles.criteriaStats}>
                  <div className={styles.criteriaStat}>
                    <span className={styles.statValue}>{criteria.criteriaCount}</span>
                    <span className={styles.statLabel}>Criteria</span>
                  </div>
                  <div className={styles.criteriaStat}>
                    <span className={styles.statValue}>{criteria.projectsUsed}</span>
                    <span className={styles.statLabel}>Projects</span>
                  </div>
                </div>

                <div className={styles.criteriaFooter}>
                  <span className={`${styles.statusBadge} ${styles[`status${criteria.status}`]}`}>
                    {criteria.status}
                  </span>
                  <span className={styles.criteriaDate}>
                    <Clock size={13} />
                    {new Date(criteria.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <button
                  className={styles.evaluateCriteriaBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `/cv-evaluator?criteriaId=${criteria.id}`;
                  }}
                >
                  <Sparkles size={15} />
                  Evaluate CV with this Criteria
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
