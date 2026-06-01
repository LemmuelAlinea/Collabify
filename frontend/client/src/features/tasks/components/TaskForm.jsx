import { useMemo, useState } from 'react'
import { AuthFormField } from '../../auth/components/AuthFormField'

function toIso(value) {
  return value ? new Date(value).toISOString() : null
}

function flattenTasks(tasks, depth = 0) {
  return tasks.flatMap((task) => [
    { ...task, depth },
    ...flattenTasks(task.children ?? [], depth + 1),
  ])
}

export function TaskForm({ groups, onCancel, onSave, selectedGroupId, tasks }) {
  const taskOptions = useMemo(() => flattenTasks(tasks), [tasks])
  const [form, setForm] = useState({
    groupId: selectedGroupId ?? '',
    parentTaskId: '',
    title: '',
    description: '',
    dueAt: '',
    priority: 'medium',
    estimatedHours: '',
    scoreWeight: '',
    progress: 0,
    assigneeIds: [],
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedGroup = groups.find((group) => group.id === form.groupId)
  const activeMembers = (selectedGroup?.members ?? []).filter((member) => member.status === 'active')

  function updateField(event) {
    if (event.target.name === 'assigneeIds') {
      setForm((current) => ({
        ...current,
        assigneeIds: Array.from(event.target.selectedOptions).map((option) => option.value),
      }))
      return
    }

    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
      ...(event.target.name === 'groupId' ? { parentTaskId: '', assigneeIds: [] } : {}),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    const group = groups.find((item) => item.id === form.groupId)

    try {
      await onSave({
        projectId: group.projectId,
        groupId: form.groupId,
        parentTaskId: form.parentTaskId || null,
        title: form.title,
        description: form.description || null,
        dueAt: toIso(form.dueAt),
        priority: form.priority,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : null,
        scoreWeight: form.scoreWeight ? Number(form.scoreWeight) : null,
        progress: Number(form.progress),
        assigneeIds: form.assigneeIds,
      })
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="project-form" onSubmit={handleSubmit}>
      <label className="form-field" htmlFor="taskGroupId">
        <span>Group</span>
        <select id="taskGroupId" name="groupId" required value={form.groupId} onChange={updateField}>
          <option value="">Select group</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>{group.name} - {group.project?.title}</option>
          ))}
        </select>
      </label>
      <label className="form-field" htmlFor="parentTaskId">
        <span>Parent task</span>
        <select id="parentTaskId" name="parentTaskId" value={form.parentTaskId} onChange={updateField}>
          <option value="">Standalone or main task</option>
          {taskOptions.filter((task) => task.groupId === form.groupId).map((task) => (
            <option key={task.id} value={task.id}>{`${'-- '.repeat(task.depth)}${task.title}`}</option>
          ))}
        </select>
      </label>
      <AuthFormField id="taskTitle" label="Title" name="title" required value={form.title} onChange={updateField} />
      <label className="form-field" htmlFor="taskDescription">
        <span>Description</span>
        <textarea id="taskDescription" name="description" rows="4" value={form.description} onChange={updateField} />
      </label>
      <div className="form-grid">
        <AuthFormField id="taskDueAt" label="Deadline" name="dueAt" type="datetime-local" value={form.dueAt} onChange={updateField} />
        <label className="form-field" htmlFor="priority">
          <span>Priority</span>
          <select id="priority" name="priority" required value={form.priority} onChange={updateField}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
      </div>
      <div className="form-grid">
        <AuthFormField id="estimatedHours" label="Estimated hours" name="estimatedHours" type="number" min="0" max="999" value={form.estimatedHours} onChange={updateField} />
        <AuthFormField id="scoreWeight" label="Manual group weight %" name="scoreWeight" type="number" min="0" max="100" value={form.scoreWeight} onChange={updateField} />
      </div>
      <AuthFormField id="progress" label="Progress" name="progress" type="number" min="0" max="100" required value={form.progress} onChange={updateField} />
      <label className="form-field" htmlFor="assigneeIds">
        <span>Assignees</span>
        <select id="assigneeIds" name="assigneeIds" multiple value={form.assigneeIds} onChange={updateField}>
          {activeMembers.map((member) => (
            <option key={member.userId} value={member.userId}>{member.displayName}</option>
          ))}
        </select>
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="button-row">
        <button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Create task'}</button>
        <button className="secondary-button" type="button" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
      </div>
    </form>
  )
}
