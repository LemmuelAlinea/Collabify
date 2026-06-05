import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table'
import { AnalyticsChart } from '../components/AnalyticsChart'
import { MetricCard } from '../components/MetricCard'
import { useAnalytics } from '../hooks/useAnalytics'

const TASK_STATUS_DATASETS = [
  { key: 'todo', label: 'Todo', color: '#1463ff' },
  { key: 'inProgress', label: 'In progress', color: '#24d2ff' },
  { key: 'review', label: 'Review', color: '#f59e0b' },
  { key: 'done', label: 'Done', color: '#20e681' },
  { key: 'blocked', label: 'Blocked', color: '#ef4444' },
]

const TABLES = [
  { id: 'groups', label: 'Groups' },
  { id: 'projects', label: 'Projects' },
  { id: 'students', label: 'Students' },
]

function percent(value, fallback = '0%') {
  if (value === null || value === undefined) return fallback
  return `${Math.round(Number(value))}%`
}

function formatDate(value) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

function rowMatches(row, query) {
  if (!query) return true
  return Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(query))
}

function RiskBadge({ status }) {
  return <span className={`analytics-risk-badge analytics-risk-${String(status).toLowerCase().replaceAll(' ', '-')}`}>{status}</span>
}

function EmptyTable() {
  return (
    <div className="empty-state analytics-empty-state">
      <h3>No analytics rows</h3>
      <p>Choose another class, project, group, or search term.</p>
    </div>
  )
}

