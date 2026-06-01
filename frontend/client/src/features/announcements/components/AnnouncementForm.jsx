import { useMemo, useState } from 'react'
import { AuthFormField } from '../../auth/components/AuthFormField'
import { uploadAnnouncementPhotos } from '../services/announcementUploadService'

function toFormState(announcement) {
  return {
    title: announcement?.title ?? '',
    body: announcement?.body ?? '',
    isPinned: announcement?.isPinned ?? false,
    existingAttachments: announcement?.attachments ?? [],
  }
}

export function AnnouncementForm({ announcement, classId, userId, onCancel, onSave }) {
  const initialForm = useMemo(() => toFormState(announcement), [announcement])
  const [form, setForm] = useState(initialForm)
  const [files, setFiles] = useState([])
  const [removeAttachmentIds, setRemoveAttachmentIds] = useState([])
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(event) {
    const { checked, name, type, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const attachments = files.length ? await uploadAnnouncementPhotos(userId, classId, files) : []
      await onSave({
        ...form,
        attachments,
        removeAttachmentIds,
      })
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function toggleRemoveAttachment(attachmentId, checked) {
    setRemoveAttachmentIds((current) => checked
      ? [...new Set([...current, attachmentId])]
      : current.filter((id) => id !== attachmentId))
  }

  return (
    <form className="announcement-form" onSubmit={handleSubmit}>
      <AuthFormField id="announcementTitle" label="Title" name="title" required value={form.title} onChange={updateField} />
      <label className="form-field" htmlFor="announcementBody">
        <span>Body</span>
        <textarea id="announcementBody" name="body" rows="5" required maxLength="5000" value={form.body} onChange={updateField} />
      </label>
      <label className="check-row" htmlFor="announcementPinned">
        <input id="announcementPinned" name="isPinned" type="checkbox" checked={form.isPinned} onChange={updateField} />
        <span>Pin announcement</span>
      </label>
      <label className="form-field" htmlFor="announcementPhotos">
        <span>Photos</span>
        <input
          id="announcementPhotos"
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => setFiles([...event.target.files])}
        />
      </label>
      {form.existingAttachments.length > 0 ? (
        <div className="announcement-attachments-editor">
          {form.existingAttachments.map((attachment) => (
            <label className="check-row" key={attachment.id}>
              <input
                type="checkbox"
                checked={removeAttachmentIds.includes(attachment.id)}
                onChange={(event) => toggleRemoveAttachment(attachment.id, event.target.checked)}
              />
              <span>Remove {attachment.fileName}</span>
            </label>
          ))}
        </div>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
      <div className="button-row">
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : announcement ? 'Update announcement' : 'Post announcement'}
        </button>
        <button className="secondary-button" type="button" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
      </div>
    </form>
  )
}
