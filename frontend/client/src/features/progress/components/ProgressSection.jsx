export function ProgressSection({ children, title }) {
  return (
    <section className="progress-section">
      <h3>{title}</h3>
      {children}
    </section>
  )
}
