function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : 'No deadline'
}

function toDateInputValue(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

function TaskItem({ editable = false, onTaskChange, task }) {
  function updateField(field, value) {
    onTaskChange?.(task.id, { [field]: value })
  }

  return (
    <article className="generated-task">
      <div className="project-card-heading">
        <p className="eyebrow">{task.roleSuggestion || 'Suggested role'}</p>
        <span>{task.weight}%</span>
      </div>
      {editable ? (
        <div className="generated-task-edit">
          <label className="form-field">
            <span>Title</span>
            <input value={task.title ?? ''} onChange={(event) => updateField('title', event.target.value)} />
          </label>
          <label className="form-field">
            <span>Description</span>
            <textarea rows="3" value={task.description ?? ''} onChange={(event) => updateField('description', event.target.value)} />
          </label>
          <label className="form-field">
            <span>Due date</span>
            <input type="date" value={toDateInputValue(task.dueAt)} onChange={(event) => updateField('dueAt', event.target.value ? new Date(`${event.target.value}T00:00:00`).toISOString() : null)} />
          </label>
        </div>
      ) : (
        <>
          <h3>{task.title}</h3>
          <p>{task.description}</p>
        </>
      )}
      <dl className="compact-details">
        <div><dt>Due</dt><dd>{formatDate(task.dueAt)}</dd></div>
        <div><dt>Hours</dt><dd>{task.estimatedHours}</dd></div>
        <div><dt>Points</dt><dd>{task.points}</dd></div>
      </dl>
      {task.reasoning ? <p className="muted-text">{task.reasoning}</p> : null}
      {task.subtasks?.length ? (
        <div className="generated-subtasks">
          {task.subtasks.map((subtask) => <TaskItem editable={editable} key={subtask.id} onTaskChange={onTaskChange} task={subtask} />)}
        </div>
      ) : null}
    </article>
  )
}

export function GeneratedTaskTree({ editable = false, onTaskChange, tasks }) {
  return (
    <div className="generated-task-tree">
      {tasks.map((task) => <TaskItem editable={editable} key={task.id} onTaskChange={onTaskChange} task={task} />)}
    </div>
  )
}
