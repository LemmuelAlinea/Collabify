import { useMemo, useState } from 'react'
import { StudentPageSkeleton } from '../../../components/skeletons/StudentPageSkeleton'
import { AnalyticsChart } from '../components/AnalyticsChart'
import { ComparePanel } from '../components/ComparePanel'
import { HealthMatrix } from '../components/HealthMatrix'
import { InsightCards } from '../components/InsightCards'
import { InterventionFeed } from '../components/InterventionFeed'
import { PredictiveSection } from '../components/PredictiveSection'
import { StudentDeepDive } from '../components/StudentDeepDive'
import { useAnalytics } from '../hooks/useAnalytics'

const TASK_STATUS_DATASETS = [
  { key: 'todo', label: 'Todo', color: '#1463ff' },
  { key: 'inProgress', label: 'In progress', color: '#24d2ff' },
  { key: 'review', label: 'Review', color: '#f59e0b' },
  { key: 'done', label: 'Done', color: '#20e681' },
  { key: 'blocked', label: 'Blocked', color: '#ef4444' },
]

const STACKED_SERIES = TASK_STATUS_DATASETS.map((s) => ({
  dataKey: s.key,
  label: s.label,
  color: s.color,
}))

const PROGRESS_SERIES = [
  { dataKey: 'completion', label: 'Completion', color: '#24d2ff' },
  { dataKey: 'expected', label: 'Expected', color: '#20e681' },
]

const GROUP_COMPLETION_SERIES = [
  { dataKey: 'completion', label: 'Completion %', color: '#1463ff' },
]

