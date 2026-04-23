import React, { useState } from 'react';
import styles from './NewProjectModal.module.css';
import { X, Loader2, Plus, Trash2, Sparkles } from 'lucide-react';
import { createHiringProject } from '../../services/hiringProjects';
import { useStore } from '../../store/useStore';
import type { JobType, ProjectStatus } from '../../types/database';
import { generateJobDescription, generateSkillsFromInput } from '../../services/aiJobDescription';

interface Props {
  onClose: () => void;
}

export default function NewProjectModal({ onClose }: Props) {
  const { loadProjects } = useStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [generatingSkills, setGeneratingSkills] = useState(false);

  const [form, setForm] = useState({
    title: '',
    department: '',
    location: '',
    job_type: 'Full-time' as JobType,
    required_experience_years: 0,
    required_education: '',
    description: '',
    status: 'Active' as ProjectStatus,
  });

  const [skills, setSkills] = useState<string[]>(['']);

  function setField(field: string, value: any) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateSkill(index: number, value: string) {
    setSkills((prev) => prev.map((s, i) => (i === index ? value : s)));
  }
  function addSkill() { setSkills((prev) => [...prev, '']); }
  function removeSkill(index: number) { setSkills((prev) => prev.filter((_, i) => i !== index)); }

  async function handleGenerateDescription() {
    // Validate that we have at least a job title
    if (!form.title.trim()) {
      setError('Please enter a job title before generating a description.');
      return;
    }

    setGeneratingAI(true);
    setError(null);

    try {
      const generatedDescription = await generateJobDescription({
        title: form.title,
        department: form.department,
        location: form.location,
        jobType: form.job_type,
        experienceYears: Number(form.required_experience_years),
        education: form.required_education,
        skills: skills.filter(s => s.trim() !== ''),
      });

      setField('description', generatedDescription);
    } catch (err: any) {
      setError(err.message || 'Failed to generate job description. Please try again.');
    } finally {
      setGeneratingAI(false);
    }
  }

  async function handleGenerateSkills() {
    if (!form.title.trim()) {
      setError('Please enter a job title before generating skills.');
      return;
    }

    setGeneratingSkills(true);
    setError(null);

    try {
      const generatedSkills = await generateSkillsFromInput(
        {
          title: form.title,
          department: form.department,
          location: form.location,
          jobType: form.job_type,
          experienceYears: Number(form.required_experience_years),
          education: form.required_education,
          skills: skills.filter(s => s.trim() !== ''),
        },
        form.description || undefined
      );

      setSkills(generatedSkills.length > 0 ? generatedSkills : ['']);
    } catch (err: any) {
      setError(err.message || 'Failed to generate skills. Please try again.');
    } finally {
      setGeneratingSkills(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Project title is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      await createHiringProject({
        ...form,
        required_experience_years: Number(form.required_experience_years),
        required_skills: skills.filter((s) => s.trim() !== ''),
      });
      await loadProjects();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Failed to create project.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2>New Hiring Project</h2>
          <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>

        <form id="newProjectForm" className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.section}>
            <h3>Basic Information</h3>
            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label>Job Title <span className={styles.req}>*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Senior Product Designer"
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Department</label>
                <input
                  type="text"
                  placeholder="e.g. Engineering"
                  value={form.department}
                  onChange={(e) => setField('department', e.target.value)}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Location</label>
                <input
                  type="text"
                  placeholder="e.g. Remote, Mumbai, London"
                  value={form.location}
                  onChange={(e) => setField('location', e.target.value)}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Job Type</label>
                <select value={form.job_type} onChange={(e) => setField('job_type', e.target.value)}>
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                  <option>Internship</option>
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>Min. Experience (years)</label>
                <input
                  type="number"
                  min={0}
                  value={form.required_experience_years}
                  onChange={(e) => setField('required_experience_years', e.target.value)}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Education Requirement</label>
                <input
                  type="text"
                  placeholder="e.g. Bachelor's in Computer Science"
                  value={form.required_education}
                  onChange={(e) => setField('required_education', e.target.value)}
                />
              </div>
            </div>

            <div className={styles.inputGroupFull}>
              <div className={styles.labelWithAction}>
                <label>Job Description</label>
                <button
                  type="button"
                  className={styles.aiGenerateBtn}
                  onClick={handleGenerateDescription}
                  disabled={generatingAI || !form.title.trim()}
                  title="Generate job description with AI"
                >
                  {generatingAI ? (
                    <>
                      <Loader2 size={14} className={styles.spinner} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Generate with AI
                    </>
                  )}
                </button>
              </div>
              <textarea
                rows={generatingAI ? 6 : 8}
                placeholder="Describe the responsibilities, team, and expectations for this role…"
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                className={generatingAI ? styles.textareaLoading : ''}
              />
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>Required Skills</h3>
              <div className={styles.sectionActions}>
                <button
                  type="button"
                  className={styles.aiGenerateBtn}
                  onClick={handleGenerateSkills}
                  disabled={generatingSkills || !form.title.trim()}
                  title="Generate skills with AI"
                >
                  {generatingSkills ? (
                    <>
                      <Loader2 size={14} className={styles.spinner} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Generate with AI
                    </>
                  )}
                </button>
                <button type="button" className={styles.addSkillBtn} onClick={addSkill} disabled={generatingSkills}>
                  <Plus size={14} /> Add Skill
                </button>
              </div>
            </div>
            <div className={styles.skillsList}>
              {skills.map((skill, i) => (
                <div key={i} className={styles.skillRow}>
                  <input
                    type="text"
                    placeholder={`Skill ${i + 1}, e.g. React`}
                    value={skill}
                    onChange={(e) => updateSkill(i, e.target.value)}
                  />
                  {skills.length > 1 && (
                    <button type="button" className={styles.removeSkillBtn} onClick={() => removeSkill(i)}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}
        </form>

        <div className={styles.formFooter}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button type="submit" form="newProjectForm" className={styles.submitBtn} disabled={saving}>
            {saving ? <><Loader2 size={16} className={styles.spinner} /> Creating…</> : 'Create Project'}
          </button>
        </div>
      </div>
    </>
  );
}
