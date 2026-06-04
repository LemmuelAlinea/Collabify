import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'
import { ProgressBar } from '../../progress/components/ProgressBar'
import { ProgressMetric } from '../../progress/components/ProgressMetric'
import { ProgressSection } from '../../progress/components/ProgressSection'
import { useProgress } from '../../progress/hooks/useProgress'
import { TaskDetailsModal } from '../../tasks/components/TaskDetailsModal'
import { getGroup, updateGroupMember } from '../services/groupService'

function normalizeTaskShares(tasks) {
  if (!tasks.length) return []
  const base = Math.floor((100 / tasks.length) * 100) / 100
  let used = 0

  return tasks.map((task, index) => {
    const share = index === tasks.length - 1 ? Math.max(0, Math.round((100 - used) * 100) / 100) : base
    used += share
    return { ...task, share }
  })
}

function completionLabel(completion) {
  return `${completion.completed}/${completion.total} done`
}

export function StudentGroupDetailsPage() {
  const navigate = useNavigate()
  const { groupId } = useParams()
  const { role, user } = useAuth()
  const { error: progressError, isLoading: isProgressLoading, progress } = useProgress()
  const [group, setGroup] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState(null)
  const [notice, setNotice] = useState('')

  const loadGroup = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setGroup(await getGroup(groupId))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    loadGroup()
  }, [loadGroup])

  const progressGroup = useMemo(
    () => (progress?.groups ?? []).find((item) => item.id === groupId),
    [groupId, progress?.groups],
  )
  const groupTasks = useMemo(
    () => (progress?.tasks ?? []).filter((task) => task.groupId === groupId),
    [groupId, progress?.tasks],
  )
  const myTasks = useMemo(
    () => groupTasks.filter((task) => (task.assignees ?? []).some((assignee) => assignee.userId === user?.id)),
    [groupTasks, user?.id],
  )
  const myTasksWithShare = useMemo(() => normalizeTaskShares(myTasks), [myTasks])
  const myProgress = useMemo(
    () => Math.round(myTasksWithShare.reduce((sum, task) => sum + ((task.progress ?? 0) / 100) * task.share, 0)),
    [myTasksWithShare],
  )
  const taskCompletion = useMemo(() => {
    const completed = groupTasks.filter((task) => task.status === 'done').length
    return {
      completed,
      progress: groupTasks.length ? Math.round((completed / groupTasks.length) * 100) : 0,
      total: groupTasks.length,
    }
  }, [groupTasks])
  const currentMembership = group?.members.find((member) => member.userId === user?.id && member.status === 'active')
  const canManageMembers = role === USER_ROLES.PROFESSOR || Boolean(currentMembership?.isLeader)
  const basePath = role === USER_ROLES.PROFESSOR ? '/professor' : '/student'

  async function makeLeader(member) {
    setNotice('')
    setError('')
    try {
      const updatedGroup = await updateGroupMember(group.id, member.userId, { isLeader: !member.isLeader })
      setGroup(updatedGroup)
      setNotice(member.isLeader ? 'Leader removed.' : 'Leader updated.')
    } catch (updateError) {
      setError(updateError.message)
    }
  }

  function openTask(task) {
    const assignees = task.assignees ?? []
    const isAssignedToMe = assignees.some((assignee) => assignee.userId === user?.id)
    setSelectedTask({
      id: task.id,
      forceReadOnly: assignees.length > 0 && !isAssignedToMe,
    })
  }

  if (isLoading || isProgressLoading) return <div className="route-state">Loading group...</div>
  if (error) return <div className="route-state">{error}</div>
  if (!group) return <div className="route-state">Group not found</div>

  return (
    <section className="module-page student-group-details-page">
      <div className="task-detail-breadcrumb">
        <button className="secondary-button" type="button" onClick={() => navigate(`${basePath}/groups`)}>
          <ArrowLeft size={16} aria-hidden="true" />
          Groups
        </button>
        <span>{group.class?.name ?? 'Class'}</span>
      </div>

      <div className="module-header">
        <div>
          <p className="eyebrow">{role === USER_ROLES.PROFESSOR ? 'Professor group' : 'Student group'}</p>
          <h2>{group.name}</h2>
          <p>{group.project?.title ?? 'Project'}</p>
        </div>
        {group.project?.id ? <Link className="secondary-link-button" to={`${basePath}/projects/${group.project.id}`}>Open project</Link> : null}
      </div>

      {notice ? <p className="form-success">{notice}</p> : null}
      {progressError ? <p className="form-error">{progressError}</p> : null}

      <section className="group-details-members-panel">
        <div className="task-section-heading">
          <h3>Members</h3>
          <span>{group.members.filter((member) => member.status === 'active').length} active members</span>
        </div>
        <div className="group-member-table">
          <div className="group-member-row group-member-head">
            <span>Full name</span>
            <span>Action</span>
          </div>
          {group.members.filter((member) => member.status === 'active').map((member) => (
            <div className="group-member-row" key={member.id}>
              <span>
                {member.displayName}
                {member.isLeader ? <small>Leader</small> : null}
              </span>
              <button
                className="secondary-button"
                type="button"
                disabled={!canManageMembers || member.userId === user?.id}
                onClick={() => makeLeader(member)}
              >
                {member.isLeader ? 'Unset leader' : 'Make leader'}
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="progress-metric-grid">
        <ProgressMetric label="My progress" value={`${myProgress}%`} hint={`${myTasksWithShare.filter((task) => task.status === 'done').length}/${myTasksWithShare.length} done`} />
        <ProgressMetric label="Group progress" value={`${progressGroup?.progress ?? 0}%`} hint={progressGroup ? completionLabel(progressGroup.taskCompletion) : 'No tasks'} />
        <ProgressMetric label="Task completion" value={`${taskCompletion.progress}%`} hint={completionLabel(taskCompletion)} />
        <ProgressMetric label="Members" value={progressGroup?.memberCount ?? group.members.length} hint="active group members" />
      </div>

      <ProgressSection title="My Group Progress">
        <div className="progress-row-card">
          <div>
            <h4>{group.name}</h4>
            <p>{group.project?.title ?? 'Project'} · {progressGroup?.memberCount ?? group.members.length} members</p>
          </div>
          <ProgressBar label="Group" value={progressGroup?.progress ?? 0} />
        </div>
      </ProgressSection>

      <ProgressSection title="Member Completion">
        <div className="member-progress-grid">
          {(progressGroup?.members ?? []).map((member) => (
            <article className="member-progress-card" key={member.userId}>
              <div>
                <h4>{member.displayName}</h4>
                <p>{member.completedTasks}/{member.totalTasks} tasks · {member.contributionPoints} pts</p>
              </div>
              <ProgressBar label="Member" value={member.progress} />
            </article>
          ))}
        </div>
      </ProgressSection>

      <ProgressSection title="Task Progress">
        <div className="task-progress-table">
          {groupTasks.map((task) => (
            <button className="task-progress-row task-progress-action" type="button" key={task.id} onClick={() => openTask(task)}>
              <div>
                <h4>{task.title}</h4>
                <p>{task.projectTitle} · {task.status}</p>
              </div>
              <ProgressBar label="Task" value={task.progress} />
            </button>
          ))}
          {groupTasks.length === 0 ? <p>No task progress yet.</p> : null}
        </div>
      </ProgressSection>

      {selectedTask ? (
        <TaskDetailsModal
          forceReadOnly={selectedTask.forceReadOnly}
          onClose={() => setSelectedTask(null)}
          taskId={selectedTask.id}
        />
      ) : null}
    </section>
  )
}
