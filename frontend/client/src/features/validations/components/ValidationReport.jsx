function formatCategory(value) {
  return value.replaceAll('_', ' ')
}

export function ValidationReport({ onDecision, validation }) {
  if (!validation) return <div className="empty-state"><h3>No validation yet</h3><p>Run an AI analysis before release.</p></div>

  return (
    <article className="validation-report">
      <div className="validation-scorebar">
        <div>
          <span>Readiness</span>
          <strong>{validation.readinessScore}%</strong>
          <p>{validation.readinessLabel}</p>
        </div>
        <div>
          <span>Difficulty</span>
          <strong>{validation.difficultyScore}%</strong>
          <p>{validation.difficultyLabel}</p>
        </div>
      </div>
      <section className="analytics-panel">
        <h3>Executive Summary</h3>
        <p>{validation.executiveSummary}</p>
      </section>
      <section className="validation-section">
        <h3>Scores</h3>
        <div className="validation-grid">
          {validation.scores.map((score) => (
            <div className="validation-card" key={score.id}>
              <span>{formatCategory(score.category)}</span>
              <strong>{score.score}%</strong>
              <p>{score.explanation}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="validation-section">
        <h3>Risks</h3>
        <div className="validation-list">
          {validation.risks.map((risk) => (
            <div className="validation-row" key={risk.id}>
              <strong>{risk.severity} {risk.riskType}</strong>
              <p>{risk.reason}</p>
              <small>{risk.mitigation}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="validation-section">
        <h3>Recommendations</h3>
        <div className="validation-list">
          {validation.recommendations.map((item) => (
            <div className="validation-row" key={item.id}>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              <small>{item.priority}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="validation-section">
        <h3>Report</h3>
        <div className="detail-grid">
          {Object.entries(validation.fullReport?.validationReport ?? {}).map(([key, value]) => (
            <section key={key}>
              <h3>{formatCategory(key)}</h3>
              <p>{value}</p>
            </section>
          ))}
        </div>
      </section>
      <div className="button-row">
        <button className="primary-button" type="button" onClick={() => onDecision(validation.id, 'accepted_suggestions')}>Accept Suggestions</button>
        <button className="secondary-button" type="button" onClick={() => onDecision(validation.id, 'ignored_suggestions')}>Ignore Suggestions</button>
      </div>
    </article>
  )
}
