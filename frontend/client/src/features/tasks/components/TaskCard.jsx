import { useEffect, useMemo, useState } from 'react'
import { USER_ROLES } from '../../auth/constants/roles'

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : 'No deadline'
}

function flattenMembers(groups, groupId) {
  return groups.find((group) => group.id === groupId)?.members?.filter((member) => member.status === 'active') ?? []
}

function progressForStatus(status) {
  return {
    todo: 0,
    blocked: 0,
    in_progress: 25,
    review: 50,
    done: 100,
  }[status] ?? 0
}

function CommentBox({ comments, onSubmit }) {
  const [body, setBody] = useState('')
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? comments : comments.slice(-3)

  async function submit(event) {
    event.preventDefault()
    if (!body.trim()) return
    await onSubmit(body.trim())
    setBody('')
  }

  return (
    <div className="task-comments-compact">
      <div className="task-comments-header">
        <p className="eyebrow">Comments</p>
        {comments.length > 3 ? (
          <button type="button" onClick={() => setExpanded((current) => !current)}>
            {expanded ? 'Collapse' : `Load ${comments.length - 3} more`}
          </button>
        ) : null}
      </div>
      {visible.map((comment) => (
        <p className="task-comment-line" key={comment.id}>
          <strong>{comment.displayName}</strong>
          <span>{comment.body}</span>
        </p>
      ))}
      <form className="task-comment-form" onSubmit={submit}>
        <input aria-label="Comment" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Add a comment" />
        <button className="secondary-button" type="submit">Post</button>
      </form>
    </div>
  )
}

