export function RiskReportList({ risks = [], recommendations = [], alerts = [] }) {
  return (
    <div className="health-report-grid">
      <section className="analytics-panel">
        <h3>Risk Reports</h3>
        <div className="validation-list">
          {risks.map((risk) => (
            <article className="validation-row" key={risk.id}>
              <strong>{risk.severity} {risk.risk_type}</strong>
              <p>{risk.description}</p>
              <small>{risk.probability}% probability</small>
            </article>
          ))}
          {risks.length === 0 ? <p>No active risks.</p> : null}
        </div>
      </section>
      <section className="analytics-panel">
        <h3>Recommendations</h3>
        <div className="validation-list">
          {recommendations.map((item) => (
            <article className="validation-row" key={item.id}>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              <small>{item.priority}</small>
            </article>
          ))}
          {recommendations.length === 0 ? <p>No recommendations.</p> : null}
        </div>
      </section>
      <section className="analytics-panel">
        <h3>Alerts</h3>
        <div className="validation-list">
          {alerts.map((alert) => (
            <article className="validation-row" key={alert.id}>
              <strong>{alert.title}</strong>
              <p>{alert.body}</p>
              <small>{alert.severity}</small>
            </article>
          ))}
          {alerts.length === 0 ? <p>No alerts.</p> : null}
        </div>
      </section>
    </div>
  )
}
