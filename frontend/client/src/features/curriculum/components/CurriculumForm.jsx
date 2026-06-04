import { useMemo, useState } from 'react'
import { AuthFormField } from '../../auth/components/AuthFormField'
import { useAuth } from '../../auth/hooks/useAuth'
import { uploadCurriculumFile, validateCurriculumFile } from '../services/curriculumUploadService'

function normalizeStudy(item, index) {
  if (typeof item === 'string') {
    return {
      title: item.slice(0, 120) || `Program of Study ${index + 1}`,
      content: item,
    }
  }

  return {
    id: item?.id,
    title: item?.title || item?.content?.slice(0, 120) || `Program of Study ${index + 1}`,
    content: item?.content ?? '',
  }
}

function toFormState(curriculum) {
  return {
    title: curriculum?.title ?? '',
    description: curriculum?.description ?? '',
    programObjectives: curriculum?.programObjectives ?? '',
    programOutcomes: curriculum?.programOutcomes ?? '',
    curriculumComponents: curriculum?.curriculumComponents ?? '',
    academicYear: curriculum?.academicYear ?? '',
    programStudies: curriculum?.programStudies?.map(normalizeStudy) ?? [],
  }
}

export function CurriculumForm({ curriculum, onCancel, onSave }) {
  const { user } = useAuth()
  const initialForm = useMemo(() => toFormState(curriculum), [curriculum])
  const [form, setForm] = useState(initialForm)
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [studyModal, setStudyModal] = useState({ isOpen: false, title: '', content: '', index: null })
  const isEditing = Boolean(curriculum)

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function updateFile(event) {
    const nextFile = event.target.files?.[0] ?? null
    setFile(nextFile)
    setError('')
    if (nextFile) {
      try {
        validateCurriculumFile(nextFile)
      } catch (validationError) {
        setError(validationError.message)
      }
    }
  }

  function saveStudy() {
    const title = studyModal.title.trim()
    const content = studyModal.content.trim()
    if (!title || !content) return
    setForm((current) => {
      const programStudies = [...current.programStudies]
      const nextStudy = { ...programStudies[studyModal.index], title, content }
      if (studyModal.index === null) programStudies.push(nextStudy)
      else programStudies[studyModal.index] = nextStudy
      return { ...current, programStudies }
    })
    setStudyModal({ isOpen: false, title: '', content: '', index: null })
  }

  function moveStudy(index, direction) {
    setForm((current) => {
      const target = index + direction
      if (target < 0 || target >= current.programStudies.length) return current
      const programStudies = [...current.programStudies]
      const [item] = programStudies.splice(index, 1)
      programStudies.splice(target, 0, item)
      return { ...current, programStudies }
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const filePayload = file ? await uploadCurriculumFile(user.id, file) : {}
      await onSave({
        ...form,
        ...filePayload,
        description: form.description || null,
        programObjectives: form.programObjectives || null,
        programOutcomes: form.programOutcomes || null,
        curriculumComponents: form.curriculumComponents || null,
        academicYear: form.academicYear || null,
        programStudies: form.programStudies,
      })
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="syllabus-form curriculum-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <AuthFormField id="title" label="Curriculum title" name="title" required value={form.title} onChange={updateField} />
        <AuthFormField id="academicYear" label="Academic year" name="academicYear" placeholder="2025-2026" value={form.academicYear} onChange={updateField} />
      </div>

      <label className="form-field" htmlFor="description">
        <span>Description (optional)</span>
        <textarea id="description" name="description" rows="4" value={form.description} onChange={updateField} />
      </label>

      <div className="form-grid">
        <label className="form-field" htmlFor="programObjectives">
          <span>Program objectives</span>
          <textarea id="programObjectives" name="programObjectives" rows="5" value={form.programObjectives} onChange={updateField} />
        </label>
        <label className="form-field" htmlFor="programOutcomes">
          <span>Program outcomes</span>
          <textarea id="programOutcomes" name="programOutcomes" rows="5" value={form.programOutcomes} onChange={updateField} />
        </label>
      </div>

      <label className="form-field" htmlFor="curriculumComponents">
        <span>Curriculum components</span>
        <textarea id="curriculumComponents" name="curriculumComponents" rows="5" value={form.curriculumComponents} onChange={updateField} />
      </label>

      <div className="program-study-panel">
        <div className="syllabus-title-row">
          <h3>Program of study</h3>
          <button className="secondary-button" type="button" onClick={() => setStudyModal({ isOpen: true, title: '', content: '', index: null })}>
            Add Program of Study
          </button>
        </div>
        {form.programStudies.length ? (
          <div className="program-study-table-wrap">
            <table className="program-study-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
            {form.programStudies.map((item, index) => (
              <tr key={`${item.title}-${index}`}>
                <td>{item.title}</td>
                <td>
                  <div className="button-row compact-actions">
                    <button type="button" className="inline-button" onClick={() => moveStudy(index, -1)}>Up</button>
                    <button type="button" className="inline-button" onClick={() => moveStudy(index, 1)}>Down</button>
                    <button type="button" className="inline-button" onClick={() => setStudyModal({ isOpen: true, title: item.title, content: item.content, index })}>Edit</button>
                    <button type="button" className="inline-button danger-text" onClick={() => setForm((current) => ({ ...current, programStudies: current.programStudies.filter((_, itemIndex) => itemIndex !== index) }))}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted-text">No program of study items yet.</p>}
      </div>

      <label className="form-field" htmlFor="curriculumFile">
        <span>{isEditing ? 'Replace file' : 'Curriculum file (optional)'}</span>
        <input id="curriculumFile" name="curriculumFile" type="file" accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx" onChange={updateFile} />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="button-row">
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : isEditing ? 'Update curriculum' : 'Upload curriculum'}
        </button>
        <button className="secondary-button" type="button" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
      </div>

      {studyModal.isOpen ? (
        <div className="modal-backdrop">
          <div className="dialog-card compact-dialog">
            <div className="syllabus-title-row">
              <h3>{studyModal.index === null ? 'Add Program of Study' : 'Edit Program of Study'}</h3>
              <button className="secondary-button" type="button" onClick={() => setStudyModal({ isOpen: false, title: '', content: '', index: null })}>Close</button>
            </div>
            <AuthFormField
              id="programStudyTitle"
              label="Program of study title"
              required
              value={studyModal.title}
              onChange={(event) => setStudyModal((current) => ({ ...current, title: event.target.value }))}
            />
            <label className="form-field" htmlFor="programStudyValue">
              <span>Content</span>
              <textarea id="programStudyValue" rows="6" value={studyModal.content} onChange={(event) => setStudyModal((current) => ({ ...current, content: event.target.value }))} />
            </label>
            <button className="primary-button" type="button" onClick={saveStudy}>Save</button>
          </div>
        </div>
      ) : null}
    </form>
  )
}
