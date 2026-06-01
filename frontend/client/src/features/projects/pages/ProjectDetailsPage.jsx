import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'
import { USER_ROLES } from '../../auth/constants/roles'
import { DeadlineForm } from '../components/DeadlineForm'
import { formatProjectType } from '../constants/projectTypes'
import { useProjectDetails } from '../hooks/useProjectDetails'
import { archiveProject, reopenProject, rescheduleProjectDeadline } from '../services/projectService'

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not set'
}

function stringifyRubrics(value) {
  if (!value) return 'No rubrics provided.'
  if (typeof value === 'string') return value
  if (value.text) return value.text
  return JSON.stringify(value, null, 2)
}

function formatClasses(project) {
  const classes = project.classes?.length ? project.classes : project.class ? [project.class] : []
  if (classes.length === 0) return 'No classes assigned'
  return classes.map((classItem) => `${classItem.name}${classItem.section ? ` - ${classItem.section}` : ''}`).join(', ')
}

export function ProjectDetailsPage() {
  const { id } = useParams()
  const { role } = useAuth()
  const { error, isLoading, project, setProject } = useProjectDetails(id)
  const isProfessor = role === USER_ROLES.PROFESSOR

  async function handleArchive() {
    setProject(await archiveProject(id))
  }

  async function handleReopen() {
    setProject(await reopenProject(id))
  }

  async function handleDeadline(deadlineAt) {
    setProject(await rescheduleProjectDeadline(id, deadlineAt))
  }

  if (isLoading) return <div className="route-state">Loading project...</div>
  if (error || !project) return <section className="content-section"><h2>Project unavailable</h2><p>{error || 'Unable to load project.'}</p></section>

  return (
    <section className="module-page project-details-page">
      <div className="module-header">
        <div className="project-details-title-wrap">
          <p className="eyebrow">{formatProjectType(project.projectType)}</p>
          <h2>{project.title}</h2>
          <p className="project-details-classes">{formatClasses(project)}</p>
        </div>
        <div className="class-code-box">
          <span>Status</span>
          <strong>{project.status}</strong>
        </div>
      </div>

      <dl className="count-grid project-details-stats">
        <div className="count-tile"><dt>Year Level</dt><dd>{project.yearLevel}</dd></div>
        <div className="count-tile"><dt>Mode</dt><dd>{project.workMode}</dd></div>
        <div className="count-tile"><dt>Members</dt><dd>{project.memberCount ?? 1}</dd></div>
        <div className="count-tile"><dt>Release</dt><dd>{formatDate(project.releaseAt ?? project.visibilityAt)}</dd></div>
        <div className="count-tile"><dt>Deadline</dt><dd>{formatDate(project.deadlineAt)}</dd></div>
      </dl>

      {isProfessor ? (
        <div className="project-action-row">
          {project.status === 'archived' ? (
            <button className="secondary-button" type="button" onClick={handleReopen}>Reopen project</button>
          ) : (
            <button className="danger-button" type="button" onClick={handleArchive}>Archive project</button>
          )}
          <Link className="secondary-link-button" to={`/professor/projects/${id}/validation`}>Analyze Project</Link>
          <DeadlineForm currentDeadline={project.deadlineAt} onSave={handleDeadline} />
        </div>
      ) : null}

      <div className="detail-grid project-details-grid">
        <section className="project-details-card"><h3>Description</h3><p>{project.description}</p></section>
        <section className="project-details-card"><h3>Guidelines</h3><p>{project.guidelines || 'No guidelines provided.'}</p></section>
        <section className="project-details-card project-details-rubric"><h3>Rubrics</h3><pre className="rubric-block">{stringifyRubrics(project.rubrics)}</pre></section>
        <section className="project-details-card">
          <h3>Schedule</h3>
          <p>Starts: {formatDate(project.startAt)}</p>
          <p>Releases: {formatDate(project.releaseAt ?? project.visibilityAt)}</p>
          <p>Deadline: {formatDate(project.deadlineAt)}</p>
        </section>
      </div>
    </section>
  )
}
