import { useState } from 'react'
import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'
import { AnalyticsChart } from '../components/AnalyticsChart'
import { MetricCard } from '../components/MetricCard'
import { QuestionSetManager } from '../components/QuestionSetManager'
import { SurveyPanel } from '../components/SurveyPanel'
import { useAnalytics } from '../hooks/useAnalytics'
import { compareProjects, exportReport } from '../services/analyticsService'

function downloadReport(report) {
  const type = report.format === 'csv' ? 'text/csv' : report.format === 'excel' ? 'application/vnd.ms-excel' : 'text/html'
  const blob = new Blob([report.content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${report.title}.${report.format === 'excel' ? 'xls' : report.format}`
  link.click()
  URL.revokeObjectURL(url)
}

export function AnalyticsDashboardPage() {
  const { role } = useAuth()
  const { analytics, error, isLoading, loadAnalytics } = useAnalytics()
  const [filters, setFilters] = useState({ classId: '', projectId: '', groupId: '' })
  const [comparison, setComparison] = useState([])
  const [compareForm, setCompareForm] = useState({ projectAId: '', projectBId: '' })

  async function applyFilters(event) {
    event.preventDefault()
    await loadAnalytics(filters)
  }

  async function runCompare(event) {
    event.preventDefault()
    setComparison(await compareProjects(compareForm.projectAId, compareForm.projectBId))
  }

  async function runExport(format) {
    const report = await exportReport({ reportType: role === USER_ROLES.PROFESSOR ? 'professor' : 'student', format, ...filters })
    downloadReport(report)
  }

  const projectRows = analytics?.projectAnalytics ?? []
  const groupRows = analytics?.groupAnalytics ?? []
  const studentRows = analytics?.studentAnalytics ?? []
  const professor = analytics?.professorAnalytics
  const classAnalytics = analytics?.classAnalytics
  const primaryProject = projectRows[0]
  const primaryStudent = studentRows[0]

  return (
    <section className="module-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">{role}</p>
          <h2>Analytics & Insights</h2>
        </div>
        <div className="button-row">
          <button className="secondary-button" type="button" onClick={() => runExport('csv')}>CSV</button>
          <button className="secondary-button" type="button" onClick={() => runExport('excel')}>Excel</button>
          <button className="secondary-button" type="button" onClick={() => runExport('pdf')}>PDF</button>
        </div>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <form className="analytics-form" onSubmit={applyFilters}>
        <input value={filters.classId} onChange={(event) => setFilters((current) => ({ ...current, classId: event.target.value }))} placeholder="Class ID" />
        <input value={filters.projectId} onChange={(event) => setFilters((current) => ({ ...current, projectId: event.target.value }))} placeholder="Project ID" />
        <input value={filters.groupId} onChange={(event) => setFilters((current) => ({ ...current, groupId: event.target.value }))} placeholder="Group ID" />
        <button className="primary-button" type="submit">Refresh</button>
      </form>
      {isLoading ? <div className="route-state">Loading analytics...</div> : null}
      <div className="metric-grid">
        {role === USER_ROLES.PROFESSOR ? (
          <>
            <MetricCard label="Projects Created" value={professor?.projects_created ?? 0} />
            <MetricCard label="Projects Completed" value={professor?.projects_completed ?? 0} />
            <MetricCard label="Avg Learning" value={`${professor?.average_learning_effectiveness ?? 0}%`} />
            <MetricCard label="Avg Project Effectiveness" value={`${professor?.average_project_effectiveness ?? 0}%`} />
            <MetricCard label="Avg Group Performance" value={`${professor?.average_group_performance ?? 0}%`} />
            <MetricCard label="Class Completion" value={`${classAnalytics?.completion_rate ?? 0}%`} />
          </>
        ) : (
          <>
            <MetricCard label="Projects Completed" value={primaryStudent?.projects_completed ?? 0} />
            <MetricCard label="Personal Completion" value={`${primaryStudent?.personal_completion ?? 0}%`} />
            <MetricCard label="Task Completion" value={`${primaryStudent?.task_completion ?? 0}%`} />
            <MetricCard label="Contribution" value={`${primaryStudent?.contribution_score ?? 0}%`} />
            <MetricCard label="Learning Score" value={`${primaryStudent?.average_learning_score ?? 0}%`} />
            <MetricCard label="Submission Success" value={`${primaryStudent?.submission_success_rate ?? 0}%`} />
          </>
        )}
      </div>
      <div className="analytics-grid">
        <AnalyticsChart
          title="Project Effectiveness"
          labels={projectRows.map((row) => row.project_id?.slice(0, 8))}
          data={projectRows.map((row) => row.project_effectiveness)}
        />
        <AnalyticsChart
          title="Group Performance"
          labels={groupRows.map((row) => row.group_id?.slice(0, 8))}
          data={groupRows.map((row) => row.group_performance)}
        />
        <AnalyticsChart
          title="Contribution Fairness"
          labels={projectRows.map((row) => row.project_id?.slice(0, 8))}
          data={projectRows.map((row) => row.contribution_fairness)}
          type="line"
        />
        <AnalyticsChart
          title="Project Health"
          labels={projectRows.map((row) => row.project_id?.slice(0, 8))}
          data={projectRows.map((row) => row.health_score)}
          type="line"
        />
      </div>
      {primaryProject?.ai_insights || professor?.ai_insights ? (
        <section className="analytics-panel">
          <h3>AI Insights</h3>
          <p>{primaryProject?.ai_insights ?? professor?.ai_insights}</p>
        </section>
      ) : null}
      {role === USER_ROLES.PROFESSOR ? (
        <>
          <form className="analytics-form" onSubmit={runCompare}>
            <input value={compareForm.projectAId} onChange={(event) => setCompareForm((current) => ({ ...current, projectAId: event.target.value }))} placeholder="Project A ID" required />
            <input value={compareForm.projectBId} onChange={(event) => setCompareForm((current) => ({ ...current, projectBId: event.target.value }))} placeholder="Project B ID" required />
            <button className="secondary-button" type="submit">Compare</button>
          </form>
          {comparison.length > 0 ? (
            <AnalyticsChart
              title="Project Comparison"
              labels={comparison.map((row) => row.project_id?.slice(0, 8))}
              data={comparison.map((row) => row.project_effectiveness)}
            />
          ) : null}
          <QuestionSetManager />
        </>
      ) : <SurveyPanel />}
    </section>
  )
}
