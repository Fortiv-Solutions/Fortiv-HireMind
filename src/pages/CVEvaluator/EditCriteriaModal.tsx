import React, { useState, useEffect } from 'react';
import styles from './CreateCriteriaModal.module.css';
import { X, Plus, Trash2, Save } from 'lucide-react';
import type { CriteriaStatus, CriterionType, CvCriteriaItem } from '../../types/database';

interface CriteriaItem {
  id: string;
  criterion_name: string;
  criterion_description: string;
  weight: number;
  criterion_type: CriterionType;
  expected_value: string;
  isExisting?: boolean; // Track if this is an existing item or new
}

interface EditCriteriaModalProps {
  isOpen: boolean;
  criteriaId: string | null;
  onClose: () => void;
  onSave: (
    criteriaId: string,
    data: {
      name: string;
      description: string;
      status: CriteriaStatus;
      itemsToAdd: Omit<CriteriaItem, 'id' | 'isExisting'>[];
      itemsToUpdate: Array<{ id: string } & Partial<Omit<CriteriaItem, 'id' | 'isExisting'>>>;
      itemsToDelete: string[];
    }
  ) => Promise<void>;
  onLoadCriteria: (id: string) => Promise<{
    name: string;
    description: string;
    status: CriteriaStatus;
    items: CvCriteriaItem[];
  }>;
}

