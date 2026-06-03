import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { USER_ROLES } from '../../auth/constants/roles'
import { createReassignment } from '../../reassignments/services/reassignmentService'
import { getGroup } from '../../groups/services/groupService'
import { TaskActivityPanel } from './TaskActivityPanel'
import { TaskAttachmentPreview } from './TaskAttachmentPreview'
import { TaskAttachmentUploader } from './TaskAttachmentUploader'
import { TaskVersionTable } from './TaskVersionTable'

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'No deadline'
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

function assigneeNames(assignments = []) {
  return assignments.map((assignment) => assignment.displayName).filter(Boolean)
}

function ReassignmentModal({ currentAssignment, onClose, task }) {
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    reason: '',
    requestedAssigneeId: '',
    scorePolicy: 'keep_original',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [members, setMembers] = useState([])

  async function loadMembers() {
    if (members.length || isLoading) return
    setIsLoading(true)
    setError('')
    try {
      const group = await getGroup(task.groupId)
      const activeMembers = (group.members ?? []).filter((member) => member.status === 'active' && member.userId !== currentAssignment.assigneeId)
      setMembers(activeMembers)
      setForm((current) => ({ ...current, requestedAssigneeId: activeMembers[0]?.userId ?? '' }))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await createReassignment({
        currentAssigneeId: currentAssignment.assigneeId,
        reason: form.reason,
        requestedAssigneeId: form.requestedAssigneeId,
        scorePolicy: form.scorePolicy,
        taskId: task.id,
      })
      onClose('Reassignment requested.')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal-panel task-reassignment-modal" onSubmit={handleSubmit}>
        <div className="task-section-heading">
          <div>
            <p className="eyebrow">Task reassignment</p>
            <h3>Request reassignment</h3>
          </div>
          <button className="secondary-button" type="button" onClick={() => onClose()}>Close</button>
        </div>
        <label className="form-field">
          <span>Current assignee</span>
          <input value={currentAssignment.displayName ?? currentAssignment.email ?? 'Current assignee'} readOnly />
        </label>
        <label className="form-field" htmlFor="taskDetailRequestedAssignee">
          <span>New assignee</span>
          <select id="taskDetailRequestedAssignee" required value={form.requestedAssigneeId} onFocus={loadMembers} onChange={(event) => setForm((current) => ({ ...current, requestedAssigneeId: event.target.value }))}>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>{member.displayName}</option>
            ))}
          </select>
        </label>
        <label className="form-field" htmlFor="taskDetailScorePolicy">
          <span>Score handling</span>
          <select id="taskDetailScorePolicy" value={form.scorePolicy} onChange={(event) => setForm((current) => ({ ...current, scorePolicy: event.target.value }))}>
            <option value="keep_original">Keep original score</option>
            <option value="split_50_50">Split score 50/50</option>
            <option value="full_transfer">Full transfer</option>
          </select>
        </label>
        <label className="form-field" htmlFor="taskDetailReassignmentReason">
          <span>Reason</span>
          <textarea id="taskDetailReassignmentReason" required rows="4" value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} />
        </label>
        {!isLoading && members.length === 0 ? <p className="muted-copy">No other group members available.</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-button" type="submit" disabled={isLoading || !form.requestedAssigneeId}>
          {isLoading ? 'Submitting...' : 'Request reassignment'}
        </button>
      </form>
    </div>
  )
}

