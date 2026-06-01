export function HealthTimeline({ history = [] }) {
  return (
    <div className="health-timeline">
      {history.map((event) => (
        <article className="activity-event" key={event.id}>
          <span />
          <div>
            <strong>{event.score}% - {event.status}</strong>
            <p>{event.statuses?.join(', ')}</p>
            <small>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.created_at))}</small>
          </div>
        </article>
      ))}
      {history.length === 0 ? <div className="empty-state"><h3>No health history</h3><p>Health changes will appear here.</p></div> : null}
    </div>
  )
}
