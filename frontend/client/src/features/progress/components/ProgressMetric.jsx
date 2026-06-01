export function ProgressMetric({ label, value, hint }) {
  return (
    <article className="progress-metric">
      <p>{label}</p>
      <strong>{value}</strong>
      {hint ? <span>{hint}</span> : null}
    </article>
  )
}
