function typeLabel(type) {
  return type
    .split('_')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')
}

export function ContributionTypeChart({ items }) {
  const maxPoints = Math.max(...items.map((item) => item.points), 1)

  return (
    <div className="contribution-type-chart">
      {items.map((item) => (
        <div className="contribution-type-row" key={item.type}>
          <div>
            <strong>{typeLabel(item.type)}</strong>
            <span>{item.count} events · {item.points} pts</span>
          </div>
          <div className="progress-track" aria-hidden="true">
            <span style={{ width: `${Math.max(4, (item.points / maxPoints) * 100)}%` }} />
          </div>
        </div>
      ))}
      {items.length === 0 ? <p>No contribution types yet.</p> : null}
    </div>
  )
}
