import React, { useState } from 'react';
import styles from './CreateCriteriaModal.module.css';
import { X, Plus, Trash2, Save } from 'lucide-react';
import type { CriteriaStatus, CriterionType } from '../../types/database';

interface CriteriaItem {
  id: string;
  criterion_name: string;
  criterion_description: string;
  weight: number;
  criterion_type: CriterionType;
  expected_value: string;
}

interface CreateCriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    status: CriteriaStatus;
    items: Omit<CriteriaItem, 'id'>[];
  }) => Promise<void>;
}

export default function CreateCriteriaModal({
  isOpen,
  onClose,
  onSave,
}: CreateCriteriaModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<CriteriaStatus>('Active');
  const [items, setItems] = useState<CriteriaItem[]>([
    {
      id: '1',
      criterion_name: '',
      criterion_description: '',
      weight: 1.0,
      criterion_type: 'skill',
      expected_value: '',
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddItem = () => {
    const newItem: CriteriaItem = {
      id: Date.now().toString(),
      criterion_name: '',
      criterion_description: '',
      weight: 1.0,
      criterion_type: 'skill',
      expected_value: '',
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) {
      setError('At least one criterion is required');
      return;
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

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        status,
        items: validItems.map(({ id, ...item }) => item),
      });
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create criteria');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setStatus('Active');
    setItems([
      {
        id: '1',
        criterion_name: '',
        criterion_description: '',
        weight: 1.0,
        criterion_type: 'skill',
        expected_value: '',
      },
    ]);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2>Create CV Evaluation Criteria</h2>
            <p className={styles.subtitle}>
              Define reusable criteria to evaluate candidates consistently
            </p>
          </div>
          <button className={styles.closeBtn} onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

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
                    <span className={styles.itemNumber}>#{index + 1}</span>
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
                  Create Criteria
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
