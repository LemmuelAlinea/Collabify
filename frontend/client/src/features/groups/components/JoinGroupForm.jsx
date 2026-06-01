import { useState } from 'react'
import { AuthFormField } from '../../auth/components/AuthFormField'

export function JoinGroupForm({ onJoin }) {
  const [groupId, setGroupId] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await onJoin(groupId.trim())
      setGroupId('')
    } catch (joinError) {
      setError(joinError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="deadline-form" onSubmit={handleSubmit}>
      <AuthFormField id="groupId" label="Group ID" name="groupId" required value={groupId} onChange={(event) => setGroupId(event.target.value)} />
      {error ? <p className="form-error">{error}</p> : null}
      <button className="secondary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Joining...' : 'Join group'}</button>
    </form>
  )
}
