function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : 'No deadline'
}

function TaskItem({ task }) {
  return (
    <article className="generated-task">
      <div className="project-card-heading">
        <p className="eyebrow">{task.roleSuggestion || 'Suggested role'}</p>
        <span>{task.weight}%</span>
      </div>
      <h3>{task.title}</h3>
      <p>{task.description}</p>
      <dl className="compact-details">
        <div><dt>Due</dt><dd>{formatDate(task.dueAt)}</dd></div>
        <div><dt>Hours</dt><dd>{task.estimatedHours}</dd></div>
        <div><dt>Points</dt><dd>{task.points}</dd></div>
      </dl>
      {task.reasoning ? <p className="muted-text">{task.reasoning}</p> : null}
      {task.subtasks?.length ? (
        <div className="generated-subtasks">
          {task.subtasks.map((subtask) => <TaskItem key={subtask.id} task={subtask} />)}
        </div>
      ) : null}
    </article>
  )
}

export function GeneratedTaskTree({ tasks }) {
  return (
    <div className="generated-task-tree">
      {tasks.map((task) => <TaskItem key={task.id} task={task} />)}
    </div>
  )
}
