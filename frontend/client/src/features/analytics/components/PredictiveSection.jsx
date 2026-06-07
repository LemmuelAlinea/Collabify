import { Clock, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function daysLeft(deadlineAt) {
  if (!deadlineAt) return null
  return Math.round((new Date(deadlineAt) - Date.now()) / 86400000)
}

function forecastTier(deadlineRisk) {
  const r = Number(deadlineRisk ?? 0)
  if (r > 70) return 'critical'
  if (r > 40) return 'risk'
  return 'on-track'
}

const FORECAST_META = {
  'on-track': { Icon: TrendingUp, label: 'On Track' },
  risk: { Icon: Minus, label: 'At Risk' },
  critical: { Icon: TrendingDown, label: 'Critical' },
}

export function PredictiveSection({ projectRows }) {
  if (!projectRows.length) return null

  const chartData = projectRows.map((row) => ({
    name: row.projectName.length > 14 ? `${row.projectName.slice(0, 14)}…` : row.projectName,
    completion: Math.round(Number(row.completion ?? 0)),
    risk: Math.round(Number(row.deadlineRisk ?? 0)),
  }))

  return (
    <section className="analytics-section">
      <div className="analytics-section-header">
        <div>
          <h3>Predictive Completion</h3>
          <p>Current pace vs deadline — forecasts based on completion rate and deadline risk.</p>
        </div>
      </div>

      <div className="predictive-grid">
        {projectRows.map((row) => {
          const days = daysLeft(row.deadlineAt)
          const completion = Math.round(Number(row.completion ?? 0))
          const fc = forecastTier(row.deadlineRisk)
          const { Icon, label } = FORECAST_META[fc]
          const pace = days > 0 ? ((100 - completion) / days).toFixed(1) : null

          return (
            <div key={row.projectId} className={`predictive-card predictive-${fc}`}>
              <div className="predictive-card-top">
                <strong>{row.projectName}</strong>
                <span className={`predictive-badge predictive-badge-${fc}`}>
                  <Icon size={11} aria-hidden="true" />
                  {label}
                </span>
              </div>
              <div className="predictive-progress-wrap">
                <div className="predictive-progress-bar" style={{ width: `${completion}%` }} />
                <span>{completion}%</span>
              </div>
              <div className="predictive-meta">
                {days !== null && (
                  <span className={`predictive-days${days <= 3 ? ' predictive-urgent' : ''}`}>
                    <Clock size={11} aria-hidden="true" />
                    {days <= 0 ? 'Overdue' : `${days}d left`}
                  </span>
                )}
                {pace && days > 0 ? <span>{pace}%/day needed</span> : null}
                <span>{row.groupCount} group{row.groupCount !== 1 ? 's' : ''} · {row.taskCount} tasks</span>
              </div>
            </div>
          )
        })}
      </div>

      {chartData.length > 0 && (
        <div className="analytics-chart">
          <div className="analytics-chart-heading">
            <h3>Completion vs Deadline Risk</h3>
          </div>
          <div className="analytics-chart-body">
            <ResponsiveContainer width="100%" height={220} minWidth={1} minHeight={1}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="4 8" vertical={false} stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ background: 'rgba(12,22,40,0.96)', border: '1px solid rgba(40,215,255,0.18)', borderRadius: 10, fontSize: 12, color: '#e2e8f0' }}
                  labelStyle={{ color: '#e2e8f0', fontWeight: 700, marginBottom: 4 }}
                  itemStyle={{ color: '#cbd5e1' }}
                />
                <ReferenceLine y={100} stroke="rgba(40,215,255,0.2)" strokeDasharray="4 4" />
                <Bar dataKey="completion" name="Completion %" fill="#1463ff" radius={[5, 5, 0, 0]} maxBarSize={52} />
                <Line dataKey="risk" name="Deadline Risk %" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }} type="monotone" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="analytics-chart-legend">
            <span className="analytics-chart-legend-item"><span style={{ background: '#1463ff' }} />Completion %</span>
            <span className="analytics-chart-legend-item"><span style={{ background: '#ef4444' }} />Deadline Risk %</span>
          </div>
        </div>
      )}
    </section>
  )
}
