import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { AnalyticsChart } from './AnalyticsChart'

function quadrantColor(x, y) {
  if (x >= 50 && y >= 50) return '#20e681'
  if (x >= 50 && y < 50) return '#f59e0b'
  if (x < 50 && y >= 50) return '#24d2ff'
  return '#ef4444'
}

const LEARNING_SERIES = [
  { dataKey: 'quiz', label: 'Quiz Score', color: '#8b5cf6' },
  { dataKey: 'completion', label: 'Task Completion', color: '#20e681' },
]

const COHESION_SERIES = [
  { dataKey: 'topContrib', label: 'Top Contributor', color: '#1463ff' },
  { dataKey: 'lowContrib', label: 'Lowest Contributor', color: '#ef4444' },
]

export function InsightCards({ groupRows, studentRows }) {
  const scatterData = groupRows.map((row) => ({
    x: Math.round(Number(row.contributionBalance ?? 0)),
    y: Math.round(Number(row.completion ?? 0)),
    name: row.groupName,
  }))

  const learningData = groupRows
    .filter((row) => row.quizLearningScore != null)
    .map((row) => ({
      label: row.groupName.length > 12 ? `${row.groupName.slice(0, 12)}…` : row.groupName,
      quiz: Math.round(Number(row.quizLearningScore ?? 0)),
      completion: Math.round(Number(row.completion ?? 0)),
    }))

  const cohesionData = groupRows.map((row) => {
    const members = studentRows.filter((s) => s.groupName === row.groupName)
    if (members.length < 2) return null
    const scores = members.map((m) => Number(m.contributionScore ?? 0))
    return {
      label: row.groupName.length > 12 ? `${row.groupName.slice(0, 12)}…` : row.groupName,
      topContrib: Math.round(Math.max(...scores)),
      lowContrib: Math.round(Math.min(...scores)),
    }
  }).filter(Boolean)

  return (
    <section className="analytics-section">
      <div className="analytics-section-header">
        <div>
          <h3>Combined Insights</h3>
          <p>Two data sources merged — reveals patterns invisible in single metrics.</p>
        </div>
      </div>

      <div className="insights-grid">
        {/* Effort vs Output Scatter */}
        <div className="analytics-chart">
          <div className="analytics-chart-heading">
            <h3>Effort vs Output</h3>
            <p className="chart-sub">Contribution balance (x) vs task completion (y) per group</p>
          </div>
          <div className="analytics-chart-body">
            {scatterData.length ? (
              <ResponsiveContainer width="100%" height={240} minWidth={1} minHeight={1}>
                <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: -10 }}>
                  <CartesianGrid strokeDasharray="4 8" stroke="rgba(148,163,184,0.1)" />
                  <XAxis
                    type="number" dataKey="x" name="Contribution" domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    label={{ value: 'Contribution %', position: 'insideBottom', offset: -12, fill: '#475569', fontSize: 11 }}
                  />
                  <YAxis
                    type="number" dataKey="y" name="Completion" domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <ZAxis range={[72, 72]} />
                  <ReferenceLine x={50} stroke="rgba(148,163,184,0.18)" strokeDasharray="3 3" />
                  <ReferenceLine y={50} stroke="rgba(148,163,184,0.18)" strokeDasharray="3 3" />
                  <Tooltip
                    contentStyle={{ background: 'rgba(12,22,40,0.96)', border: '1px solid rgba(40,215,255,0.18)', borderRadius: 10, fontSize: 12 }}
                    cursor={{ strokeDasharray: '3 3', stroke: 'rgba(148,163,184,0.2)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]?.payload
                      if (!d) return null
                      return (
                        <div className="analytics-chart-tooltip">
                          <div className="analytics-chart-tooltip-label">{d.name}</div>
                          <div className="analytics-chart-tooltip-row">
                            <span className="analytics-chart-dot" style={{ background: '#24d2ff' }} />
                            <span>Contribution</span>
                            <strong>{d.x}%</strong>
                          </div>
                          <div className="analytics-chart-tooltip-row">
                            <span className="analytics-chart-dot" style={{ background: '#20e681' }} />
                            <span>Completion</span>
                            <strong>{d.y}%</strong>
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Scatter
                    data={scatterData}
                    shape={(props) => {
                      const { cx, cy, payload } = props
                      return (
                        <circle
                          cx={cx} cy={cy} r={10}
                          fill={quadrantColor(payload.x, payload.y)}
                          fillOpacity={0.85}
                          stroke="rgba(255,255,255,0.15)"
                          strokeWidth={1}
                        />
                      )
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            ) : <div className="analytics-chart-empty">No group data</div>}
          </div>
          <div className="scatter-quadrant-legend">
            <span style={{ '--q': '#20e681' }}>High Effort + High Output</span>
            <span style={{ '--q': '#f59e0b' }}>High Effort + Low Output</span>
            <span style={{ '--q': '#24d2ff' }}>Low Effort + High Output</span>
            <span style={{ '--q': '#ef4444' }}>Low Effort + Low Output</span>
          </div>
        </div>

        {learningData.length > 0 && (
          <AnalyticsChart
            data={learningData}
            title="Learning vs Doing"
            type="bar"
            series={LEARNING_SERIES}
            max={100}
            valueSuffix="%"
          />
        )}

        {cohesionData.length > 0 && (
          <AnalyticsChart
            data={cohesionData}
            title="Group Cohesion Risk"
            type="bar"
            series={COHESION_SERIES}
            max={100}
            valueSuffix="%"
          />
        )}
      </div>
    </section>
  )
}
