function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function typeLabel(type) {
  return type
    .split('_')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')
}

export function ContributionTimeline({ logs }) {
  return (
    <div className="contribution-timeline">
      {logs.map((log) => (
        <article className="timeline-event" key={log.id}>
          <div>
            <strong>{typeLabel(log.contributionType)}</strong>
            <p>{log.description || 'Contribution logged'}</p>
            <small>{log.displayName} · {log.projectTitle || 'Project'} · {formatDate(log.loggedAt)}</small>
          </div>
          <span>{log.points} pts</span>
        </article>
      ))}
      {logs.length === 0 ? <p>No contribution events yet.</p> : null}
    </div>
  )
}
