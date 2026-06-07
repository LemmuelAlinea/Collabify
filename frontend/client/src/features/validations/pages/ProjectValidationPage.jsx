import { Link, useParams } from 'react-router-dom'
import { useProjectDetails } from '../../projects/hooks/useProjectDetails'
import { useProjectValidations } from '../hooks/useProjectValidations'
import { ValidationReport } from '../components/ValidationReport'

export function ProjectValidationPage() {
  const { id } = useParams()
  const { project } = useProjectDetails(id)
  const {
    analyze,
    decide,
    error,
    isAnalyzing,
    isLoading,
    validations,
  } = useProjectValidations(id)
  const activeValidation = validations[0]

  if (isLoading) return <div className="route-state">Loading validation...</div>

  return (
    <section className="module-page project-validation-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">Academic Project Adviser Assistant</p>
          <h2>{project?.title ?? 'Project Validation'}</h2>
          <p>AI recommendations only. Final release decision belongs to the professor.</p>
        </div>
        <div className="button-row">
          <Link className="secondary-link-button" to={`/professor/projects/${id}`}>Project</Link>
          <button className="primary-button" type="button" disabled={isAnalyzing} onClick={analyze}>
            {isAnalyzing ? 'Analyzing...' : activeValidation ? 'Reanalyze Project' : 'Analyze Project'}
          </button>
        </div>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <ValidationReport validation={activeValidation} onDecision={decide} />
      <section className="validation-section">
        <h3>Validation History</h3>
        <div className="validation-list">
          {validations.map((validation) => (
            <article className="validation-row" key={validation.id}>
              <strong>Version {validation.version}</strong>
              <p>{validation.readinessScore}% - {validation.readinessLabel}</p>
              <small>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(validation.createdAt))}</small>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
