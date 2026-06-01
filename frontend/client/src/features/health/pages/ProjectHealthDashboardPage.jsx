import { useMemo, useState } from 'react'
import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'
import { useGroups } from '../../groups/hooks/useGroups'
import { useProjects } from '../../projects/hooks/useProjects'
import { HealthScoreCard } from '../components/HealthScoreCard'
import { HealthTimeline } from '../components/HealthTimeline'
import { PhaseHealthGrid } from '../components/PhaseHealthGrid'
import { RiskReportList } from '../components/RiskReportList'
import { useProjectHealth } from '../hooks/useProjectHealth'

export function ProjectHealthDashboardPage() {
  const { role } = useAuth()
  const { projects } = useProjects()
  const { groups } = useGroups()
  const [filters, setFilters] = useState({ projectId: '', groupId: '' })
  const stableFilters = useMemo(() => filters, [filters])
  const {
    error,
    evaluate,
    health,
    isEvaluating,
    isLoading,
  } = useProjectHealth(stableFilters)
  const active = health[0]

  if (isLoading) return <div className="route-state">Loading project health...</div>

  return (
    <section className="module-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">{role}</p>
          <h2>Project Health</h2>
          <p>{role === USER_ROLES.PROFESSOR ? 'Monitor all active projects, risks, forecasts, and intervention signals.' : 'Track your project, group health, personal workload, and upcoming risks.'}</p>
        </div>
        <button className="primary-button" type="button" disabled={isEvaluating} onClick={evaluate}>
          {isEvaluating ? 'Evaluating...' : 'Evaluate Health'}
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="analytics-form">
        <label className="form-field" htmlFor="healthProject">
          <span>Project</span>
          <select id="healthProject" value={filters.projectId} onChange={(event) => setFilters({ projectId: event.target.value, groupId: '' })}>
            <option value="">All projects</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
          </select>
        </label>
        <label className="form-field" htmlFor="healthGroup">
          <span>Group</span>
          <select id="healthGroup" value={filters.groupId} onChange={(event) => setFilters((current) => ({ ...current, groupId: event.target.value }))}>
            <option value="">All groups</option>
            {groups.filter((group) => !filters.projectId || group.projectId === filters.projectId).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </label>
      </div>
      <div className="health-grid">
        {health.map((item) => <HealthScoreCard item={item} key={item.id} />)}
        {health.length === 0 ? <div className="empty-state"><h3>No health records</h3><p>Run an evaluation to generate early warnings.</p></div> : null}
      </div>
      {active ? (
        <>
          <RiskReportList risks={active.risks} recommendations={active.recommendationsRows} alerts={active.alerts} />
          <PhaseHealthGrid phases={active.phases} />
          <section className="analytics-panel">
            <h3>Member Health</h3>
            <div className="health-phase-grid">
              {(active.member_report ?? []).map((member) => (
                <article className="metric-card" key={member.userId}>
                  <span>{member.displayName}</span>
                  <strong>{member.activityScore}%</strong>
                  <p>{member.status} · {member.workloadPercent}% workload · {member.contributionPoints} pts</p>
                </article>
              ))}
            </div>
          </section>
          <section className="analytics-panel">
            <h3>Health Timeline</h3>
            <HealthTimeline history={active.history} />
          </section>
        </>
      ) : null}
    </section>
  )
}
