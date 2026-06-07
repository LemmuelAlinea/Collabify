import { useState } from 'react'
import { GitCompare } from 'lucide-react'
import { compareProjects } from '../services/analyticsService'
import { AnalyticsChart } from './AnalyticsChart'

export function ComparePanel({ projects }) {
  const [projectA, setProjectA] = useState('')
  const [projectB, setProjectB] = useState('')
  const [comparison, setComparison] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCompare() {
    if (!projectA || !projectB || projectA === projectB) return
    setIsLoading(true)
    setError('')
    try {
      const data = await compareProjects(projectA, projectB)
      setComparison(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const pA = comparison?.projectA
  const pB = comparison?.projectB
  const nameA = pA?.name ?? 'Project A'
  const nameB = pB?.name ?? 'Project B'

  const compChartData = pA && pB ? [
    { metric: 'Completion', [nameA]: Math.round(Number(pA.completion ?? 0)), [nameB]: Math.round(Number(pB.completion ?? 0)) },
    { metric: 'Quiz Score', [nameA]: Math.round(Number(pA.quizLearningScore ?? 0)), [nameB]: Math.round(Number(pB.quizLearningScore ?? 0)) },
    { metric: 'Contribution', [nameA]: Math.round(Number(pA.contributionBalance ?? 0)), [nameB]: Math.round(Number(pB.contributionBalance ?? 0)) },
  ] : []

  const compareSeries = pA && pB ? [
    { dataKey: nameA, label: nameA, color: '#1463ff' },
    { dataKey: nameB, label: nameB, color: '#24d2ff' },
  ] : []

  return (
    <section className="analytics-section">
      <div className="analytics-section-header">
        <div>
          <h3>Project Comparison</h3>
          <p>Compare two projects side by side — completion, quiz scores, and contribution balance.</p>
        </div>
      </div>

      <div className="compare-selector-row">
        <label className="form-field">
          <span>Project A</span>
          <select value={projectA} onChange={(e) => { setProjectA(e.target.value); setComparison(null) }}>
            <option value="">Select project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === projectB}>{p.name}</option>
            ))}
          </select>
        </label>
        <div className="compare-vs">vs</div>
        <label className="form-field">
          <span>Project B</span>
          <select value={projectB} onChange={(e) => { setProjectB(e.target.value); setComparison(null) }}>
            <option value="">Select project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === projectA}>{p.name}</option>
            ))}
          </select>
        </label>
        <button
          className="primary-button compare-run-btn"
          type="button"
          disabled={!projectA || !projectB || projectA === projectB || isLoading}
          onClick={handleCompare}
        >
          <GitCompare size={14} aria-hidden="true" />
          {isLoading ? 'Comparing…' : 'Compare'}
        </button>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      {pA && pB ? (
        <div className="compare-result">
          <div className="compare-cards-row">
            <div className="compare-proj-card compare-proj-a">
              <p className="compare-proj-label">Project A</p>
              <h4>{nameA}</h4>
              <div className="compare-proj-stats">
                <div><span>Completion</span><strong>{Math.round(Number(pA.completion ?? 0))}%</strong></div>
                <div><span>Groups</span><strong>{pA.groupCount ?? '—'}</strong></div>
                <div><span>Tasks</span><strong>{pA.taskCount ?? '—'}</strong></div>
                <div><span>Quiz Score</span><strong>{pA.quizLearningScore != null ? `${Math.round(Number(pA.quizLearningScore))}%` : 'N/A'}</strong></div>
                <div><span>Contribution</span><strong>{pA.contributionBalance != null ? `${Math.round(Number(pA.contributionBalance))}%` : 'N/A'}</strong></div>
              </div>
            </div>
            <div className="compare-proj-card compare-proj-b">
              <p className="compare-proj-label">Project B</p>
              <h4>{nameB}</h4>
              <div className="compare-proj-stats">
                <div><span>Completion</span><strong>{Math.round(Number(pB.completion ?? 0))}%</strong></div>
                <div><span>Groups</span><strong>{pB.groupCount ?? '—'}</strong></div>
                <div><span>Tasks</span><strong>{pB.taskCount ?? '—'}</strong></div>
                <div><span>Quiz Score</span><strong>{pB.quizLearningScore != null ? `${Math.round(Number(pB.quizLearningScore))}%` : 'N/A'}</strong></div>
                <div><span>Contribution</span><strong>{pB.contributionBalance != null ? `${Math.round(Number(pB.contributionBalance))}%` : 'N/A'}</strong></div>
              </div>
            </div>
          </div>
          {compChartData.length > 0 && (
            <AnalyticsChart
              data={compChartData}
              title="Side-by-Side Comparison"
              type="bar"
              series={compareSeries}
              max={100}
              valueSuffix="%"
              xKey="metric"
            />
          )}
        </div>
      ) : null}
    </section>
  )
}
