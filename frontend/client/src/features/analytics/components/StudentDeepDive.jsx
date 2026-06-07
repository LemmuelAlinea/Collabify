import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

function pct(v, fallback = '—') {
  if (v === null || v === undefined) return fallback
  return `${Math.round(Number(v))}%`
}

export function StudentDeepDive({ student, groupRows, studentRows }) {
  if (!student) return null

  const radarData = [
    { subject: 'Task Completion', value: Math.round(Number(student.taskCompletion ?? 0)) },
    { subject: 'Contribution', value: Math.round(Number(student.contributionScore ?? 0)) },
    { subject: 'Quiz Score', value: student.quizScore != null ? Math.round(Number(student.quizScore)) : 0 },
  ]

  const groupMembers = studentRows.filter((s) => s.groupName === student.groupName)
  const ranked = [...groupMembers].sort((a, b) => Number(b.contributionScore ?? 0) - Number(a.contributionScore ?? 0))
  const rank = ranked.findIndex((s) => s.studentId === student.studentId) + 1
  const groupData = groupRows.find((g) => g.groupName === student.groupName)

  return (
    <section className="analytics-section analytics-deep-dive">
      <div className="analytics-section-header">
        <div>
          <p className="eyebrow">Student Deep Dive</p>
          <h3>{student.studentName}</h3>
          <p>{student.groupName} · {student.projectName} · {student.email}</p>
        </div>
      </div>

      <div className="deep-dive-body">
        <div className="deep-dive-radar">
          <p className="deep-dive-radar-label">Performance Radar</p>
          <ResponsiveContainer width="100%" height={260} minWidth={1} minHeight={1}>
            <RadarChart data={radarData} margin={{ top: 12, right: 32, bottom: 12, left: 32 }}>
              <PolarGrid stroke="rgba(148,163,184,0.15)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tickCount={4}
                tick={{ fontSize: 10, fill: '#475569' }}
                stroke="none"
              />
              <Radar
                dataKey="value"
                stroke="#1463ff"
                fill="#1463ff"
                fillOpacity={0.18}
                strokeWidth={2}
                dot={{ r: 4, fill: '#1463ff', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#28d7ff', strokeWidth: 0 }}
              />
              <Tooltip
                contentStyle={{ background: 'rgba(12,22,40,0.96)', border: '1px solid rgba(40,215,255,0.18)', borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: '#e2e8f0', fontWeight: 700 }}
                formatter={(v) => [`${v}%`]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="deep-dive-metrics">
          <div className="deep-dive-stat">
            <span>Tasks</span>
            <strong>{student.completedTasks}/{student.assignedTasks}</strong>
            <p>Completed / Assigned</p>
          </div>
          <div className="deep-dive-stat">
            <span>Task Completion</span>
            <strong>{pct(student.taskCompletion)}</strong>
            <p>vs {pct(groupData?.completion ?? 0)} group avg</p>
          </div>
          <div className="deep-dive-stat">
            <span>Contribution</span>
            <strong>{pct(student.contributionScore)}</strong>
            <p>Earned task points</p>
          </div>
          <div className="deep-dive-stat">
            <span>Quiz Score</span>
            <strong>{pct(student.quizScore, 'No quiz')}</strong>
            <p>Learning evaluation</p>
          </div>
          {rank > 0 && (
            <div className="deep-dive-stat">
              <span>Group Rank</span>
              <strong>#{rank} <small>/ {groupMembers.length}</small></strong>
              <p>By contribution in {student.groupName}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
