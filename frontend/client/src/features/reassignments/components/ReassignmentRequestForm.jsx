import { useMemo, useState } from 'react'

function flattenTasks(tasks) {
  return tasks.flatMap((task) => [task, ...flattenTasks(task.children ?? [])])
}

export function ReassignmentRequestForm({ groups, onSubmit, tasks }) {
  const taskOptions = useMemo(() => flattenTasks(tasks), [tasks])
  const [form, setForm] = useState({
    currentAssigneeId: '',
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
        <label className="form-field" htmlFor="currentAssigneeId">
          <span>Current assignee</span>
          <select id="currentAssigneeId" name="currentAssigneeId" required value={form.currentAssigneeId} onChange={updateField}>
            <option value="">Select current</option>
            {assignees.map((assignment) => (
              <option key={assignment.assigneeId} value={assignment.assigneeId}>{assignment.displayName}</option>
            ))}
          </select>
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
