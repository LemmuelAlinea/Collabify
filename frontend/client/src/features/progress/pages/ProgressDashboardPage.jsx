import { useMemo, useState } from 'react'
import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'
import { ProgressBar } from '../components/ProgressBar'
import { ProgressMetric } from '../components/ProgressMetric'
import { ProgressSection } from '../components/ProgressSection'
import { useProgress } from '../hooks/useProgress'

function completionLabel(completion) {
  return `${completion.completed}/${completion.total} done`
}

function topItems(items, limit = 8) {
  return [...items].slice(0, limit)
}

function normalizeTaskShares(tasks) {
  if (!tasks.length) return []
  const base = Math.floor((100 / tasks.length) * 100) / 100
  let used = 0

  return tasks.map((task, index) => {
    const share = index === tasks.length - 1 ? Math.max(0, Math.round((100 - used) * 100) / 100) : base
    used += share
    return {
      ...task,
      share,
    }
  })
}

export function ProgressDashboardPage() {
  const { role, user } = useAuth()
  const { error, isLoading, progress } = useProgress()
  const isProfessor = role === USER_ROLES.PROFESSOR
  const [groupFilterId, setGroupFilterId] = useState('')
  const selectedGroupId = groupFilterId || progress?.groups?.[0]?.id || ''
  const visibleGroups = isProfessor
    ? (progress?.groups ?? [])
    : (progress?.groups ?? []).filter((group) => !selectedGroupId || group.id === selectedGroupId)
  const myTasks = useMemo(() => {
    if (isProfessor) return []
    return (progress?.tasks ?? []).filter((task) => {
      const inGroup = !selectedGroupId || task.groupId === selectedGroupId
      const assignedToMe = (task.assignees ?? []).some((assignee) => assignee.userId === user?.id)
      return inGroup && assignedToMe
    })
  }, [isProfessor, progress?.tasks, selectedGroupId, user?.id])
  const myTasksWithShare = useMemo(() => normalizeTaskShares(myTasks), [myTasks])
  const myNormalizedProgress = useMemo(
    () => Math.round(myTasksWithShare.reduce((sum, task) => sum + ((task.progress ?? 0) / 100) * task.share, 0)),
    [myTasksWithShare],
  )

  if (isLoading) return <div className="route-state">Loading progress...</div>

  if (error || !progress) {
    return <section className="content-section"><h2>Progress unavailable</h2><p>{error || 'Unable to load progress.'}</p></section>
  }

  return (
    <section className="module-page progress-dashboard">
      <div className="module-header">
        <div>
          <p className="eyebrow">{role}</p>
          <h2>Progress Transparency</h2>
          <p>{isProfessor ? 'Monitor project, group, member, task, and contribution progress.' : 'Track your personal, group, project, and member completion progress.'}</p>
        </div>
      </div>

      <div className="progress-metric-grid">
        {progress.personal ? (
          <ProgressMetric label="Personal progress" value={`${myNormalizedProgress || progress.personal.progress}%`} hint={completionLabel(progress.personal.taskCompletion)} />
        ) : null}
        <ProgressMetric label="Project progress" value={`${progress.overview.averageProjectProgress}%`} hint={`${progress.overview.projects} projects`} />
        <ProgressMetric label="Group progress" value={`${progress.overview.averageGroupProgress}%`} hint={`${progress.overview.groups} groups`} />
        <ProgressMetric label="Task completion" value={`${progress.overview.taskCompletion.progress}%`} hint={completionLabel(progress.overview.taskCompletion)} />
        <ProgressMetric label="Contribution points" value={progress.overview.contributionPoints} hint="logged contributions" />
      </div>

      {!isProfessor ? (
        <>
          <ProgressSection title="My Progress">
            <div className="task-filter-row">
              <label className="form-field" htmlFor="studentProgressGroupFilter">
                <span>Group</span>
                <select
                  id="studentProgressGroupFilter"
                  value={selectedGroupId}
                  onChange={(event) => setGroupFilterId(event.target.value)}
                >
                  {progress.groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} - {group.projectTitle || 'Project'}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="progress-row-card">
              <div>
                <h4>My task progress</h4>
                <p>{myTasksWithShare.length} tasks · normalized to 100%</p>
              </div>
              <ProgressBar label="My Progress" value={myNormalizedProgress} />
            </div>

            <div className="task-progress-table">
              {myTasksWithShare.map((task) => (
                <article className="task-progress-row" key={task.id}>
                  <div>
                    <h4>{task.title}</h4>
                    <p>{task.groupName} · {task.status} · weight {task.share}%</p>
                  </div>
                  <ProgressBar label="Task" value={task.progress ?? 0} />
                </article>
              ))}
              {myTasksWithShare.length === 0 ? <p>No assigned tasks in this group yet.</p> : null}
            </div>
          </ProgressSection>

          <ProgressSection title="My Group Progress">
            <div className="progress-grid">
              {visibleGroups.map((group) => (
                <article className="progress-row-card" key={group.id}>
                  <div>
                    <h4>{group.name}</h4>
                    <p>{group.projectTitle || 'Project'} · {group.memberCount} members</p>
                  </div>
                  <ProgressBar label="Group" value={group.progress} />
                </article>
              ))}
            </div>
          </ProgressSection>
        </>
      ) : null}

      <ProgressSection title="Project Progress">
        <div className="progress-list">
          {topItems(progress.projects).map((project) => (
            <article className="progress-row-card" key={project.id}>
              <div>
                <h4>{project.title}</h4>
                <p>{project.status} · {completionLabel(project.taskCompletion)}</p>
              </div>
              <ProgressBar label="Progress" value={project.progress} />
            </article>
          ))}
          {progress.projects.length === 0 ? <p>No project progress yet.</p> : null}
        </div>
      </ProgressSection>

      <ProgressSection title="Group Progress">
        <div className="progress-grid">
          {topItems(visibleGroups).map((group) => (
            <article className="progress-row-card" key={group.id}>
              <div>
                <h4>{group.name}</h4>
                <p>{group.projectTitle || 'Project'} · {group.memberCount} members</p>
              </div>
              <ProgressBar label="Group" value={group.progress} />
            </article>
          ))}
          {visibleGroups.length === 0 ? <p>No group progress yet.</p> : null}
        </div>
      </ProgressSection>

      <ProgressSection title={isProfessor ? 'Member Progress' : 'Member Completion'}>
        <div className="member-progress-grid">
          {progress.groups.flatMap((group) => group.members.map((member) => ({
            ...member,
            groupName: group.name,
          }))).map((member) => (
            <article className="member-progress-card" key={`${member.groupName}-${member.userId}`}>
              <div>
                <h4>{member.displayName}</h4>
                <p>{member.groupName} · {member.completedTasks}/{member.totalTasks} tasks · {member.contributionPoints} pts</p>
              </div>
              <ProgressBar label="Member" value={member.progress} />
            </article>
          ))}
        </div>
      </ProgressSection>

      <ProgressSection title="Task Progress">
        <div className="task-progress-table">
          {topItems(progress.tasks, 12).map((task) => (
            <article className="task-progress-row" key={task.id}>
              <div>
                <h4>{task.title}</h4>
                <p>{task.projectTitle} · {task.groupName} · {task.status}</p>
              </div>
              <ProgressBar label="Task" value={task.progress} />
            </article>
          ))}
          {progress.tasks.length === 0 ? <p>No task progress yet.</p> : null}
        </div>
      </ProgressSection>
    </section>
  )
}
