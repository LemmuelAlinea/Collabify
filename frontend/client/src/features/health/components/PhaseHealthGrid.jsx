export function PhaseHealthGrid({ phases = [] }) {
  return (
    <section className="analytics-panel">
      <h3>Phase Health</h3>
      <div className="health-phase-grid">
        {phases.map((phase) => (
          <article className="metric-card" key={phase.id}>
            <span>{phase.phase}</span>
            <strong>{phase.score}%</strong>
            <p>{phase.completed_count}/{phase.task_count} tasks · {phase.overdue_count} overdue</p>
          </article>
        ))}
        {phases.length === 0 ? <p>No phase data.</p> : null}
      </div>
    </section>
  )
}
