import { useState } from 'react'

export function JoinClassForm({ onJoin }) {
  const [classCode, setClassCode] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await onJoin(classCode)
      setClassCode('')
    } catch (joinError) {
      setError(joinError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="join-class-form" onSubmit={handleSubmit}>
      <label className="form-field" htmlFor="classCode">
        <span>Class code</span>
        <input
          id="classCode"
          name="classCode"
          placeholder="CLB-ABC123"
          required
          value={classCode}
          onChange={(event) => setClassCode(event.target.value.toUpperCase())}
        />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Joining...' : 'Join class'}
      </button>
    </form>
  )
}
