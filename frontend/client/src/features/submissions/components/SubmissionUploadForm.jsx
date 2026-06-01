import { useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { uploadSubmissionFile, validateSubmissionFile } from '../services/submissionUploadService'

function flattenTasks(tasks) {
  return tasks.flatMap((task) => [task, ...flattenTasks(task.children ?? [])])
}

export function SubmissionUploadForm({ onUpload, tasks }) {
  const { user } = useAuth()
  const taskOptions = flattenTasks(tasks)
  const [form, setForm] = useState({ taskId: '', notes: '', selectAsFinal: true })
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(event) {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm((current) => ({ ...current, [event.target.name]: value }))
  }

  function updateFile(event) {
    const nextFile = event.target.files?.[0] ?? null
    setFile(nextFile)
    setError('')
    if (nextFile) {
      try {
        validateSubmissionFile(nextFile)
      } catch (validationError) {
        setError(validationError.message)
      }
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      if (!file) throw new Error('Select a file to upload.')
      const filePayload = await uploadSubmissionFile(user.id, form.taskId, file)
      await onUpload({
        taskId: form.taskId,
        notes: form.notes || null,
        selectAsFinal: form.selectAsFinal,
        ...filePayload,
      })
      setForm({ taskId: '', notes: '', selectAsFinal: true })
      setFile(null)
      event.target.reset()
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="project-form" onSubmit={handleSubmit}>
      <label className="form-field" htmlFor="submissionTaskId">
        <span>Task</span>
        <select id="submissionTaskId" name="taskId" required value={form.taskId} onChange={updateField}>
          <option value="">Select task</option>
          {taskOptions.map((task) => (
            <option key={task.id} value={task.id}>{task.title}</option>
          ))}
        </select>
      </label>
      <label className="form-field" htmlFor="submissionFile">
        <span>File</span>
        <input id="submissionFile" type="file" required onChange={updateFile} />
      </label>
      <label className="form-field" htmlFor="notes">
        <span>Version notes</span>
        <textarea id="notes" name="notes" rows="3" value={form.notes} onChange={updateField} />
      </label>
      <label className="check-row">
        <input type="checkbox" name="selectAsFinal" checked={form.selectAsFinal} onChange={updateField} />
        <span>Select this upload as final version</span>
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="primary-button" type="submit" disabled={isSubmitting || taskOptions.length === 0}>
        {isSubmitting ? 'Uploading...' : 'Upload version'}
      </button>
    </form>
  )
}
