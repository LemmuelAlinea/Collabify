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
import { finalizeGroup, getGroup, getGroupPopQuiz, submitGroupPopQuiz, updateGroupMember } from '../services/groupService'

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
  const [quiz, setQuiz] = useState(null)
  const [quizAnswers, setQuizAnswers] = useState({})
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false)

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

  useEffect(() => {
    if (role !== USER_ROLES.STUDENT || !groupId || !user?.id) return
    let isMounted = true
    async function loadQuiz() {
      const nextQuiz = await getGroupPopQuiz(groupId).catch(() => null)
      if (isMounted && nextQuiz?.status === 'in_progress') setQuiz((current) => current ?? nextQuiz)
    }
    loadQuiz()
    const timer = window.setInterval(loadQuiz, 5000)
    return () => {
      isMounted = false
      window.clearInterval(timer)
    }
  }, [groupId, role, user?.id])

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
  const allTasksDone = taskCompletion.total > 0 && taskCompletion.completed === taskCompletion.total
  const canFinalize = role === USER_ROLES.STUDENT && Boolean(currentMembership?.isLeader) && allTasksDone
  const finalizeHint = !currentMembership?.isLeader
    ? 'Only the group leader can finalize this project.'
    : !allTasksDone ? 'All group tasks must be done before finalizing.' : 'Ready for final quiz.'
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

  async function finalizeProject() {
    if (!canFinalize) return
    setIsFinalizing(true)
    setError('')
    setNotice('')
    try {
      const result = await finalizeGroup(group.id)
      setGroup(result.group)
      setQuiz(result.quiz)
      setQuizAnswers({})
      setNotice('Project finalized. Complete the pop quiz.')
    } catch (finalizeError) {
      setError(finalizeError.message)
    } finally {
      setIsFinalizing(false)
    }
  }

  function updateQuizAnswer(questionId, selectedOption) {
    setQuizAnswers((current) => ({ ...current, [questionId]: selectedOption }))
  }

  async function submitQuiz(event) {
    event.preventDefault()
    if (!quiz) return
    setIsSubmittingQuiz(true)
    setError('')
    try {
      await submitGroupPopQuiz(group.id, {
        answers: quiz.questions.map((question) => ({
          questionId: question.id,
          selectedOption: quizAnswers[question.id],
        })),
      })
      setQuiz(null)
      setQuizAnswers({})
      setNotice('Pop quiz submitted.')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmittingQuiz(false)
    }
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

      <div className="module-header student-group-details-hero">
        <div>
          <p className="eyebrow">{role === USER_ROLES.PROFESSOR ? 'Professor group' : 'Student group'}</p>
          <h2>{group.name}</h2>
          <p>{group.project?.title ?? 'Project'}</p>
        </div>
        <div className="group-details-actions">
          {group.project?.id ? <Link className="secondary-link-button" to={`${basePath}/projects/${group.project.id}`}>Open project</Link> : null}
          {role === USER_ROLES.STUDENT ? (
            <button className="primary-button" type="button" disabled={!canFinalize || isFinalizing} onClick={finalizeProject}>
              {isFinalizing ? 'Finalizing...' : 'Finalize project'}
            </button>
          ) : null}
        </div>
        {role === USER_ROLES.STUDENT ? (
          <section className="group-finalize-panel">
            <div>
              <h3>Finalize project</h3>
              <p>{finalizeHint}</p>
            </div>
          </section>
        ) : null}
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
        {role === USER_ROLES.STUDENT ? (
          <ProgressMetric label="My progress" value={`${myProgress}%`} hint={`${myTasksWithShare.filter((task) => task.status === 'done').length}/${myTasksWithShare.length} done`} />
        ) : null}
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

      {quiz ? (
        <div className="pop-quiz-backdrop">
          <form className="pop-quiz-modal" onSubmit={submitQuiz}>
            <div className="pop-quiz-header">
              <div>
                <p className="eyebrow">Final project check</p>
                <h3>Pop Quiz</h3>
              </div>
            </div>
            <div className="pop-quiz-list">
              {quiz.questions.map((question, index) => (
                <fieldset className="pop-quiz-question" key={question.id}>
                  <legend>{index + 1}. {question.prompt}</legend>
                  <div className="pop-quiz-options">
                    {question.options.map((option) => (
                      <label key={option.key}>
                        <input
                          type="radio"
                          name={`quiz-${question.id}`}
                          value={option.key}
                          checked={quizAnswers[question.id] === option.key}
                          onChange={() => updateQuizAnswer(question.id, option.key)}
                        />
                        <span>{option.key}. {option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
            <button className="primary-button" type="submit" disabled={isSubmittingQuiz || Object.keys(quizAnswers).length !== quiz.questions.length}>
              {isSubmittingQuiz ? 'Submitting...' : 'Submit quiz'}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  )
}
