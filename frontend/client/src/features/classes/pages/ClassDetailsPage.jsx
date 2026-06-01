import { Link, useParams } from 'react-router-dom'
import { AnnouncementPanel } from '../../announcements/components/AnnouncementPanel'
import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'
import { useClassDetails } from '../hooks/useClassDetails'

function CountTile({ label, value }) {
  return (
    <div className="count-tile">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : 'Not set'
}

export function ClassDetailsPage() {
  const { id } = useParams()
  const { role } = useAuth()
  const { details, error, isLoading } = useClassDetails(id)

  if (isLoading) return <div className="route-state">Loading class...</div>

  if (error || !details) {
    return <section className="content-section"><h2>Class unavailable</h2><p>{error || 'Unable to load class.'}</p></section>
  }

  const classItem = details.class
  const projectBasePath = role === USER_ROLES.PROFESSOR ? '/professor/projects' : '/student/projects'
  const messagesBasePath = role === USER_ROLES.PROFESSOR ? '/professor/messages' : '/student/messages'

  return (
    <section className="module-page class-details-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">{classItem.subject}</p>
          <h2>{classItem.name}</h2>
          <p>{classItem.section} - Year {classItem.yearLevel} - {classItem.semester} - {classItem.schoolYear}</p>
        </div>
        <div className="class-code-box">
          <span>Class code</span>
          <strong>{classItem.classCode}</strong>
        </div>
      </div>

      <dl className="count-grid">
        <CountTile label="Announcements" value={details.announcements.length} />
        <CountTile label="Members" value={details.members.length} />
        <CountTile label="Projects" value={details.projects.length} />
        <CountTile label="Syllabi" value={details.syllabi.length} />
      </dl>

      <div className="detail-grid">
        <section>
          <AnnouncementPanel classId={classItem.id} initialAnnouncements={details.announcements} />
        </section>
        <section>
          <h3>Members</h3>
          {details.members.map((member) => <p key={member.id}>{member.displayName} - {member.role}</p>)}
        </section>
        <section>
          <h3>Class Chat</h3>
          <p>{details.classChat ? 'Chat room is ready.' : 'No chat room found.'}</p>
          {details.classChat ? (
            <Link className="primary-button" to={`${messagesBasePath}?scope=class&classId=${classItem.id}`}>Open chat</Link>
          ) : null}
        </section>
        <section>
          <h3>Projects</h3>
          {details.projects.map((project) => (
            <p key={project.id}>
              <Link to={`${projectBasePath}/${project.id}`}>{project.title}</Link> - releases {formatDate(project.releaseAt ?? project.visibilityAt)}
            </p>
          ))}
          {details.projects.length === 0 ? <p>No projects yet.</p> : null}
        </section>
      </div>
    </section>
  )
}
