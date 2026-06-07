import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

function healthTier(status, deadlineRisk) {
  const s = String(status ?? '').toLowerCase()
  if (s.includes('critical') || Number(deadlineRisk ?? 0) > 70) return 'critical'
  if (s.includes('risk') || Number(deadlineRisk ?? 0) > 40) return 'risk'
  return 'healthy'
}

const TIER_META = {
  critical: { Icon: XCircle, label: 'Critical' },
  risk: { Icon: AlertTriangle, label: 'At Risk' },
  healthy: { Icon: CheckCircle, label: 'Healthy' },
}

const TIER_ORDER = { critical: 0, risk: 1, healthy: 2 }

export function HealthMatrix({ groupRows, onSelectGroup }) {
  if (!groupRows.length) return null

  const sorted = [...groupRows].sort((a, b) =>
    (TIER_ORDER[healthTier(a.status, a.deadlineRisk)] ?? 2) -
    (TIER_ORDER[healthTier(b.status, b.deadlineRisk)] ?? 2),
  )

  return (
    <section className="analytics-section">
      <div className="analytics-section-header">
        <div>
          <h3>Class Health Matrix</h3>
          <p>Sorted by urgency — click any card to filter by that group.</p>
        </div>
        <div className="health-legend">
          {Object.entries(TIER_META).map(([tier, { label }]) => (
            <span key={tier} className={`health-legend-item health-legend-${tier}`}>{label}</span>
          ))}
        </div>
      </div>
      <div className="health-matrix-grid">
        {sorted.map((row) => {
          const tier = healthTier(row.status, row.deadlineRisk)
          const { Icon, label } = TIER_META[tier]
          const completion = Math.min(100, Math.max(0, Math.round(Number(row.completion ?? 0))))
          const risk = Math.round(Number(row.deadlineRisk ?? 0))
          const contrib = Math.round(Number(row.contributionBalance ?? 0))
          const quiz = row.quizLearningScore != null ? Math.round(Number(row.quizLearningScore)) : null

          return (
            <button
              key={row.groupId}
              className={`health-card health-card-${tier}`}
              type="button"
              onClick={() => onSelectGroup?.(row.groupId)}
            >
              <div className="health-card-top">
                <Icon size={15} className="health-card-icon" aria-hidden="true" />
                <div className="health-card-names">
                  <strong>{row.groupName}</strong>
                  <span>{row.projectName}</span>
                </div>
                <div className={`health-card-badge health-badge-${tier}`}>{label}</div>
              </div>
              <div className="health-card-progress">
                <div className="health-card-bar" style={{ width: `${completion}%` }} />
              </div>
              <div className="health-card-stats">
                <div className="health-stat"><span>Done</span><strong>{completion}%</strong></div>
                <div className="health-stat">
                  <span>Risk</span>
                  <strong className={risk > 60 ? 'stat-red' : risk > 30 ? 'stat-yellow' : ''}>{risk}%</strong>
                </div>
                <div className="health-stat"><span>Contrib</span><strong>{contrib}%</strong></div>
                {quiz !== null && <div className="health-stat"><span>Quiz</span><strong>{quiz}%</strong></div>}
              </div>
              <span className="health-card-members">{row.memberCount} member{row.memberCount !== 1 ? 's' : ''}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
