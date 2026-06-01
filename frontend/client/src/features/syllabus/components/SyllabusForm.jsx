import { useMemo, useState } from 'react'
import { AuthFormField } from '../../auth/components/AuthFormField'
import { useAuth } from '../../auth/hooks/useAuth'
import { uploadSyllabusFile, validateSyllabusFile } from '../services/syllabusUploadService'

function toFormState(syllabus) {
  return {
    classId: syllabus?.classId ?? '',
    title: syllabus?.title ?? '',
    description: syllabus?.description ?? '',
    effectiveFrom: syllabus?.effectiveFrom ?? '',
    effectiveTo: syllabus?.effectiveTo ?? '',
  }
}

export function SyllabusForm({ classes, syllabus, onCancel, onSave }) {
  const { user } = useAuth()
  const initialForm = useMemo(() => toFormState(syllabus), [syllabus])
  const [form, setForm] = useState(initialForm)
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = Boolean(syllabus)

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  function updateFile(event) {
    const nextFile = event.target.files?.[0] ?? null
    setFile(nextFile)
    setError('')

    if (nextFile) {
      try {
        validateSyllabusFile(nextFile)
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
      let filePayload = {}

      if (file) {
        filePayload = await uploadSyllabusFile(user.id, file)
      } else if (!isEditing) {
        throw new Error('Upload a syllabus file before saving.')
      }

      await onSave({
        ...form,
        ...filePayload,
        description: form.description || null,
        effectiveFrom: form.effectiveFrom || null,
        effectiveTo: form.effectiveTo || null,
      })
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="syllabus-form" onSubmit={handleSubmit}>
      <label className="form-field" htmlFor="classId">
        <span>Class</span>
        <select id="classId" name="classId" required value={form.classId} onChange={updateField}>
          <option value="">Select class</option>
          {classes.map((classItem) => (
            <option key={classItem.id} value={classItem.id}>
              {classItem.code} - {classItem.name}
            </option>
          ))}
        </select>
      </label>

      <AuthFormField id="title" label="Syllabus title" name="title" required value={form.title} onChange={updateField} />

      <label className="form-field" htmlFor="description">
        <span>Description</span>
        <textarea id="description" name="description" rows="4" value={form.description} onChange={updateField} />
      </label>

      <div className="form-grid">
        <AuthFormField id="effectiveFrom" label="Effective from" name="effectiveFrom" type="date" value={form.effectiveFrom} onChange={updateField} />
        <AuthFormField id="effectiveTo" label="Effective to" name="effectiveTo" type="date" value={form.effectiveTo} onChange={updateField} />
      </div>

      <label className="form-field" htmlFor="syllabusFile">
        <span>{isEditing ? 'Replace file' : 'Syllabus file'}</span>
        <input id="syllabusFile" name="syllabusFile" type="file" accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx" onChange={updateFile} />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="button-row">
        <button className="primary-button" type="submit" disabled={isSubmitting || classes.length === 0}>
          {isSubmitting ? 'Saving...' : isEditing ? 'Update syllabus' : 'Upload syllabus'}
        </button>
        <button className="secondary-button" type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      </div>
    </form>
  )
}
