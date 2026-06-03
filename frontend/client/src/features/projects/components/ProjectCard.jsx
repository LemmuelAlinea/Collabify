import { Link } from 'react-router-dom'
import { MoreHorizontal } from 'lucide-react'
import { useAuth } from '../../auth/hooks/useAuth'
import { USER_ROLES } from '../../auth/constants/roles'
import { formatProjectType } from '../constants/projectTypes'

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : 'Not set'
}

function formatClasses(project) {
  const classes = project.classes?.length ? project.classes : project.class ? [project.class] : []
  if (classes.length === 0) return 'Class'
  if (classes.length === 1) return classes[0].name
  return `${classes[0].name} + ${classes.length - 1} more`
}

export function ProjectCard({ onArchive, onEdit, onReopen, project, viewGroupPath }) {
  const { role } = useAuth()
  const basePath = role === USER_ROLES.PROFESSOR ? '/professor/projects' : '/student/projects'

  return (
    <article className={`project-card ${project.status === 'archived' ? 'is-archived' : ''}`}>
      <div>
        <div className="project-card-heading">
          <p className="eyebrow">{formatProjectType(project.projectType)}</p>
          <span>{project.status}</span>
        </div>
        <h3>{project.title}</h3>
        <p>{project.description}</p>
      </div>
      <dl className="compact-details">
        <div>
          <dt>Classes</dt>
          <dd>{formatClasses(project)}</dd>
        </div>
        <div>
          <dt>Release</dt>
          <dd>{formatDate(project.releaseAt ?? project.visibilityAt)}</dd>
        </div>
        <div>
          <dt>Deadline</dt>
          <dd>{formatDate(project.deadlineAt)}</dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd>{project.workMode} / {project.memberCount ?? 1}</dd>
        </div>
      </dl>
      {role === USER_ROLES.STUDENT ? (
        <div className="card-actions">
          <Link className="secondary-link-button" to={`${basePath}/${project.id}`}>Details</Link>
          {viewGroupPath ? <Link className="secondary-link-button" to={viewGroupPath}>View group</Link> : null}
        </div>
      ) : null}
      {role === USER_ROLES.PROFESSOR ? (
        <details className="card-menu">
          <summary aria-label="Project actions"><MoreHorizontal size={18} aria-hidden="true" /></summary>
          <div className="card-menu-panel">
            <Link to={`${basePath}/${project.id}`}>Details</Link>
            <button type="button" onClick={() => onEdit(project)}>Edit</button>
            <Link to={`${basePath}/${project.id}/validation`}>Analyze</Link>
            <Link to={`/professor/groups?projectId=${project.id}`}>View groups</Link>
            {project.status === 'archived' ? (
              <button type="button" onClick={() => onReopen(project.id)}>Reopen</button>
            ) : (
              <button className="danger-menu-item" type="button" onClick={() => onArchive(project.id)}>Archive</button>
            )}
          </div>
        </details>
      ) : null}
    </article>
  )
}