export default function EditCriteriaModal({
  isOpen,
  criteriaId,
  onClose,
  onSave,
  onLoadCriteria,
}: EditCriteriaModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<CriteriaStatus>('Active');
  const [items, setItems] = useState<CriteriaItem[]>([]);
  const [originalItems, setOriginalItems] = useState<CriteriaItem[]>([]);
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load criteria data when modal opens
  useEffect(() => {
    if (isOpen && criteriaId) {
      loadCriteriaData();
    }
  }, [isOpen, criteriaId]);

  const loadCriteriaData = async () => {
    if (!criteriaId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await onLoadCriteria(criteriaId);
      setName(data.name);
      setDescription(data.description || '');
      setStatus(data.status);

      const loadedItems: CriteriaItem[] = data.items.map((item) => ({
        id: item.id,
        criterion_name: item.criterion_name,
        criterion_description: item.criterion_description || '',
        weight: item.weight,
        criterion_type: item.criterion_type || 'skill',
        expected_value: item.expected_value || '',
        isExisting: true,
      }));

      setItems(loadedItems);
      setOriginalItems(JSON.parse(JSON.stringify(loadedItems))); // Deep copy
      setDeletedItemIds([]);
    } catch (err: any) {
      console.error('Error loading criteria:', err);
      setError(err.message || 'Failed to load criteria');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    const newItem: CriteriaItem = {
      id: `new_${Date.now()}`,
      criterion_name: '',
      criterion_description: '',
      weight: 1.0,
      criterion_type: 'skill',
      expected_value: '',
      isExisting: false,
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) {
      setError('At least one criterion is required');
      return;
    }

    const item = items.find((i) => i.id === id);
    if (item?.isExisting) {
      // Mark existing item for deletion
      setDeletedItemIds([...deletedItemIds, id]);
    }

    setItems(items.filter((item) => item.id !== id));
  };

  const handleItemChange = (
    id: string,
    field: keyof CriteriaItem,
    value: string | number
  ) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Criteria name is required');
      return;
    }

    const validItems = items.filter((item) => item.criterion_name.trim());
    if (validItems.length === 0) {
      setError('At least one criterion with a name is required');
      return;
    }

    // Check if weights sum to reasonable value
    const totalWeight = validItems.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight === 0) {
      setError('Total weight must be greater than 0');
      return;
    }

    if (!criteriaId) {
      setError('Criteria ID is missing');
      return;
    }

    setSaving(true);
    try {
      // Separate items into add, update, and delete
      const itemsToAdd = validItems
        .filter((item) => !item.isExisting)
        .map(({ id, isExisting, ...item }) => item);

      const itemsToUpdate = validItems
        .filter((item) => item.isExisting)
        .map((item) => {
          const original = originalItems.find((o) => o.id === item.id);
          if (!original) return null;

          // Check if anything changed
          const hasChanges =
            item.criterion_name !== original.criterion_name ||
            item.criterion_description !== original.criterion_description ||
            item.weight !== original.weight ||
            item.criterion_type !== original.criterion_type ||
            item.expected_value !== original.expected_value;

          if (!hasChanges) return null;

          return {
            id: item.id,
            criterion_name: item.criterion_name,
            criterion_description: item.criterion_description,
            weight: item.weight,
            criterion_type: item.criterion_type,
            expected_value: item.expected_value,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      await onSave(criteriaId, {
        name: name.trim(),
        description: description.trim(),
        status,
        itemsToAdd,
        itemsToUpdate,
        itemsToDelete: deletedItemIds,
      });

      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update criteria');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setStatus('Active');
    setItems([]);
    setOriginalItems([]);
    setDeletedItemIds([]);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2>Edit CV Evaluation Criteria</h2>
            <p className={styles.subtitle}>
              Update criteria to refine your evaluation process
            </p>
          </div>
          <button className={styles.closeBtn} onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Loading criteria...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <div className={styles.error}>
                <span>{error}</span>
              </div>
            )}

            {/* Basic Info */}
            <div className={styles.section}>
              <h3>Basic Information</h3>

              <div className={styles.formGroup}>
                <label htmlFor="criteria-name">
                  Criteria Name <span className={styles.required}>*</span>
                </label>
                <input
                  id="criteria-name"
                  type="text"
                  className={styles.input}
                  placeholder="e.g., Senior Software Engineer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="criteria-description">Description</label>
                <textarea
                  id="criteria-description"
                  className={styles.textarea}
                  placeholder="Describe what this criteria set is used for..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="criteria-status">Status</label>
                <select
                  id="criteria-status"
                  className={styles.select}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CriteriaStatus)}
                >
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
            </div>

            {/* Criteria Items */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Evaluation Criteria</h3>
                <button
                  type="button"
                  className={styles.addItemBtn}
                  onClick={handleAddItem}
                >
                  <Plus size={16} />
                  Add Criterion
                </button>
              </div>

              <div className={styles.itemsList}>
                {items.map((item, index) => (
                  <div key={item.id} className={styles.criteriaItem}>
                    <div className={styles.itemHeader}>
                      <span className={styles.itemNumber}>
                        #{index + 1}
                        {item.isExisting && (
                          <span className={styles.existingBadge}>Existing</span>
                        )}
                        {!item.isExisting && (
                          <span className={styles.newBadge}>New</span>
                        )}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          className={styles.removeItemBtn}
                          onClick={() => handleRemoveItem(item.id)}
                          title="Remove criterion"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className={styles.itemGrid}>
                      <div className={styles.formGroup}>
                        <label>
                          Criterion Name <span className={styles.required}>*</span>
                        </label>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="e.g., React Experience"
                          value={item.criterion_name}
                          onChange={(e) =>
                            handleItemChange(item.id, 'criterion_name', e.target.value)
                          }
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label>Type</label>
                        <select
                          className={styles.select}
                          value={item.criterion_type}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              'criterion_type',
                              e.target.value as CriterionType
                            )
                          }
                        >
                          <option value="skill">Skill</option>
                          <option value="experience">Experience</option>
                          <option value="education">Education</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Weight (0-1)</label>
                        <input
                          type="number"
                          className={styles.input}
                          min="0"
                          max="1"
                          step="0.1"
                          value={item.weight}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              'weight',
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label>Expected Value</label>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="e.g., 3+ years, Bachelor's degree"
                          value={item.expected_value}
                          onChange={(e) =>
                            handleItemChange(item.id, 'expected_value', e.target.value)
                          }
                        />
                      </div>

                      <div className={styles.formGroupFull}>
                        <label>Description</label>
                        <textarea
                          className={styles.textarea}
                          placeholder="Describe what you're looking for..."
                          value={item.criterion_description}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              'criterion_description',
                              e.target.value
                            )
                          }
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={handleClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={saving}
              >
                {saving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save size={16} />
                    Update Criteria
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