function average(rows, key) {
  const values = rows.map((row) => Number(row[key])).filter((value) => Number.isFinite(value))
  if (!values.length) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function ComparisonCard({ label, value, detail }) {
  return (
    <div className="analytics-comparison-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  )
}

export function AnalyticsDashboardPage() {
  const { analytics, error, isLoading, loadAnalytics } = useAnalytics()
  const [filters, setFilters] = useState({})
  const [activeTable, setActiveTable] = useState('groups')
  const [search, setSearch] = useState('')

  const filterData = analytics?.filters ?? { classes: [], projects: [], groups: [], students: [] }
  const selectedClassId = filters.classId ?? filterData.selectedClassId ?? ''
  const selectedProjectId = filters.projectId ?? filterData.selectedProjectId ?? ''
  const selectedGroupId = filters.groupId ?? filterData.selectedGroupId ?? ''
  const selectedStudentId = filters.studentId ?? filterData.selectedStudentId ?? ''
  const kpis = analytics?.kpis ?? {}
  const groupRows = analytics?.groupRows ?? []
  const projectRows = analytics?.projectRows ?? []
  const studentRows = analytics?.studentRows ?? []
  const query = search.trim().toLowerCase()

  async function updateFilters(patch) {
    const nextFilters = {
      classId: selectedClassId,
      projectId: selectedProjectId,
      groupId: selectedGroupId,
      studentId: selectedStudentId,
      ...patch,
    }

    Object.keys(nextFilters).forEach((key) => {
      if (!nextFilters[key]) delete nextFilters[key]
    })

    setFilters(nextFilters)
    await loadAnalytics(nextFilters)
  }

  const taskStatusPieRows = useMemo(
    () => TASK_STATUS_DATASETS.map((status) => ({
      key: status.key,
      label: status.label,
      value: (analytics?.taskStatusByGroup ?? []).reduce((sum, row) => sum + Number(row[status.key] ?? 0), 0),
      fill: status.color,
    })),
    [analytics?.taskStatusByGroup],
  )
  const progressTrend = useMemo(() => analytics?.projectProgressTrend ?? [], [analytics?.projectProgressTrend])
  const progressSeries = useMemo(() => ([
    {
      dataKey: 'completion',
      label: 'Completion',
      color: '#24d2ff',
    },
    {
      dataKey: 'expected',
      label: 'Expected',
      color: '#20e681',
    },
  ]), [])

  const visibleGroups = groupRows.filter((row) => rowMatches(row, query))
  const visibleProjects = projectRows.filter((row) => rowMatches(row, query))
  const visibleStudents = studentRows.filter((row) => rowMatches(row, query))
  const selectedStudentAnalytics = selectedStudentId
    ? studentRows.find((row) => row.studentId === selectedStudentId)
    : null
  const selectedGroupAnalytics = selectedGroupId
    ? groupRows.find((row) => row.groupId === selectedGroupId)
    : null
  const selectedProjectAnalytics = selectedProjectId
    ? projectRows.find((row) => row.projectId === selectedProjectId)
    : null
  const groupAverageCompletion = average(groupRows, 'completion')
  const groupAverageContribution = average(groupRows, 'contributionBalance')
  const studentAverageCompletion = average(studentRows, 'taskCompletion')

  if (isLoading && !analytics) return <div className="route-state">Loading analytics...</div>

  return (
    <section className="module-page professor-analytics-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">Professor</p>
          <h2>Analytics</h2>
          <p>Calculated class, project, group, task, contribution, and pop quiz signals.</p>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="analytics-filter-bar">
        <label className="form-field">
          <span>Class</span>
          <select value={selectedClassId} onChange={(event) => updateFilters({ classId: event.target.value, projectId: '', groupId: '', studentId: '' })}>
            {filterData.classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>{classItem.name}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Project</span>
          <select value={selectedProjectId} onChange={(event) => updateFilters({ projectId: event.target.value, groupId: '', studentId: '' })}>
            <option value="">All projects</option>
            {filterData.projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Group</span>
          <select value={selectedGroupId} onChange={(event) => updateFilters({ groupId: event.target.value, studentId: '' })}>
            <option value="">All groups</option>
            {filterData.groups.map((group) => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Student</span>
          <select value={selectedStudentId} onChange={(event) => updateFilters({ studentId: event.target.value })}>
            <option value="">All students</option>
            {filterData.students.map((student) => (
              <option key={student.id} value={student.id}>{student.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="metric-grid analytics-kpi-grid">
        <MetricCard label="Active Projects" value={kpis.activeProjects ?? 0} />
        <MetricCard label="At-risk Groups" value={kpis.atRiskGroups ?? 0} />
        <MetricCard label="Critical Groups" value={kpis.criticalGroups ?? 0} />
        <MetricCard label="Avg Completion" value={percent(kpis.averageCompletion)} />
        <MetricCard label="Quiz Learning" value={percent(kpis.averageQuizLearningScore)} />
        <MetricCard label="Contribution Balance" value={percent(kpis.averageContributionBalance)} />
      </div>

      <div className="analytics-comparison-grid">
        <ComparisonCard label="Selected project" value={selectedProjectAnalytics ? percent(selectedProjectAnalytics.completion) : percent(groupAverageCompletion)} detail={selectedProjectAnalytics ? 'Completion in this project' : 'Class average completion'} />
        <ComparisonCard label="Selected group" value={selectedGroupAnalytics ? percent(selectedGroupAnalytics.completion) : percent(groupAverageCompletion)} detail={selectedGroupAnalytics ? `vs ${percent(groupAverageCompletion)} class/project average` : 'Average across visible groups'} />
        <ComparisonCard label="Contribution points" value={selectedGroupAnalytics ? percent(selectedGroupAnalytics.contributionBalance) : percent(groupAverageContribution)} detail="Earned task points out of 100" />
        <ComparisonCard label="Student average" value={selectedStudentAnalytics ? percent(selectedStudentAnalytics.taskCompletion) : percent(studentAverageCompletion)} detail={selectedStudentAnalytics ? `${selectedStudentAnalytics.studentName} task completion` : 'Across visible students'} />
      </div>

      {selectedStudentAnalytics ? (
        <section className="analytics-student-panel">
          <div>
            <p className="eyebrow">Student Analytics</p>
            <h3>{selectedStudentAnalytics.studentName}</h3>
            <p>{selectedStudentAnalytics.groupName} · {selectedStudentAnalytics.projectName}</p>
          </div>
          <div className="analytics-student-metrics">
            <ComparisonCard label="Tasks" value={`${selectedStudentAnalytics.completedTasks}/${selectedStudentAnalytics.assignedTasks}`} detail="Completed assigned tasks" />
            <ComparisonCard label="Task Completion" value={percent(selectedStudentAnalytics.taskCompletion)} detail={`vs ${percent(studentAverageCompletion)} student average`} />
            <ComparisonCard label="Contribution" value={percent(selectedStudentAnalytics.contributionScore)} detail="Earned task points" />
            <ComparisonCard label="Quiz Score" value={percent(selectedStudentAnalytics.quizScore, 'No quiz')} detail="Pop quiz learning check" />
          </div>
        </section>
      ) : null}

      <div className="analytics-visual-grid">
        <AnalyticsChart
          data={taskStatusPieRows}
          title="Task Status"
          type="pie"
          valueSuffix=""
        />
        <AnalyticsChart
          data={progressTrend}
          max={100}
          series={progressSeries}
          title="Project Progress Trend"
          type="line"
          valueSuffix="%"
        />
      </div>

      <section className="analytics-table-panel">
        <div className="analytics-table-toolbar">
          <div className="analytics-table-tabs">
            {TABLES.map((table) => (
              <button
                className={activeTable === table.id ? 'is-active' : ''}
                key={table.id}
                type="button"
                onClick={() => setActiveTable(table.id)}
              >
                {table.label}
              </button>
            ))}
          </div>
          <label className="analytics-table-search">
            <Search size={15} aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search table..." />
          </label>
        </div>

        {activeTable === 'groups' ? (
          <div className="analytics-table-wrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Completion</TableHead>
                  <TableHead>Deadline Risk</TableHead>
                  <TableHead>Contribution</TableHead>
                  <TableHead>Quiz Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleGroups.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><strong>{row.groupName}</strong><span>{row.memberCount} members</span></TableCell>
                    <TableCell>{row.projectName}</TableCell>
                    <TableCell>{percent(row.completion)}</TableCell>
                    <TableCell>{percent(row.deadlineRisk)}</TableCell>
                    <TableCell>{percent(row.contributionBalance)}</TableCell>
                    <TableCell>{percent(row.quizLearningScore, 'No quiz')}</TableCell>
                    <TableCell><RiskBadge status={row.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {visibleGroups.length === 0 ? <EmptyTable /> : null}
          </div>
        ) : null}

        {activeTable === 'projects' ? (
          <div className="analytics-table-wrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Groups</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Completion</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Quiz Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleProjects.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><strong>{row.projectName}</strong></TableCell>
                    <TableCell>{row.groupCount}</TableCell>
                    <TableCell>{row.taskCount}</TableCell>
                    <TableCell>{percent(row.completion)}</TableCell>
                    <TableCell>{formatDate(row.deadlineAt)}</TableCell>
                    <TableCell>{percent(row.quizLearningScore, 'No quiz')}</TableCell>
                    <TableCell><RiskBadge status={row.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {visibleProjects.length === 0 ? <EmptyTable /> : null}
          </div>
        ) : null}

        {activeTable === 'students' ? (
          <div className="analytics-table-wrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Task Completion</TableHead>
                  <TableHead>Contribution</TableHead>
                  <TableHead>Quiz Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleStudents.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><strong>{row.studentName}</strong><span>{row.email}</span></TableCell>
                    <TableCell>{row.groupName}</TableCell>
                    <TableCell>{row.completedTasks}/{row.assignedTasks}</TableCell>
                    <TableCell>{percent(row.taskCompletion)}</TableCell>
                    <TableCell>{percent(row.contributionScore)}</TableCell>
                    <TableCell>{percent(row.quizScore, 'No quiz')}</TableCell>
                    <TableCell><RiskBadge status={row.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {visibleStudents.length === 0 ? <EmptyTable /> : null}
          </div>
        ) : null}
      </section>
    </section>
  )
}
