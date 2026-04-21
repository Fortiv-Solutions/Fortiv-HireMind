import React, { useEffect, useState } from 'react';
import styles from './CVEvaluator.module.css';
import { Settings, Plus, GripVertical, Trash2, Lightbulb, Loader2, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';

interface Criterion {
  id: string;
  title: string;
  description: string;
  weight: number;
  importance: 'critical' | 'high' | 'medium' | 'low';
  keywords: string;
}

const importanceColors: Record<string, string> = {
  critical: 'badgeRed',
  high: 'badgeBlue',
  medium: 'badgePurple',
  low: 'badgeGray',
};
const importanceLabels: Record<string, string> = {
  critical: 'MUST HAVE',
  high: 'EXPECTED',
  medium: 'BONUS',
  low: 'OPTIONAL',
};

export default function CVEvaluator() {
  const { projects, projectsLoading, loadProjects } = useStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // When project changes, populate criteria from required_skills
  useEffect(() => {
    if (!selectedProjectId) return;
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return;

    const skills = project.required_skills ?? [];
    setCriteria(
      skills.map((skill, i) => ({
        id: `skill-${i}`,
        title: skill,
        description: `Evaluate candidate proficiency in ${skill}.`,
        weight: Math.floor(100 / Math.max(skills.length, 1)),
        importance: i === 0 ? 'critical' : i === 1 ? 'high' : 'medium',
        keywords: skill,
      }))
    );
  }, [selectedProjectId, projects]);

  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  function addCriterion() {
    setCriteria((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        title: 'New Criterion',
        description: 'Describe what to evaluate.',
        weight: 10,
        importance: 'medium',
        keywords: '',
      },
    ]);
  }

  function removeCriterion(id: string) {
    setCriteria((prev) => prev.filter((c) => c.id !== id));
  }

  function updateCriterion(id: string, field: keyof Criterion, value: any) {
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }

  async function saveFramework() {
    if (!selectedProjectId) return;
    setSaving(true);
    try {
      const skills = criteria.map((c) => c.title);
      const { error } = await supabase
        .from('hiring_projects')
        .update({ required_skills: skills, updated_at: new Date().toISOString() })
        .eq('id', selectedProjectId);
      if (error) throw error;
      await loadProjects();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const dotColors = ['dotRed', 'dotBlue', 'dotPurple', 'dotOrange', 'dotGreen'];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.breadcrumbs}>
          <span>CV Evaluator</span>
          {selectedProject && <> › <strong>{selectedProject.title}</strong></>}
        </div>

        <div className={styles.titleRow}>
          <div>
            <h1>Evaluation Framework</h1>
            <p className={styles.subtitle}>
              Select a hiring project, define criteria, and save. These skills drive the automated CV scoring.
            </p>
          </div>
          <div className={styles.actionBtns}>
            <button
              className={styles.primaryBtn}
              disabled={!selectedProjectId || saving}
              onClick={saveFramework}
            >
              {saving ? <Loader2 size={16} className={styles.spinner} /> : saved ? <><Check size={16} /> Saved!</> : 'Save Framework'}
            </button>
          </div>
        </div>
      </div>

      {/* Project Selector */}
      <div className={styles.projectSelectorCard}>
        <label className={styles.selectorLabel}>Select Hiring Project</label>
        {projectsLoading ? (
          <div className={styles.loadingRow}><Loader2 size={20} className={styles.spinner} /> Loading projects…</div>
        ) : (
          <select
            className={styles.projectSelect}
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            <option value="">— Choose a project —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} {p.department ? `· ${p.department}` : ''} ({p.status})
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedProjectId && (
        <div className={styles.mainLayout}>
          <div className={styles.builderArea}>
            {/* Project Parameters — read from DB */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}><Settings size={18} /> Project Parameters</h3>
              <div className={styles.formRow}>
                <div className={styles.inputGroup}>
                  <label>Project Title</label>
                  <input type="text" value={selectedProject?.title ?? ''} readOnly className={styles.readOnly} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Department</label>
                  <input type="text" value={selectedProject?.department ?? '—'} readOnly className={styles.readOnly} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Experience Required</label>
                  <input type="text" value={selectedProject ? `${selectedProject.required_experience_years}+ years` : ''} readOnly className={styles.readOnly} />
                </div>
              </div>
            </div>

            <div className={styles.criteriaHeader}>
              <div>
                <h3>Skill Criteria</h3>
                <p>Each criterion maps to a required skill. Weight must total 100%.</p>
              </div>
              <button className={styles.addBtn} onClick={addCriterion}>
                <Plus size={16} /> Add Criterion
              </button>
            </div>

            <div className={styles.criteriaList}>
              {criteria.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No criteria yet. Add a criterion or ensure this project has required skills set.</p>
                </div>
              ) : (
                criteria.map((c, idx) => (
                  <div key={c.id} className={styles.criteriaItem}>
                    <div className={styles.dragHandle}><GripVertical size={20} /></div>
                    <div className={styles.criteriaContent}>
                      <div className={styles.critHeader}>
                        <div className={styles.critTitleGroup}>
                          <input
                            className={styles.titleInput}
                            value={c.title}
                            onChange={(e) => updateCriterion(c.id, 'title', e.target.value)}
                          />
                          <span className={`${styles.badge} ${styles[importanceColors[c.importance]]}`}>
                            {importanceLabels[c.importance]}
                          </span>
                        </div>
                        <button className={styles.iconBtn} onClick={() => removeCriterion(c.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <input
                        className={styles.descInput}
                        value={c.description}
                        onChange={(e) => updateCriterion(c.id, 'description', e.target.value)}
                        placeholder="Describe what to evaluate..."
                      />

                      <div className={styles.formRow}>
                        <div className={styles.inputGroup}>
                          <label>Importance</label>
                          <select
                            value={c.importance}
                            onChange={(e) => updateCriterion(c.id, 'importance', e.target.value)}
                          >
                            <option value="critical">Critical (Must Have)</option>
                            <option value="high">High (Expected)</option>
                            <option value="medium">Medium (Bonus)</option>
                            <option value="low">Low (Optional)</option>
                          </select>
                        </div>
                        <div className={styles.inputGroup}>
                          <label>Weight (%)</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={c.weight}
                            onChange={(e) => updateCriterion(c.id, 'weight', Number(e.target.value))}
                          />
                        </div>
                        <div className={styles.inputGroup}>
                          <label>Keywords</label>
                          <input
                            type="text"
                            value={c.keywords}
                            onChange={(e) => updateCriterion(c.id, 'keywords', e.target.value)}
                            placeholder="e.g. React, Hooks, TypeScript"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar: live weight matrix */}
          <div className={styles.sidebar}>
            <div className={styles.matrixCard}>
              <h3>Weight Matrix</h3>
              <p>{criteria.length} active criteria</p>

              <div className={styles.progressHeader}>
                <span>Total Weight</span>
                <span className={totalWeight === 100 ? styles.progressValOk : styles.progressValWarn}>
                  {totalWeight}% / 100%
                </span>
              </div>

              <div className={styles.progressBar}>
                {criteria.map((c, i) => (
                  <div
                    key={c.id}
                    className={styles[`fill${['Red','Blue','Purple','Orange','Green'][i % 5]}`]}
                    style={{ width: `${Math.min(c.weight, 100)}%` }}
                  />
                ))}
              </div>

              <div className={styles.legend}>
                {criteria.map((c, i) => (
                  <div key={c.id} className={styles.legendItem}>
                    <span className={styles[dotColors[i % 5]]}></span>
                    <span className={styles.legendName}>{c.title}</span>
                    <span className={styles.pct}>{c.weight}%</span>
                  </div>
                ))}
              </div>

              {totalWeight !== 100 && (
                <div className={styles.tipBox}>
                  <h4><Lightbulb size={16} /> Weight Warning</h4>
                  <p>
                    {totalWeight < 100
                      ? `You have ${100 - totalWeight}% unallocated. Distribute remaining weight across criteria.`
                      : `Weight exceeds 100% by ${totalWeight - 100}%. Reduce some criteria weights.`}
                  </p>
                </div>
              )}

              {totalWeight === 100 && (
                <div className={styles.tipBoxGreen}>
                  <h4><Check size={16} /> Matrix Balanced</h4>
                  <p>All weights total 100%. Your framework is ready to save.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
