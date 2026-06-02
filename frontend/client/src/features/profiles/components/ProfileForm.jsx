import { useMemo, useState } from 'react'
import { AuthFormField } from '../../auth/components/AuthFormField'
import { uploadProfilePhoto } from '../services/avatarService'

function toFormState(profile) {
  return {
    firstName: profile.firstName ?? '',
    middleName: profile.middleName ?? '',
    lastName: profile.lastName ?? '',
    avatarUrl: profile.avatarUrl ?? '',
    bio: profile.bio ?? '',
    department: profile.department ?? '',
    yearLevel: profile.yearLevel ?? '',
    section: profile.section ?? '',
    subjectSpecialization: profile.subjectSpecialization ?? '',
    newPassword: '',
    confirmPassword: '',
  }
}

export function ProfileForm({ profile, onCancel, onSave }) {
  const initialForm = useMemo(() => toFormState(profile), [profile])
  const [form, setForm] = useState(initialForm)
  const [photoFile, setPhotoFile] = useState(null)
  const [error, setError] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (form.newPassword || form.confirmPassword) {
      if (form.newPassword !== form.confirmPassword) {
        setError('New password and re-entered password must match.')
        return
      }
      if (form.newPassword.length < 8) {
        setError('New password must be at least 8 characters.')
        return
      }
    }

    setIsConfirming(true)
  }

  async function confirmSave() {
    setIsSubmitting(true)
    setIsConfirming(false)

    try {
      let avatarUrl = form.avatarUrl

      if (photoFile) {
        avatarUrl = await uploadProfilePhoto(profile.userId, photoFile)
      }

      await onSave({
        ...form,
        avatarUrl,
        newPassword: form.newPassword || undefined,
        confirmPassword: undefined,
        yearLevel: form.yearLevel || null,
      })
    } catch (profileError) {
      setError(profileError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="profile-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <AuthFormField id="firstName" label="First name" name="firstName" required value={form.firstName} onChange={updateField} />
        <AuthFormField id="lastName" label="Last name" name="lastName" required value={form.lastName} onChange={updateField} />
      </div>

      <AuthFormField id="middleName" label="Middle name" name="middleName" value={form.middleName} onChange={updateField} />
      <AuthFormField id="department" label="Department" name="department" value={form.department} onChange={updateField} />

      {profile.role === 'student' ? (
        <div className="form-grid">
          <AuthFormField id="yearLevel" label="Year level" name="yearLevel" type="number" min="1" max="5" value={form.yearLevel} onChange={updateField} />
          <AuthFormField id="section" label="Section" name="section" value={form.section} onChange={updateField} />
        </div>
      ) : (
        <AuthFormField id="subjectSpecialization" label="Subject specialization" name="subjectSpecialization" value={form.subjectSpecialization} onChange={updateField} />
      )}

      <label className="form-field" htmlFor="bio">
        <span>Bio</span>
        <textarea id="bio" name="bio" rows="5" maxLength="500" value={form.bio} onChange={updateField} />
      </label>

      <div className="form-grid">
        <AuthFormField id="newPassword" label="New password" name="newPassword" type="password" minLength="8" autoComplete="new-password" value={form.newPassword} onChange={updateField} />
        <AuthFormField id="confirmPassword" label="Re-enter password" name="confirmPassword" type="password" minLength="8" autoComplete="new-password" value={form.confirmPassword} onChange={updateField} />
      </div>

      <label className="form-field" htmlFor="photo">
        <span>Profile photo</span>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="button-row">
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save profile'}
        </button>
        <button className="secondary-button" type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      </div>

      {isConfirming ? (
        <div className="modal-backdrop">
          <div className="modal-panel confirm-panel" role="dialog" aria-modal="true" aria-labelledby="profileConfirmTitle">
            <p className="eyebrow">Confirm changes</p>
            <h3 id="profileConfirmTitle">Save profile updates?</h3>
            <p>{form.newPassword ? 'Your profile and password will be updated.' : 'Your profile information will be updated.'}</p>
            <div className="button-row">
              <button className="primary-button" type="button" onClick={confirmSave} disabled={isSubmitting}>
                Confirm save
              </button>
              <button className="secondary-button" type="button" onClick={() => setIsConfirming(false)} disabled={isSubmitting}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  )
}
