import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'
import { Link } from 'react-router-dom'
import { MoreHorizontal } from 'lucide-react'

function activeMembers(group) {
  return (group.members ?? []).filter((member) => member.status !== 'removed')
}

function memberLimit(group) {
  return group.memberLimit ?? group.project?.memberCount ?? 1
}

function classLabel(group) {
  const name = group.class?.name ?? group.class?.title ?? 'Class'
  return `${name}${group.class?.section ? ` / ${group.class.section}` : ''}`
}

export function GroupCard({ group, onAddMember, onLock, onManage }) {
  const { role, user } = useAuth()
  const members = activeMembers(group)
  const isProfessor = role === USER_ROLES.PROFESSOR
  const isLeader = members.some((member) => member.userId === user?.id && member.isLeader)
  const canManage = isProfessor || isLeader

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
          <dd>{classLabel(group)}</dd>
        </div>
        <div>
          <dt>Members</dt>
          <dd>{members.length} / {memberLimit(group)}</dd>
        </div>
        <div>
          <dt>Group ID</dt>
          <dd>{group.id}</dd>
        </div>
      </dl>
      <div className="member-list">
        {members.length > 0
          ? members.map((member) => (
            <div className="member-row compact-member-row" key={member.id}>
              <span>{member.displayName}</span>
              <span>{member.isLeader ? 'Leader' : 'Member'}</span>
            </div>
          ))
          : <p className="muted-copy">No members yet.</p>}
      </div>
      {isProfessor && canManage ? (
        <details className="card-menu">
          <summary aria-label="Group actions"><MoreHorizontal size={18} aria-hidden="true" /></summary>
          <div className="card-menu-panel">
            <Link to={`/professor/groups/${group.id}`}>View details</Link>
            <button type="button" onClick={() => onManage(group)}>Manage group</button>
            <button type="button" onClick={() => onAddMember(group)}>Add member</button>
            <button type="button" onClick={() => onLock(group.id, !group.isLocked)}>
              {group.isLocked ? 'Unlock group' : 'Lock group'}
            </button>
          </div>
        </details>
      ) : null}
      {role === USER_ROLES.STUDENT ? (
        <div className="card-actions">
          <Link className="secondary-link-button" to={`/student/groups/${group.id}`}>Open group</Link>
        </div>
      ) : null}
    </article>
  )
}
