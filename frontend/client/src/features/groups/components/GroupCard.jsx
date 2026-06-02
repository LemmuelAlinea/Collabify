import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'
import { Link } from 'react-router-dom'

function activeMembers(group) {
  return group.members.filter((member) => member.status === 'active')
}

export function GroupCard({ group, onLock, onMemberUpdate }) {
  const { role, user } = useAuth()
  const members = activeMembers(group)
  const isProfessor = role === USER_ROLES.PROFESSOR
  const isLeader = members.some((member) => member.userId === user?.id && member.isLeader)
  const canManage = isProfessor || isLeader
  const showInlineManagement = isProfessor

  return (
    <article className="group-card">
      <div>
        <div className="project-card-heading">
          <p className="eyebrow">{group.project?.title ?? 'Project group'}</p>
          <span>{group.isLocked ? 'locked' : 'open'}</span>
        </div>
        <h3>{group.name}</h3>
        <p>{group.description || 'No description provided.'}</p>
      </div>
      <dl className="compact-details">
        <div>
          <dt>Class</dt>
          <dd>{group.class?.name ?? 'Class'} {group.class?.section ? `/ ${group.class.section}` : ''}</dd>
        </div>
        <div>
          <dt>Members</dt>
          <dd>{members.length} / {group.project?.memberCount ?? 1}</dd>
        </div>
        <div>
          <dt>Group ID</dt>
          <dd>{group.id}</dd>
        </div>
      </dl>
      <div className="member-list">
        {members.map((member) => (
          <div className="member-row compact-member-row" key={member.id}>
            <span>{member.displayName}</span>
            <span>{member.isLeader ? 'Leader' : 'Member'}</span>
          </div>
        ))}
      </div>
      {showInlineManagement && canManage ? (
        <div className="card-actions">
          <button className="secondary-button" type="button" onClick={() => onLock(group.id, !group.isLocked)}>
            {group.isLocked ? 'Unlock group' : 'Lock group'}
          </button>
        </div>
      ) : null}
      {role === USER_ROLES.STUDENT ? (
        <div className="card-actions">
          <Link className="secondary-link-button" to={`/student/groups/${group.id}`}>Open group</Link>
        </div>
      ) : null}
    </article>
  )
}