export function TaskCard({ currentUserId, depth = 0, groups, onComment, onDelete, onUpdate, role, task }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [draftProgress, setDraftProgress] = useState(task.progress ?? 0)
  const [status, setStatus] = useState(task.status)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const assigneeIds = task.assignments.map((assignment) => assignment.assigneeId)
  const hasAssignees = assigneeIds.length > 0
  const isAssignedToMe = Boolean(currentUserId && assigneeIds.includes(currentUserId))
  const canUpdateStatus = isAssignedToMe || !hasAssignees
  const isProfessor = role === USER_ROLES.PROFESSOR
  const isMainTask = task.taskType === 'main' || (!task.parentTaskId && task.children?.length > 0)
  const members = useMemo(() => flattenMembers(groups, task.groupId), [groups, task.groupId])
  const assignedNames = useMemo(() => {
    if (!task.assignments.length) return []
    const byId = new Map(members.map((member) => [member.userId, member.displayName]))
    return task.assignments.map((assignment) => byId.get(assignment.assigneeId) ?? 'Unknown member')
  }, [members, task.assignments])

  useEffect(() => {
    setStatus(task.status)
    setDraftProgress(task.progress ?? 0)
  }, [task.progress, task.status])

  function changeStatus(nextStatus) {
    const nextProgress = progressForStatus(nextStatus)
    setStatus(nextStatus)
    setDraftProgress(nextProgress)
  }

  async function persistStatus(nextStatus) {
    setIsSaving(true)
    setSaveError('')
    try {
      await onUpdate(task.id, { status: nextStatus })
    } catch (error) {
      setSaveError(error.message ?? 'Failed to save status')
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  async function saveTaskProgress() {
    await persistStatus(status)
  }

  async function handleStatusChange(nextStatus) {
    changeStatus(nextStatus)
    try {
      await persistStatus(nextStatus)
    } catch {
      setStatus(task.status)
      setDraftProgress(task.progress ?? 0)
    }
  }

  async function toggleAssignee(userId, checked) {
    const nextAssigneeIds = checked
      ? [...new Set([...assigneeIds, userId])]
      : assigneeIds.filter((assigneeId) => assigneeId !== userId)

    await onUpdate(task.id, { assigneeIds: nextAssigneeIds })
  }

  async function archiveTask() {
    if (window.confirm(`Archive "${task.title}"?`)) await onUpdate(task.id, { archived: true })
  }

  async function deleteTask() {
    if (window.confirm(`Delete "${task.title}"?`)) await onDelete(task.id)
  }

  if (isMainTask) {
    return (
      <section className="main-task-section">
        <div className="main-task-heading">
          <div>
            <p className="eyebrow">Main task</p>
            <h2>{task.title}</h2>
            {task.description ? <p>{task.description}</p> : null}
          </div>
          {isProfessor ? <button className="danger-button" type="button" onClick={archiveTask}>Archive</button> : null}
        </div>
        <div className="task-children compact">
          {task.children.map((child) => (
          <TaskCard
            currentUserId={currentUserId}
            key={child.id}
            depth={depth + 1}
            groups={groups}
              task={child}
              role={role}
              onComment={onComment}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      </section>
    )
  }

  return (
    <article className={`task-card compact-task-card depth-${depth}`}>
      <button className="task-card-summary" type="button" onClick={() => setIsExpanded((current) => !current)}>
        <span className="task-priority">{task.priority}</span>
        <strong>{task.title}</strong>
        <small>{task.description || 'No description'}</small>
      </button>
      <div className="task-card-meta">
        <span>{formatDate(task.dueAt)}</span>
        <span>{status}</span>
        <span>{task.groupScoreWeight ?? 0}% pts</span>
        <span>{task.comments.length} comments</span>
      </div>
      <div className="task-progress-meter">
        <div className="progress-track"><span style={{ width: `${draftProgress}%` }} /></div>
        <strong>{draftProgress}%</strong>
      </div>

      {isExpanded ? (
        <div className="task-card-details">
          <dl className="compact-details">
            <div><dt>Group</dt><dd>{task.group?.name ?? 'Group'}</dd></div>
            <div>
              <dt>{isProfessor ? 'Assigned to' : 'Assignees'}</dt>
              <dd>
                {isProfessor
                  ? (assignedNames.length ? assignedNames.join(', ') : 'Not assigned to anyone yet.')
                  : (task.assignments.length || 'None')}
              </dd>
            </div>
            <div><dt>My progress</dt><dd>{task.memberScoreWeight ?? 0}%</dd></div>
          </dl>

          {!isProfessor ? (
            <>
              <div className="task-controls task-controls-single">
                <label className="form-field" htmlFor={`status-${task.id}`}>
                  <span>Status</span>
                  <select
                    id={`status-${task.id}`}
                    value={status}
                    onChange={(event) => handleStatusChange(event.target.value)}
                    disabled={isSaving || !canUpdateStatus}
                  >
                    <option value="todo">Todo</option>
                    <option value="in_progress">In progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </label>
              </div>
              <button className="primary-button" type="button" onClick={saveTaskProgress} disabled={isSaving || !canUpdateStatus}>
                {isSaving ? 'Saving...' : 'Save status'}
              </button>
              {!canUpdateStatus ? <p className="form-error">Only assigned owners can update this task status.</p> : null}
              {saveError ? <p className="form-error">{saveError}</p> : null}

              <div className="task-assignees">
                <p className="eyebrow">Owners</p>
                {members.map((member) => (
                  <label className="check-row" key={member.userId}>
                    <input type="checkbox" checked={assigneeIds.includes(member.userId)} onChange={(event) => toggleAssignee(member.userId, event.target.checked)} />
                    <span>{member.displayName}</span>
                  </label>
                ))}
              </div>
            </>
          ) : null}

          <CommentBox comments={task.comments} onSubmit={(body) => onComment(task.id, { body })} />

          <div className="card-actions">
            {isProfessor ? <button className="danger-button" type="button" onClick={archiveTask}>Archive</button> : null}
            {!isProfessor ? <button className="danger-button" type="button" onClick={deleteTask}>Delete</button> : null}
          </div>
        </div>
      ) : null}
    </article>
  )
}
