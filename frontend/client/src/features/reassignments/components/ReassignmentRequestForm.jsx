import { useEffect, useMemo, useState } from 'react'

function flattenTasks(tasks) {
  return tasks.flatMap((task) => [task, ...flattenTasks(task.children ?? [])])
}

export function ReassignmentRequestForm({ currentAssigneeName, groups, onSubmit, tasks, userId }) {
  const taskOptions = useMemo(() => {
    return flattenTasks(tasks).filter((task) => {
      const assignedToUser = (task.assignments ?? []).some((assignment) => assignment.assigneeId === userId)
      return assignedToUser && task.status !== 'done'
    })
  }, [tasks, userId])
  const [form, setForm] = useState({
    currentAssigneeId: userId ?? '',
    reason: '',
    requestedAssigneeId: '',
    scorePolicy: 'keep_original',
    taskId: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const selectedTask = taskOptions.find((task) => task.id === form.taskId)
  const selectedGroup = groups.find((group) => group.id === selectedTask?.groupId)
  const assignees = selectedTask?.assignments ?? []

  useEffect(() => {
    setForm((current) => ({
      ...current,
      currentAssigneeId: userId ?? '',
    }))
  }, [userId])

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await onSubmit(form)
      setForm({
        currentAssigneeId: '',
        reason: '',
        requestedAssigneeId: '',
        scorePolicy: 'keep_original',
        taskId: '',
      })
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="reassignment-form" onSubmit={handleSubmit}>
      <label className="form-field" htmlFor="taskId">
        <span>Task</span>
        <select id="taskId" name="taskId" required value={form.taskId} onChange={updateField}>
          <option value="">Select task</option>
          {taskOptions.map((task) => (
            <option key={task.id} value={task.id}>{task.title}</option>
          ))}
        </select>
      </label>
      <div className="form-grid">
        <label className="form-field">
          <span>Current assignee</span>
          <input value={currentAssigneeName || 'Current assignee'} readOnly />
        </label>
        <label className="form-field" htmlFor="requestedAssigneeId">
          <span>New assignee</span>
          <select id="requestedAssigneeId" name="requestedAssigneeId" required value={form.requestedAssigneeId} onChange={updateField}>
            <option value="">Select new</option>
            {(selectedGroup?.members ?? [])
              .filter((member) => member.status === 'active')
              .filter((member) => member.userId !== form.currentAssigneeId)
              .map((member) => (
                <option key={member.userId} value={member.userId}>{member.displayName}</option>
              ))}
          </select>
        </label>
      </div>
      <label className="form-field" htmlFor="scorePolicy">
        <span>Score handling</span>
        <select id="scorePolicy" name="scorePolicy" value={form.scorePolicy} onChange={updateField}>
          <option value="keep_original">Keep original score</option>
          <option value="split_50_50">Split score 50/50</option>
          <option value="full_transfer">Full transfer</option>
        </select>
      </label>
      <label className="form-field" htmlFor="reason">
        <span>Reason</span>
        <textarea id="reason" name="reason" rows="4" required value={form.reason} onChange={updateField} />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="primary-button" type="submit" disabled={isSubmitting || taskOptions.length === 0}>
        {isSubmitting ? 'Submitting...' : 'Request reassignment'}
      </button>
    </form>
  )
}
