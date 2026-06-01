import { useState } from 'react'

function toLocalInput(value) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function DeadlineForm({ currentDeadline, onSave }) {
  const [deadlineAt, setDeadlineAt] = useState(toLocalInput(currentDeadline))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await onSave(new Date(deadlineAt).toISOString())
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="deadline-form" onSubmit={handleSubmit}>
      <label className="form-field" htmlFor="deadlineAt">
        <span>Extend or reschedule deadline</span>
        <input id="deadlineAt" type="datetime-local" required value={deadlineAt} onChange={(event) => setDeadlineAt(event.target.value)} />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="secondary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save deadline'}</button>
    </form>
  )
}
