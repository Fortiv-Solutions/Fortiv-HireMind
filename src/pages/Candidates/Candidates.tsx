import { useEffect, useState, useMemo } from 'react';
import {
  Users, Search, MapPin, Mail, Phone, Loader2, AlertCircle,
  ChevronRight, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, X,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { CvEvaluation } from '../../types/database';
import type { CandidateWithStats } from '../../services/hiringProjects';
import CandidateDrawer from '../ProjectDetail/CandidateDrawer';
import styles from './Candidates.module.css';

const STATUS_COLORS: Record<string, string> = {
  New: styles.statusNew,
  Screened: styles.statusScreened,
  Shortlisted: styles.statusShortlisted,
  'Under Review': styles.statusReview,
  Rejected: styles.statusRejected,
};

const ALL_STATUSES = ['New', 'Screened', 'Under Review', 'Shortlisted', 'Rejected'];

type SortKey = 'name' | 'score' | 'projects' | 'joined';
type SortDir = 'asc' | 'desc';

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function getScoreClass(score: number | null) {
  if (score === null) return '';
  if (score >= 75) return styles.scoreHigh;
  if (score >= 50) return styles.scoreMed;
  return styles.scoreLow;
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown size={12} className={styles.sortIconInactive} />;
  return sortDir === 'asc'
    ? <ArrowUp size={12} className={styles.sortIconActive} />
    : <ArrowDown size={12} className={styles.sortIconActive} />;
}

export default function Candidates() {
  const { candidates, candidatesLoading, candidatesError, loadAllCandidates, fetchCandidateEvaluation } = useStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('joined');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [drawerEval, setDrawerEval] = useState<CvEvaluation | null>(null);
  const [drawerLoading, setDrawerLoading] = useState<string | null>(null);

  useEffect(() => { loadAllCandidates(); }, [loadAllCandidates]);

  async function openDrawer(candidate: CandidateWithStats) {
    if (drawerLoading) return;
    setDrawerLoading(candidate.id);
    try {
      const evaluation = await fetchCandidateEvaluation(candidate.id);
      if (evaluation) setDrawerEval(evaluation);
    } finally {
      setDrawerLoading(null);
    }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'score' ? 'desc' : 'asc');
    }
  }

  const processed = useMemo(() => {
    let list = [...candidates];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.location ?? '').toLowerCase().includes(q) ||
        (c.latest_project_title ?? '').toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      if (statusFilter === 'New') {
        list = list.filter((c) => c.latest_status === 'New' || c.latest_status === null);
      } else {
        list = list.filter((c) => c.latest_status === statusFilter);
      }
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name')     cmp = a.full_name.localeCompare(b.full_name);
      if (sortKey === 'score')    cmp = (a.latest_score ?? -1) - (b.latest_score ?? -1);
      if (sortKey === 'projects') cmp = a.project_count - b.project_count;
      if (sortKey === 'joined')   cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [candidates, search, statusFilter, sortKey, sortDir]);

  const hasFilters = !!search || !!statusFilter;
  function clearAll() { setSearch(''); setStatusFilter(null); }

  if (candidatesError) {
    return (
      <div className={styles.stateBox}>
        <AlertCircle size={40} />
        <h3>Could not load candidates</h3>
        <p>{candidatesError}</p>
        <button onClick={loadAllCandidates}>Retry</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.breadcrumbs}>
          <span>Dashboard</span>
          <ChevronRight size={14} />
          <span className={styles.breadcrumbActive}>Candidates</span>
        </div>
        <div className={styles.titleRow}>
          <h1>Candidates</h1>
          <span className={styles.countBadge}>{candidates.length} total</span>
        </div>
      </div>

      <div className={styles.statsGrid}>
        {[
          { label: 'Total Candidates', value: candidates.length },
          { label: 'Shortlisted',      value: candidates.filter((c) => c.latest_status === 'Shortlisted').length },
          { label: 'Under Review',     value: candidates.filter((c) => c.latest_status === 'Under Review' || c.latest_status === 'Screened').length },
          { label: 'New',              value: candidates.filter((c) => c.latest_status === 'New' || c.latest_status === null).length },
        ].map((s) => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statIcon}><Users size={18} /></div>
            <div>
              <div className={styles.statLabel}>{s.label}</div>
              <div className={styles.statValue}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.tableCard}>
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Search by name, email, location or project…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className={styles.searchClear} onClick={() => setSearch('')}>
                <X size={13} />
              </button>
            )}
          </div>
          <div className={styles.toolbarRight}>
            {hasFilters && (
              <button className={styles.clearAllBtn} onClick={clearAll}>
                <X size={12} /> Clear all
              </button>
            )}
            <span className={styles.showingText}>
              Showing <strong>{processed.length}</strong> of <strong>{candidates.length}</strong>
            </span>
          </div>
        </div>

        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>Status</span>
          <div className={styles.filterPills}>
            <button
              className={`${styles.filterPill} ${statusFilter === null ? styles.filterPillActive : ''}`}
              onClick={() => setStatusFilter(null)}
            >
              All
            </button>
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                className={`${styles.filterPill} ${statusFilter === s ? styles.filterPillActive : ''}`}
                onClick={() => setStatusFilter(statusFilter === s ? null : s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {hasFilters && (
          <div className={styles.activeChips}>
            {search && (
              <span className={styles.chip}>
                Search: "{search}"
                <button onClick={() => setSearch('')}><X size={11} /></button>
              </span>
            )}
            {statusFilter && (
              <span className={styles.chip}>
                Status: {statusFilter}
                <button onClick={() => setStatusFilter(null)}><X size={11} /></button>
              </span>
            )}
          </div>
        )}

        {candidatesLoading ? (
          <div className={styles.stateBox}>
            <Loader2 size={36} className={styles.spinner} />
            <p>Loading candidates…</p>
          </div>
        ) : processed.length === 0 ? (
          <div className={styles.stateBox}>
            <Users size={40} className={styles.emptyIcon} />
            <h3>{hasFilters ? 'No results found' : 'No candidates yet'}</h3>
            <p>{hasFilters ? 'Try adjusting your filters.' : 'Candidates will appear here once added to a project.'}</p>
            {hasFilters && <button onClick={clearAll}>Clear filters</button>}
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  <button className={styles.thBtn} onClick={() => handleSort('name')}>
                    Candidate <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>
                <th>Contact</th>
                <th>Location</th>
                <th>
                  <button className={styles.thBtn} onClick={() => handleSort('projects')}>
                    Projects <SortIcon col="projects" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>
                <th>Latest Project</th>
                <th>Status</th>
                <th>
                  <button className={styles.thBtn} onClick={() => handleSort('score')}>
                    Score <SortIcon col="score" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>
                <th>
                  <button className={styles.thBtn} onClick={() => handleSort('joined')}>
                    Joined <SortIcon col="joined" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {processed.map((c) => {
                const isRowLoading = drawerLoading === c.id;
                const isClickable = c.project_count > 0;
                return (
                  <tr
                    key={c.id}
                    className={`${styles.row} ${isClickable ? styles.rowClickable : ''}`}
                    onClick={() => isClickable && openDrawer(c)}
                    title={isClickable ? 'Click to view evaluation' : undefined}
                  >
                    <td>
                      <div className={styles.candidateCell}>
                        <div className={styles.avatar}>
                          {isRowLoading
                            ? <Loader2 size={14} className={styles.spinner} />
                            : getInitials(c.full_name)
                          }
                        </div>
                        <div>
                          <div className={styles.name}>{c.full_name}</div>
                          <div className={styles.joined}>
                            {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={styles.contactCell}>
                        <span className={styles.contactItem}><Mail size={12} />{c.email}</span>
                        {c.phone && <span className={styles.contactItem}><Phone size={12} />{c.phone}</span>}
                      </div>
                    </td>
                    <td>
                      {c.location
                        ? <span className={styles.locationCell}><MapPin size={12} />{c.location}</span>
                        : <span className={styles.empty}>—</span>}
                    </td>
                    <td>
                      <span className={styles.projectCount}>{c.project_count}</span>
                    </td>
                    <td>
                      <span className={styles.projectTitle}>
                        {c.latest_project_title ?? <span className={styles.empty}>—</span>}
                      </span>
                    </td>
                    <td>
                      {c.latest_status
                        ? <span className={`${styles.statusPill} ${STATUS_COLORS[c.latest_status] ?? ''}`}>{c.latest_status}</span>
                        : <span className={styles.empty}>—</span>}
                    </td>
                    <td>
                      {c.latest_score !== null
                        ? <span className={`${styles.scoreBadge} ${getScoreClass(c.latest_score)}`}>{Math.round(c.latest_score)}</span>
                        : <span className={styles.empty}>—</span>}
                    </td>
                    <td>
                      {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {c.linkedin_url && (
                        <a
                          href={c.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.linkedinBtn}
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Candidate drawer */}
      {drawerEval && (
        <CandidateDrawer
          evaluation={drawerEval}
          onClose={() => setDrawerEval(null)}
        />
      )}
    </div>
  );
}
