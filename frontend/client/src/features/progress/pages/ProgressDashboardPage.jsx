import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'
import { ProgressBar } from '../components/ProgressBar'
import { ProgressMetric } from '../components/ProgressMetric'
import { ProgressSection } from '../components/ProgressSection'
import { TaskTimeline } from '../components/TaskTimeline'
import { useProgress } from '../hooks/useProgress'
import { useProgressTimeline } from '../hooks/useProgressTimeline'

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
  const navigate = useNavigate()
  const { error, isLoading, progress } = useProgress()
  const { error: timelineError, isLoading: isTimelineLoading, timeline } = useProgressTimeline()
  const isProfessor = role === USER_ROLES.PROFESSOR
  const [classFilterId, setClassFilterId] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [groupFilterId, setGroupFilterId] = useState('')
  const groups = progress?.groups ?? []
  const classOptions = useMemo(() => {
    const seen = new Map()
    groups.forEach((group) => {
      if (group.classId && !seen.has(group.classId)) seen.set(group.classId, group.className || 'Class')
    })
    return [...seen].map(([id, name]) => ({ id, name }))
  }, [groups])
  const sectionOptions = useMemo(
    () => [...new Set(groups
      .filter((group) => !classFilterId || group.classId === classFilterId)
      .map((group) => group.section)
      .filter(Boolean))],
    [classFilterId, groups],
  )
  const groupOptions = useMemo(
    () => groups.filter((group) => {
      const inClass = !classFilterId || group.classId === classFilterId
      const inSection = !sectionFilter || group.section === sectionFilter
      return inClass && inSection
    }),
    [classFilterId, groups, sectionFilter],
  )
  const selectedGroupId = isProfessor
    ? groupFilterId
    : (groupFilterId && groupOptions.some((group) => group.id === groupFilterId) ? groupFilterId : groupOptions[0]?.id || '')
  const visibleGroups = groupOptions.filter((group) => !selectedGroupId || group.id === selectedGroupId)
  const visibleGroupIds = useMemo(() => new Set(visibleGroups.map((group) => group.id)), [visibleGroups])
  const visibleProjectIds = useMemo(() => new Set(visibleGroups.map((group) => group.projectId).filter(Boolean)), [visibleGroups])
  const visibleTasks = useMemo(
    () => (progress?.tasks ?? []).filter((task) => visibleGroupIds.has(task.groupId)),
    [progress?.tasks, visibleGroupIds],
  )
  const visibleProjects = useMemo(
    () => (progress?.projects ?? []).filter((project) => {
      if (visibleProjectIds.has(project.id)) return true
      return classFilterId && project.classId === classFilterId
    }),
    [classFilterId, progress?.projects, visibleProjectIds],
  )
  const visibleTaskCompletion = useMemo(() => {
    const total = visibleTasks.length
    const completed = visibleTasks.filter((task) => task.status === 'done').length
    return {
      completed,
      progress: total ? Math.round((completed / total) * 100) : 0,
      total,
    }
  }, [visibleTasks])
  const visibleAverage = useMemo(() => {
    const averageProgress = (items) => {
      const values = items.map((item) => item.progress).filter((value) => Number.isFinite(value))
      return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0
    }
    return {
      group: averageProgress(visibleGroups),
      project: averageProgress(visibleProjects),
    }
  }, [visibleGroups, visibleProjects])
  const visibleContributionPoints = useMemo(
    () => visibleGroups.reduce((sum, group) => sum + Number(group.contributionPoints ?? 0), 0),
    [visibleGroups],
  )
  const myTasks = useMemo(() => {
    if (isProfessor) return []
    return visibleTasks.filter((task) => {
      const assignedToMe = (task.assignees ?? []).some((assignee) => assignee.userId === user?.id)
      return assignedToMe
    })
  }, [isProfessor, user?.id, visibleTasks])
  const myTasksWithShare = useMemo(() => normalizeTaskShares(myTasks), [myTasks])
  const myNormalizedProgress = useMemo(
    () => Math.round(myTasksWithShare.reduce((sum, task) => sum + ((task.progress ?? 0) / 100) * task.share, 0)),
    [myTasksWithShare],
  )
  const myTaskCompletion = useMemo(() => {
    const total = myTasksWithShare.length
    const completed = myTasksWithShare.filter((task) => task.status === 'done').length
    return { completed, total }
  }, [myTasksWithShare])
  const openTimelineTask = (task) => {
    const basePath = isProfessor ? '/professor' : '/student'
    navigate(`${basePath}/tasks/${task.id}`)
  }

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

      <div className="task-filter-row">
        <label className="form-field" htmlFor="progressClassFilter">
          <span>Class</span>
          <select
            id="progressClassFilter"
            value={classFilterId}
            onChange={(event) => {
              setClassFilterId(event.target.value)
              setSectionFilter('')
              setGroupFilterId('')
            }}
          >
            <option value="">All classes</option>
            {classOptions.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>{classItem.name}</option>
            ))}
          </select>
        </label>

        {isProfessor ? (
          <label className="form-field" htmlFor="progressSectionFilter">
            <span>Section</span>
            <select
              id="progressSectionFilter"
              value={sectionFilter}
              onChange={(event) => {
                setSectionFilter(event.target.value)
                setGroupFilterId('')
              }}
            >
              <option value="">All sections</option>
              {sectionOptions.map((section) => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="form-field" htmlFor="progressGroupFilter">
          <span>Group</span>
          <select id="progressGroupFilter" value={selectedGroupId} onChange={(event) => setGroupFilterId(event.target.value)}>
            {isProfessor ? <option value="">All groups</option> : null}
            {groupOptions.map((group) => (
              <option key={group.id} value={group.id}>{group.name} - {group.projectTitle || 'Project'}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="progress-metric-grid">
        {progress.personal ? (
          <ProgressMetric label="Personal progress" value={`${myNormalizedProgress}%`} hint={completionLabel(myTaskCompletion)} />
        ) : null}
        <ProgressMetric label="Project progress" value={`${visibleAverage.project}%`} hint={`${visibleProjects.length} projects`} />
        <ProgressMetric label="Group progress" value={`${visibleAverage.group}%`} hint={`${visibleGroups.length} groups`} />
        <ProgressMetric label="Task completion" value={`${visibleTaskCompletion.progress}%`} hint={completionLabel(visibleTaskCompletion)} />
        <ProgressMetric label="Contribution points" value={visibleContributionPoints} hint="completed task points" />
      </div>

      {timelineError ? (
        <ProgressSection title="Task Timeline">
          <p>{timelineError}</p>
        </ProgressSection>
      ) : (
        <TaskTimeline
          currentUserId={user?.id}
          isLoading={isTimelineLoading}
          isProfessor={isProfessor}
          onTaskClick={openTimelineTask}
          timeline={timeline}
          visibleGroupIds={visibleGroupIds}
        />
      )}

      {!isProfessor ? (
        <>
          <ProgressSection title="My Progress">
            <div className="progress-row-card my-task-progress-card">
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
          {topItems(visibleProjects).map((project) => (
            <article className="progress-row-card" key={project.id}>
              <div>
                <h4>{project.title}</h4>
                <p>{project.status} · {completionLabel(project.taskCompletion)}</p>
              </div>
              <ProgressBar label="Progress" value={project.progress} />
            </article>
          ))}
          {visibleProjects.length === 0 ? <p>No project progress yet.</p> : null}
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
          {visibleGroups.flatMap((group) => group.members.map((member) => ({
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
        <div className="task-progress-table task-progress-table--scroll">
          {visibleTasks.map((task) => (
            <article className="task-progress-row" key={task.id}>
              <div>
                <h4>{task.title}</h4>
                <p>{task.projectTitle} · {task.groupName} · {task.status}</p>
              </div>
              <ProgressBar label="Task" value={task.progress} />
            </article>
          ))}
          {visibleTasks.length === 0 ? <p>No task progress yet.</p> : null}
        </div>
      </ProgressSection>
    </section>
  )
}