export function TaskDetailsContent({
  actions,
  backPath,
  details,
  forceReadOnly = false,
  isModal = false,
  onClose,
  role,
  user,
}) {
  const [reassignmentNotice, setReassignmentNotice] = useState('')
  const [showReassignment, setShowReassignment] = useState(false)
  const { history, submission, task } = details
  const assignments = task.assignments ?? []
  const currentAssignment = assignments.find((assignment) => assignment.assigneeId === user?.id)
  const names = assigneeNames(assignments)
  const hasAssignees = assignments.length > 0
  const isAssignedToMe = assignments.some((assignment) => assignment.assigneeId === user?.id)
  const isProfessor = role === USER_ROLES.PROFESSOR
  const canUpload = role === USER_ROLES.STUDENT && !forceReadOnly && (isAssignedToMe || !hasAssignees)
  const canUpdateStatus = role === USER_ROLES.STUDENT && !forceReadOnly && (isAssignedToMe || !hasAssignees)
  const activeVersions = submission?.versions ?? []
  const currentVersion = activeVersions.find((version) => version.isFinal) ?? activeVersions[0]
  const visibleVersions = (isProfessor || forceReadOnly)
    ? activeVersions.filter((version) => version.isFinal)
    : [currentVersion, ...activeVersions.filter((version) => version.id !== currentVersion?.id).slice(0, 3)].filter(Boolean)

  return (
    <div className={isModal ? 'task-detail-modal-shell' : 'task-detail-layout'}>
      <main className="task-detail-main">
        {isModal ? (
          <button className="task-detail-modal-close" type="button" onClick={onClose} aria-label="Close task details">
            <X size={18} aria-hidden="true" />
          </button>
        ) : null}

        <div className="task-detail-titlebar">
          <div>
            <p className="eyebrow">{task.priority} priority</p>
            <h2>{task.title}</h2>
            <p>{task.description || 'No description provided.'}</p>
          </div>
        </div>

        <section className="task-detail-section">
          <div className="task-section-heading">
            <h3>Attachments</h3>
            {!isProfessor && !forceReadOnly ? (
              <TaskAttachmentUploader
                canUpload={canUpload}
                onUpload={actions.uploadVersion}
                taskId={task.id}
                userId={user?.id}
              />
            ) : null}
          </div>
          <div className="task-paper-grid">
            {visibleVersions.map((version) => (
              <TaskAttachmentPreview canManage={!isProfessor && !forceReadOnly && canUpload} key={version.id} onDelete={actions.deleteVersion} version={version} />
            ))}
            {!visibleVersions.length ? <p className="muted-copy">{isProfessor || forceReadOnly ? 'No final file selected yet.' : 'No files attached yet.'}</p> : null}
          </div>
        </section>

        {!isProfessor && !forceReadOnly ? (
          <section className="task-detail-section">
            <div className="task-section-heading">
              <h3>File versions</h3>
              {submission ? <span>{activeVersions.length} active versions</span> : <span>No submission yet</span>}
            </div>
            <TaskVersionTable
              onArchive={actions.archiveVersion}
              onDelete={actions.deleteVersion}
              onSelectCurrent={actions.selectCurrent}
              submission={submission}
            />
          </section>
        ) : null}

        <TaskActivityPanel comments={task.comments} history={history} onComment={actions.comment} />
      </main>

      <aside className="task-detail-sidebar">
        <label className="form-field" htmlFor={`taskDetailStatus-${task.id}`}>
          <span>Status</span>
          <select id={`taskDetailStatus-${task.id}`} value={task.status} onChange={(event) => actions.saveStatus(event.target.value)} disabled={!canUpdateStatus}>
            <option value="todo">Todo</option>
            <option value="in_progress">In progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
            <option value="blocked">Blocked</option>
          </select>
        </label>
        <dl className="task-detail-meta">
          <div><dt>Assigned to</dt><dd>{names.length ? names.join(', ') : 'Not assigned to anyone yet.'}</dd></div>
          <div><dt>Deadline</dt><dd>{formatDate(task.dueAt)}</dd></div>
          <div><dt>Progress</dt><dd>{progressForStatus(task.status)}%</dd></div>
          <div><dt>Points</dt><dd>{task.groupScoreWeight ?? 0}%</dd></div>
          <div><dt>Class</dt><dd>{task.group?.className ?? 'Class'}</dd></div>
        </dl>
        {role === USER_ROLES.STUDENT && !forceReadOnly && currentAssignment ? (
          <button className="secondary-button" type="button" onClick={() => setShowReassignment(true)}>Request reassignment</button>
        ) : null}
        {reassignmentNotice ? <p className="form-success">{reassignmentNotice}</p> : null}
        {!isModal ? <Link className="secondary-link-button" to={backPath}>Back to tasks</Link> : null}
      </aside>
      {showReassignment ? (
        <ReassignmentModal
          currentAssignment={currentAssignment}
          onClose={(notice) => {
            setShowReassignment(false)
            if (notice) setReassignmentNotice(notice)
          }}
          task={task}
        />
      ) : null}
    </div>
  )
}
