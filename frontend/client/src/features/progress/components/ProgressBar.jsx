export function ProgressBar({ label, value }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))

  return (
    <div className="progress-bar-block">
      <div className="progress-label-row">
        <span>{label}</span>
        <strong>{safeValue}%</strong>
      </div>
      <div className="progress-track" aria-hidden="true">
        <span style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  )
}
