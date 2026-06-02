import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { USER_ROLES } from '../../auth/constants/roles'
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
  const { history, submission, task } = details
  const assignments = task.assignments ?? []
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
        {!isModal ? <Link className="secondary-link-button" to={backPath}>Back to tasks</Link> : null}
      </aside>
    </div>
  )
}
