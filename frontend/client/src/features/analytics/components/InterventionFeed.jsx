import { AlertTriangle, BookOpen, MessageCircle, RefreshCw, UserX, Zap } from 'lucide-react'

const URGENCY_ORDER = { critical: 0, warning: 1, info: 2 }

const TYPE_ICONS = {
  'Inactive Member': UserX,
  'Group Status': Zap,
  'Behind Pace': AlertTriangle,
  'Workload Imbalance': RefreshCw,
  'Low Quiz Score': BookOpen,
  'Struggling Student': MessageCircle,
}

function generateAlerts(groupRows, studentRows) {
  const alerts = []

  groupRows.forEach((group) => {
    const risk = Number(group.deadlineRisk ?? 0)
    const completion = Number(group.completion ?? 0)
    const contrib = Number(group.contributionBalance ?? 0)
    const quiz = group.quizLearningScore != null ? Number(group.quizLearningScore) : null

    // Critical group status
    if (String(group.status ?? '').toLowerCase().includes('critical') || risk > 70) {
      alerts.push({
        id: `crit-${group.groupId}`,
        urgency: 'critical',
        type: 'Group Status',
        target: group.groupName,
        context: group.projectName,
        issue: `${Math.round(completion)}% complete with ${Math.round(risk)}% deadline risk.`,
        action: 'Urgently review project plan with this group.',
      })
    } else if (risk > 40 && completion < 60) {
      // Behind pace (not critical)
      alerts.push({
        id: `pace-${group.groupId}`,
        urgency: 'warning',
        type: 'Behind Pace',
        target: group.groupName,
        context: group.projectName,
        issue: `${Math.round(completion)}% complete, ${Math.round(risk)}% deadline risk.`,
        action: 'Check timeline and unfinished tasks with group.',
      })
    }

    // Workload imbalance
    if (contrib < 40) {
      alerts.push({
        id: `contrib-${group.groupId}`,
        urgency: 'warning',
        type: 'Workload Imbalance',
        target: group.groupName,
        context: group.projectName,
        issue: `Contribution balance is only ${Math.round(contrib)}% — work is unevenly distributed.`,
        action: 'Redistribute tasks or investigate workload sharing.',
      })
    }

    // Low quiz score
    if (quiz !== null && quiz < 60) {
      alerts.push({
        id: `quiz-${group.groupId}`,
        urgency: 'warning',
        type: 'Low Quiz Score',
        target: group.groupName,
        context: group.projectName,
        issue: `Quiz learning score is ${Math.round(quiz)}% — below the 60% threshold.`,
        action: 'Review learning objectives or course material with group.',
      })
    }
  })

  studentRows.forEach((student) => {
    const contrib = Number(student.contributionScore ?? 0)
    const completion = Number(student.taskCompletion ?? 0)
    const assigned = Number(student.assignedTasks ?? 0)

    // Ghost member: 0 contribution with tasks assigned
    if (contrib === 0 && assigned > 0) {
      alerts.push({
        id: `ghost-${student.studentId}`,
        urgency: 'critical',
        type: 'Inactive Member',
        target: student.studentName,
        context: `${student.groupName} · ${student.projectName}`,
        issue: `0% contribution with ${assigned} assigned task${assigned !== 1 ? 's' : ''} — not participating.`,
        action: 'Schedule a 1-on-1 to check on this student.',
      })
    } else if (completion < 30 && contrib > 0 && contrib < 30 && assigned > 0) {
      // Struggling student
      alerts.push({
        id: `struggle-${student.studentId}`,
        urgency: 'warning',
        type: 'Struggling Student',
        target: student.studentName,
        context: `${student.groupName} · ${student.projectName}`,
        issue: `${Math.round(completion)}% task completion and ${Math.round(contrib)}% contribution.`,
        action: 'Reach out to offer support or clarify expectations.',
      })
    }
  })

  return alerts.sort(
    (a, b) => (URGENCY_ORDER[a.urgency] ?? 2) - (URGENCY_ORDER[b.urgency] ?? 2),
  )
}

export function InterventionFeed({ groupRows, studentRows }) {
  const alerts = generateAlerts(groupRows, studentRows)

  return (
    <section className="analytics-section intervention-feed">
      <div className="analytics-section-header">
        <div>
          <h3>
            Intervention Feed
            {alerts.length > 0 && (
              <span className="intervention-count-badge">{alerts.length}</span>
            )}
          </h3>
          <p>Students and groups that need your attention right now — derived from combined signals.</p>
        </div>
        <div className="intervention-legend">
          <span className="intervention-legend-critical">Critical</span>
          <span className="intervention-legend-warning">Warning</span>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="intervention-empty">
          <span className="intervention-empty-icon" aria-hidden="true">✓</span>
          <strong>All clear</strong>
          <p>No groups or students currently need intervention. Keep monitoring.</p>
        </div>
      ) : (
        <div className="intervention-list">
          {alerts.map((alert) => {
            const Icon = TYPE_ICONS[alert.type] ?? AlertTriangle
            return (
              <div key={alert.id} className={`intervention-item intervention-${alert.urgency}`}>
                <div className={`intervention-dot intervention-dot-${alert.urgency}`} aria-hidden="true" />
                <div className="intervention-icon-wrap" aria-hidden="true">
                  <Icon size={14} />
                </div>
                <div className="intervention-body">
                  <div className="intervention-row-top">
                    <span className={`intervention-type intervention-type-${alert.urgency}`}>{alert.type}</span>
                    <strong className="intervention-target">{alert.target}</strong>
                    <span className="intervention-context">{alert.context}</span>
                  </div>
                  <p className="intervention-issue">{alert.issue}</p>
                  <p className="intervention-action">
                    <span aria-hidden="true">→</span>
                    {alert.action}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
