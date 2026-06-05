import { useEffect, useMemo, useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
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

function toDateTimeInput(value) {
  if (!value) return ''
  const date = new Date(value)
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 16)
}

function fromDateTimeInput(value) {
  return value ? new Date(value).toISOString() : null
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

export function TaskCard({ currentUserId, depth = 0, groups, onComment, onDelete, onOpen, onUpdate, role, task }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [draftProgress, setDraftProgress] = useState(task.progress ?? 0)
  const [status, setStatus] = useState(task.status)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isEditSaving, setIsEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [editForm, setEditForm] = useState({
    description: task.description ?? '',
    dueAt: toDateTimeInput(task.dueAt),
    title: task.title ?? '',
  })
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
    return task.assignments.map((assignment) => byId.get(assignment.assigneeId) ?? assignment.displayName ?? assignment.email ?? 'Unknown member')
  }, [members, task.assignments])

  useEffect(() => {
    setStatus(task.status)
    setDraftProgress(task.progress ?? 0)
  }, [task.progress, task.status])

  useEffect(() => {
    if (isEditing) return
    setEditForm({
      description: task.description ?? '',
      dueAt: toDateTimeInput(task.dueAt),
      title: task.title ?? '',
    })
  }, [isEditing, task.description, task.dueAt, task.title])

  function updateEditField(event) {
    const { name, value } = event.target
    setEditForm((current) => ({ ...current, [name]: value }))
  }

  function cancelEdit() {
    setIsEditing(false)
    setEditError('')
    setEditForm({
      description: task.description ?? '',
      dueAt: toDateTimeInput(task.dueAt),
      title: task.title ?? '',
    })
  }

  async function saveEdits(event) {
    event.preventDefault()
    const title = editForm.title.trim()
    if (!title) {
      setEditError('Title is required')
      return
    }

    setIsEditSaving(true)
    setEditError('')
    try {
      await onUpdate(task.id, {
        description: editForm.description.trim() || null,
        dueAt: fromDateTimeInput(editForm.dueAt),
        title,
      })
      setIsEditing(false)
    } catch (error) {
      setEditError(error.message ?? 'Failed to save task')
    } finally {
      setIsEditSaving(false)
    }
  }

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

  async function claimTask() {
    if (!currentUserId || hasAssignees) return
    setIsSaving(true)
    setSaveError('')
    try {
      await onUpdate(task.id, { assigneeIds: [currentUserId] })
    } catch (error) {
      setSaveError(error.message ?? 'Unable to claim task')
    } finally {
      setIsSaving(false)
    }
  }

  async function archiveTask() {
    if (window.confirm(`Archive "${task.title}"?`)) await onUpdate(task.id, { archived: true })
  }

  async function deleteTask() {
    if (window.confirm(`Delete "${task.title}"?`)) await onDelete(task.id)
  }

  const editButton = (
    <button className="icon-button task-edit-button" type="button" onClick={() => setIsEditing(true)} aria-label={`Edit ${task.title}`}>
      <Pencil size={16} aria-hidden="true" />
    </button>
  )

  const editFormMarkup = (
    <form className="task-edit-form" onSubmit={saveEdits}>
      <label className="form-field" htmlFor={`task-title-${task.id}`}>
        <span>Title</span>
        <input id={`task-title-${task.id}`} name="title" value={editForm.title} onChange={updateEditField} maxLength={180} required />
      </label>
      <label className="form-field" htmlFor={`task-description-${task.id}`}>
        <span>Description</span>
        <textarea id={`task-description-${task.id}`} name="description" value={editForm.description} onChange={updateEditField} maxLength={5000} rows={3} />
      </label>
      <label className="form-field" htmlFor={`task-due-${task.id}`}>
        <span>Deadline</span>
        <input id={`task-due-${task.id}`} name="dueAt" type="datetime-local" value={editForm.dueAt} onChange={updateEditField} />
      </label>
      {editError ? <p className="form-error">{editError}</p> : null}
      <div className="task-edit-actions">
        <button className="icon-button task-edit-save" type="submit" disabled={isEditSaving} aria-label="Save task edits">
          <Check size={16} aria-hidden="true" />
        </button>
        <button className="icon-button" type="button" onClick={cancelEdit} disabled={isEditSaving} aria-label="Cancel task edits">
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </form>
  )

  if (isMainTask) {
    return (
      <section className="main-task-section">
        <div className="main-task-heading">
          {isEditing ? editFormMarkup : (
            <div>
              <p className="eyebrow">Main task</p>
              <h2>{task.title}</h2>
              {task.description ? <p>{task.description}</p> : null}
              <small>{formatDate(task.dueAt)}</small>
            </div>
          )}
          <div className="task-heading-actions">
            {!isEditing ? editButton : null}
            {isProfessor ? <button className="danger-button" type="button" onClick={archiveTask}>Archive</button> : null}
          </div>
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
              onOpen={onOpen}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      </section>
    )
  }

  return (
    <article className={`task-card compact-task-card depth-${depth}`}>
      <div className="task-card-top">
        {isEditing ? editFormMarkup : (
          <button className="task-card-summary" type="button" onClick={() => setIsExpanded((current) => !current)}>
            <span className={`task-priority priority-${String(task.priority || '').toLowerCase()}`}>{task.priority}</span>
            <strong>{task.title}</strong>
            <small>{task.description || 'No description'}</small>
          </button>
        )}
        {!isEditing ? editButton : null}
      </div>
      <div className="task-card-meta">
        <span>{formatDate(task.dueAt)}</span>
        <span>{status}</span>
        <span>{task.groupScoreWeight ?? 0}% pts</span>
        <span>{task.comments.length} comments</span>
        <button className="task-open-link" type="button" onClick={() => onOpen?.(task.id)}>Open</button>
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
              <dt>{isProfessor ? 'Assigned to' : 'Owners'}</dt>
              <dd>
                {isProfessor
                  ? (assignedNames.length ? assignedNames.join(', ') : 'Not assigned to anyone yet.')
                  : (assignedNames.length ? assignedNames.join(', ') : 'Not claimed yet')}
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

              <div className="task-assignees task-owner-panel">
                <p className="eyebrow">Owners</p>
                {assignedNames.length ? (
                  <p className="task-owner-names">{assignedNames.join(', ')}</p>
                ) : (
                  <>
                    <p className="task-owner-names">No owner yet. Any active group member can claim this task.</p>
                    <button className="secondary-button" type="button" onClick={claimTask} disabled={isSaving || !currentUserId}>
                      {isSaving ? 'Claiming...' : 'Claim task'}
                    </button>
                  </>
                )}
              </div>
            </>
          ) : null}

          <CommentBox comments={task.comments} onSubmit={(body) => onComment(task.id, { body })} />

          <div className="card-actions">
            <button className="secondary-button" type="button" onClick={() => onOpen?.(task.id)}>Open</button>
            {isProfessor ? <button className="danger-button" type="button" onClick={archiveTask}>Archive</button> : null}
            {!isProfessor ? <button className="danger-button" type="button" onClick={deleteTask}>Delete</button> : null}
          </div>
        </div>
      ) : null}
    </article>
  )
}
