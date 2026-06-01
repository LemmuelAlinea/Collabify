function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'No forecast'
}

export function HealthScoreCard({ item }) {
  return (
    <article className={`health-card health-${item.status}`}>
      <div className="project-card-heading">
        <p className="eyebrow">{item.statuses?.join(' + ') || item.status}</p>
        <span>{item.score}%</span>
      </div>
      <h3>{item.ai_summary || item.forecast?.summary || 'Project health evaluated.'}</h3>
      <dl className="compact-details">
        <div><dt>Timeline</dt><dd>{item.timeline_adherence}%</dd></div>
        <div><dt>Deadline Risk</dt><dd>{item.deadline_risk}%</dd></div>
        <div><dt>Contribution</dt><dd>{item.contribution_balance}%</dd></div>
        <div><dt>Workload</dt><dd>{item.workload_balance}%</dd></div>
        <div><dt>Inactive</dt><dd>{item.inactivity_days} days</dd></div>
        <div><dt>ETA</dt><dd>{formatDate(item.forecast?.estimatedCompletionAt ?? item.forecast?.estimated_completion_at)}</dd></div>
      </dl>
    </article>
  )
}