export function AnalyticsDashboardPage() {
  const { analytics, error, isLoading, loadAnalytics } = useAnalytics()
  const [filters, setFilters] = useState({})

  const filterData = analytics?.filters ?? { classes: [], projects: [], groups: [], students: [] }
  const selectedClassId = filters.classId ?? filterData.selectedClassId ?? ''
  const selectedProjectId = filters.projectId ?? filterData.selectedProjectId ?? ''
  const selectedGroupId = filters.groupId ?? filterData.selectedGroupId ?? ''
  const selectedStudentId = filters.studentId ?? filterData.selectedStudentId ?? ''
  const groupRows = analytics?.groupRows ?? []
  const projectRows = analytics?.projectRows ?? []
  const studentRows = analytics?.studentRows ?? []
  const taskStatusByGroup = analytics?.taskStatusByGroup ?? []

  async function updateFilters(patch) {
    const nextFilters = {
      classId: selectedClassId,
      projectId: selectedProjectId,
      groupId: selectedGroupId,
      studentId: selectedStudentId,
      ...patch,
    }
    Object.keys(nextFilters).forEach((key) => { if (!nextFilters[key]) delete nextFilters[key] })
    setFilters(nextFilters)
    await loadAnalytics(nextFilters)
  }

  // Section C: group completion bar sorted descending
  const groupCompletionData = useMemo(
    () => [...groupRows]
      .sort((a, b) => Number(b.completion ?? 0) - Number(a.completion ?? 0))
      .map((row) => ({
        label: row.groupName.length > 12 ? `${row.groupName.slice(0, 12)}…` : row.groupName,
        completion: Math.round(Number(row.completion ?? 0)),
      })),
    [groupRows],
  )

  // Section C: stacked task status per group
  const taskByGroupData = useMemo(
    () => taskStatusByGroup.map((row, i) => ({
      label: (row.groupName ?? row.group_name ?? `Group ${i + 1}`).slice(0, 14),
      todo: Number(row.todo ?? 0),
      inProgress: Number(row.inProgress ?? 0),
      review: Number(row.review ?? 0),
      done: Number(row.done ?? 0),
      blocked: Number(row.blocked ?? 0),
    })),
    [taskStatusByGroup],
  )

  const progressTrend = useMemo(() => analytics?.projectProgressTrend ?? [], [analytics?.projectProgressTrend])

  const selectedStudentAnalytics = selectedStudentId
    ? studentRows.find((row) => row.studentId === selectedStudentId)
    : null

  if (isLoading && !analytics) return <StudentPageSkeleton variant="analytics" />

  return (
    <section className="module-page professor-analytics-page analytics-v2-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">Professor</p>
          <h2>Analytics</h2>
          <p>Actionable signals across classes, groups, and students — with predictive and combined-data insights.</p>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      {/* ── Filters ─────────────────────────────────────────── */}
      <div className="af2-bar">
        <div className="af2-row">
          <div className="af2-field">
            <span className="af2-label">Class</span>
            <select
              className="af2-select"
              value={selectedClassId}
              onChange={(e) => updateFilters({ classId: e.target.value, projectId: '', groupId: '', studentId: '' })}
            >
              {filterData.classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="af2-field">
            <span className="af2-label">Project</span>
            <select
              className="af2-select"
              value={selectedProjectId}
              onChange={(e) => updateFilters({ projectId: e.target.value, groupId: '', studentId: '' })}
            >
              <option value="">All projects</option>
              {filterData.projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="af2-field">
            <span className="af2-label">Group</span>
            <select
              className="af2-select"
              value={selectedGroupId}
              onChange={(e) => updateFilters({ groupId: e.target.value, studentId: '' })}
            >
              <option value="">All groups</option>
              {filterData.groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="af2-field">
            <span className="af2-label">Student</span>
            <select
              className="af2-select"
              value={selectedStudentId}
              onChange={(e) => updateFilters({ studentId: e.target.value })}
            >
              <option value="">All students</option>
              {filterData.students.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          {(selectedProjectId || selectedGroupId || selectedStudentId) && (
            <button
              className="af2-clear"
              type="button"
              onClick={() => updateFilters({ projectId: '', groupId: '', studentId: '' })}
            >
              Clear filters
            </button>
          )}
        </div>
        {(selectedProjectId || selectedGroupId || selectedStudentId) && (
          <div className="af2-chips">
            {selectedProjectId && filterData.projects.find((p) => p.id === selectedProjectId) && (
              <span className="af2-chip">
                Project: {filterData.projects.find((p) => p.id === selectedProjectId)?.name}
                <button type="button" aria-label="Remove project filter" onClick={() => updateFilters({ projectId: '', groupId: '', studentId: '' })}>×</button>
              </span>
            )}
            {selectedGroupId && filterData.groups.find((g) => g.id === selectedGroupId) && (
              <span className="af2-chip">
                Group: {filterData.groups.find((g) => g.id === selectedGroupId)?.name}
                <button type="button" aria-label="Remove group filter" onClick={() => updateFilters({ groupId: '', studentId: '' })}>×</button>
              </span>
            )}
            {selectedStudentId && filterData.students.find((s) => s.id === selectedStudentId) && (
              <span className="af2-chip">
                Student: {filterData.students.find((s) => s.id === selectedStudentId)?.name}
                <button type="button" aria-label="Remove student filter" onClick={() => updateFilters({ studentId: '' })}>×</button>
              </span>
            )}
          </div>
        )}
        {isLoading && analytics && (
          <div className="af2-loading-bar" aria-hidden="true" />
        )}
      </div>

      {/* ── Section A: Intervention Feed ────────────────────── */}
      <InterventionFeed groupRows={groupRows} studentRows={studentRows} />

      {/* ── Section B: Class Health Matrix ──────────────────── */}
      <HealthMatrix
        groupRows={groupRows}
        onSelectGroup={(groupId) => updateFilters({ groupId, studentId: '' })}
      />

      {/* ── Section C: Progress Trends ──────────────────────── */}
      {(groupCompletionData.length > 0 || taskByGroupData.length > 0 || progressTrend.length > 0) && (
        <section className="analytics-section">
          <div className="analytics-section-header">
            <div>
              <h3>Progress Trends</h3>
              <p>Group completion ranking, task distribution by group, and overall class progress over time.</p>
            </div>
          </div>
          <div className="analytics-trend-grid">
            {groupCompletionData.length > 0 && (
              <AnalyticsChart
                data={groupCompletionData}
                title="Group Completion Ranking"
                type="bar"
                series={GROUP_COMPLETION_SERIES}
                max={100}
                valueSuffix="%"
              />
            )}
            {taskByGroupData.length > 0 && (
              <AnalyticsChart
                data={taskByGroupData}
                title="Task Status by Group"
                type="bar"
                series={STACKED_SERIES}
                stacked
                valueSuffix=""
              />
            )}
            {progressTrend.length > 0 && (
              <AnalyticsChart
                data={progressTrend}
                max={100}
                series={PROGRESS_SERIES}
                title="Class Progress Over Time"
                type="line"
                valueSuffix="%"
              />
            )}
          </div>
        </section>
      )}

      {/* ── Section D: Predictive Completion ────────────────── */}
      <PredictiveSection projectRows={projectRows} />

      {/* ── Section E: Combined Insights ────────────────────── */}
      {groupRows.length > 0 && (
        <InsightCards groupRows={groupRows} studentRows={studentRows} />
      )}

      {/* ── Section F: Project Comparison ───────────────────── */}
      {filterData.projects.length >= 2 && (
        <ComparePanel projects={filterData.projects} />
      )}

      {/* ── Section G: Student Deep Dive ────────────────────── */}
      <StudentDeepDive
        student={selectedStudentAnalytics}
        groupRows={groupRows}
        studentRows={studentRows}
      />

    </section>
  )
}
