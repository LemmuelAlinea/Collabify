import { useMemo, useState } from 'react'
import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'
import { ProgressBar } from '../../progress/components/ProgressBar'
import { ProgressMetric } from '../../progress/components/ProgressMetric'
import { ProgressSection } from '../../progress/components/ProgressSection'
import { useContributions } from '../hooks/useContributions'

export function ContributionsPage() {
  const { role, user } = useAuth()
  const { contributions, error, isLoading } = useContributions()
  const [classId, setClassId] = useState('')
  const [groupId, setGroupId] = useState('')
  const isProfessor = role === USER_ROLES.PROFESSOR
  const groups = contributions?.groups ?? []
  const members = contributions?.members ?? []
  const tasks = contributions?.tasks ?? []
  const classOptions = useMemo(() => {
    const seen = new Map()
    groups.forEach((group) => {
      if (group.classId && !seen.has(group.classId)) {
        seen.set(group.classId, group.className || 'Class')
      }
    })
    return [...seen].map(([id, name]) => ({ id, name }))
  }, [groups])
  const groupOptions = useMemo(
    () => groups.filter((group) => !classId || group.classId === classId),
    [classId, groups],
  )
  const selectedGroupId = groupId && groupOptions.some((group) => group.id === groupId)
    ? groupId
    : groupOptions[0]?.id || ''
  const visibleGroups = groups.filter((group) => !selectedGroupId || group.id === selectedGroupId)
  const visibleMembers = members.filter((member) => !selectedGroupId || member.groupId === selectedGroupId)
  const visibleTasks = tasks.filter((task) => !selectedGroupId || task.groupId === selectedGroupId)
  const myContribution = visibleMembers.find((member) => member.userId === user?.id)
  const visibleSummary = useMemo(() => ({
    totalEarnedPoints: Math.round(visibleMembers.reduce((sum, member) => sum + member.earnedPoints, 0) * 100) / 100,
    totalMembers: visibleMembers.length,
    totalPotentialPoints: Math.round(visibleMembers.reduce((sum, member) => sum + member.potentialPoints, 0) * 100) / 100,
    totalTasks: visibleTasks.length,
  }), [visibleMembers, visibleTasks])
  const myTasks = useMemo(
    () => visibleTasks.filter((task) => task.owners.some((owner) => owner.userId === user?.id)),
    [user?.id, visibleTasks],
  )

  if (isLoading) return <div className="route-state">Loading contributions...</div>

  if (error || !contributions) {
    return <section className="content-section"><h2>Contributions unavailable</h2><p>{error || 'Unable to load contributions.'}</p></section>
  }

  return (
    <section className="module-page contribution-dashboard">
      <div className="module-header">
        <div>
          <p className="eyebrow">{role}</p>
          <h2>Contribution Tracking</h2>
          <p>Points come only from assigned task ownership. Unassigned work does not add points.</p>
        </div>
      </div>

      <div className="task-filter-row">
        <label className="form-field" htmlFor="contributionClassFilter">
          <span>Class</span>
          <select
            id="contributionClassFilter"
            value={classId}
            onChange={(event) => {
              setClassId(event.target.value)
              setGroupId('')
            }}
          >
            <option value="">All classes</option>
            {classOptions.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>{classItem.name}</option>
            ))}
          </select>
        </label>
        <label className="form-field" htmlFor="contributionGroupFilter">
          <span>Group</span>
          <select id="contributionGroupFilter" value={selectedGroupId} onChange={(event) => setGroupId(event.target.value)}>
            {groupOptions.map((group) => (
              <option key={group.id} value={group.id}>{group.name} - {group.projectTitle || 'Project'}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="progress-metric-grid">
        <ProgressMetric label="Earned points" value={visibleSummary.totalEarnedPoints} hint="from completed assigned tasks" />
        <ProgressMetric label="Potential points" value={visibleSummary.totalPotentialPoints} hint="assigned task ownership total" />
        <ProgressMetric label="Members" value={visibleSummary.totalMembers} hint="active group members" />
        <ProgressMetric label="Scored tasks" value={visibleSummary.totalTasks} hint="leaf tasks only" />
      </div>

      {!isProfessor && myContribution ? (
        <ProgressSection title="My Contribution">
          <article className="progress-row-card">
            <div>
              <h4>{myContribution.displayName}</h4>
              <p>{myContribution.completedTasks}/{myContribution.assignedTasks} tasks · {myContribution.earnedPoints}/{myContribution.potentialPoints} pts</p>
            </div>
            <ProgressBar label="My progress" value={myContribution.progressPercent} />
          </article>

          <div className="task-progress-table">
            {myTasks.map((task) => (
              <article className="task-progress-row" key={task.id}>
                <div>
                  <h4>{task.title}</h4>
                  <p>{task.groupName} · {task.groupWeight}% task points · {task.status}</p>
                </div>
                <ProgressBar label="Task" value={task.status === 'done' ? 100 : 0} />
              </article>
            ))}
            {myTasks.length === 0 ? <p>No owned tasks in this group.</p> : null}
          </div>
        </ProgressSection>
      ) : null}

      <ProgressSection title={isProfessor ? 'Member Contribution Leaderboard' : 'Group Members'}>
        <div className="member-progress-grid">
          {visibleMembers
            .sort((a, b) => b.earnedPoints - a.earnedPoints)
            .map((member) => (
              <article className="member-progress-card" key={`${member.groupId}-${member.userId}`}>
                <div>
                  <h4>{member.displayName}</h4>
                  <p>{member.groupName} · {member.completedTasks}/{member.assignedTasks} tasks</p>
                </div>
                <ProgressBar label={`${member.earnedPoints}/${member.potentialPoints} pts`} value={member.progressPercent} />
              </article>
            ))}
          {visibleMembers.length === 0 ? <p>No members for this group yet.</p> : null}
        </div>
      </ProgressSection>

      <ProgressSection title="Group Contribution Progress">
        <div className="progress-grid">
          {visibleGroups.map((group) => (
            <article className="progress-row-card" key={group.id}>
              <div>
                <h4>{group.name}</h4>
                <p>{group.completedTasks}/{group.totalTasks} tasks · {group.earnedPoints}/{group.potentialPoints} pts</p>
              </div>
              <ProgressBar label="Group progress" value={group.progressPercent} />
            </article>
          ))}
          {visibleGroups.length === 0 ? <p>No group data yet.</p> : null}
        </div>
      </ProgressSection>

      <ProgressSection title="Task Point Ownership">
        <div className="task-progress-table">
          {visibleTasks.map((task) => (
            <article className="task-progress-row" key={task.id}>
              <div>
                <h4>{task.title}</h4>
                <p>
                  {task.groupName} · {task.groupWeight}% · {task.pointsAwarded ? 'points awarded' : 'not awarded'} · {task.scorePolicy || 'normal assignment'}
                </p>
                <small>
                  Owners: {task.owners.length ? task.owners.map((owner) => `${owner.displayName} (${owner.sharePercent}%)`).join(', ') : 'None'}
                </small>
              </div>
              <ProgressBar label={task.status} value={task.status === 'done' ? 100 : 0} />
            </article>
          ))}
          {visibleTasks.length === 0 ? <p>No scored tasks yet.</p> : null}
        </div>
      </ProgressSection>
    </section>
  )
}
