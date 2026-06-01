function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatAction(action) {
  return action.replaceAll('_', ' ')
}

export function ActivityTimeline({ activity }) {
  return (
    <div className="activity-timeline">
      {activity.map((item) => (
        <article className="activity-event" key={item.id}>
          <span />
          <div>
            <strong>{formatAction(item.action)}</strong>
            <p>{item.actorName} {item.metadata?.title || item.metadata?.task || item.metadata?.name || ''}</p>
            <small>{formatDate(item.createdAt)}</small>
          </div>
        </article>
      ))}
      {activity.length === 0 ? <div className="empty-state"><h3>No activity</h3><p>Activity will appear here.</p></div> : null}
    </div>
  )
}
