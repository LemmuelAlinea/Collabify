function formatCategory(value) {
  return value.replaceAll('_', ' ')
}

function scoreTone(score) {
  if (score >= 80) return 'strong'
  if (score >= 60) return 'steady'
  return 'risk'
}

export function ValidationReport({ onDecision, validation }) {
  if (!validation) return <div className="empty-state"><h3>No validation yet</h3><p>Run an AI analysis before release.</p></div>

  return (
    <article className="validation-report">
      <div className="validation-report-hero">
        <div className="validation-report-copy">
          <p className="eyebrow">Validation result</p>
          <h3>{validation.readinessLabel}</h3>
          <p>{validation.executiveSummary}</p>
        </div>
        <div className="validation-scorebar">
          <div className={`validation-score-tile ${scoreTone(validation.readinessScore)}`}>
            <span>Readiness</span>
            <strong>{validation.readinessScore}%</strong>
            <p>{validation.readinessLabel}</p>
          </div>
          <div className={`validation-score-tile ${scoreTone(validation.difficultyScore)}`}>
            <span>Difficulty</span>
            <strong>{validation.difficultyScore}%</strong>
            <p>{validation.difficultyLabel}</p>
          </div>
        </div>
      </div>

      <section className="validation-section validation-score-section">
        <div className="validation-section-heading">
          <div>
            <p className="eyebrow">Academic signals</p>
            <h3>Scores</h3>
          </div>
        </div>
        <div className="validation-grid">
          {validation.scores.map((score) => (
            <div className={`validation-card ${scoreTone(score.score)}`} key={score.id}>
              <span>{formatCategory(score.category)}</span>
              <strong>{score.score}%</strong>
              <div className="validation-card-meter" aria-hidden="true">
                <i style={{ width: `${score.score}%` }} />
              </div>
              <p>{score.explanation}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="validation-insight-grid">
        <section className="validation-section">
          <div className="validation-section-heading">
            <div>
              <p className="eyebrow">Attention</p>
              <h3>Risks</h3>
            </div>
          </div>
          <div className="validation-list">
            {validation.risks.map((risk) => (
              <div className="validation-row validation-risk-row" key={risk.id}>
                <span>{risk.severity}</span>
                <strong>{formatCategory(risk.riskType)}</strong>
                <p>{risk.reason}</p>
                <small>{risk.mitigation}</small>
              </div>
            ))}
          </div>
        </section>
        <section className="validation-section">
          <div className="validation-section-heading">
            <div>
              <p className="eyebrow">Next steps</p>
              <h3>Recommendations</h3>
            </div>
          </div>
          <div className="validation-list">
            {validation.recommendations.map((item) => (
              <div className="validation-row validation-recommendation-row" key={item.id}>
                <span>{item.priority}</span>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="validation-section validation-report-detail-section">
        <div className="validation-section-heading">
          <div>
            <p className="eyebrow">Full report</p>
            <h3>Review notes</h3>
          </div>
        </div>
        <div className="detail-grid">
          {Object.entries(validation.fullReport?.validationReport ?? {}).map(([key, value]) => (
            <section key={key}>
              <h3>{formatCategory(key)}</h3>
              <p>{value}</p>
            </section>
          ))}
        </div>
      </section>

      <div className="button-row validation-decision-row">
        <button className="primary-button" type="button" onClick={() => onDecision(validation.id, 'accepted_suggestions')}>Accept Suggestions</button>
        <button className="secondary-button" type="button" onClick={() => onDecision(validation.id, 'ignored_suggestions')}>Ignore Suggestions</button>
      </div>
    </article>
  )
}
