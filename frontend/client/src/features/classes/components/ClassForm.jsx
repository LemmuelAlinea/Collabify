import { useMemo, useState } from 'react'
import { AuthFormField } from '../../auth/components/AuthFormField'

function toFormState(classItem) {
  return {
    name: classItem?.name ?? '',
    section: classItem?.section ?? '',
    subject: classItem?.subject ?? '',
    yearLevel: classItem?.yearLevel ?? '',
    semester: classItem?.semester ?? '',
    schoolYear: classItem?.schoolYear ?? '',
    description: classItem?.description ?? '',
    syllabusId: classItem?.syllabusId ?? '',
    curriculumId: classItem?.curriculumId ?? '',
  }
}

export function ClassForm({ classItem, curricula = [], onCancel, onSave, syllabi = [] }) {
  const initialForm = useMemo(() => toFormState(classItem), [classItem])
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
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
    setIsSubmitting(true)

    try {
      await onSave({
        ...form,
        yearLevel: Number(form.yearLevel),
        description: form.description || null,
        syllabusId: form.syllabusId || null,
        curriculumId: form.curriculumId || null,
      })
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="class-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <AuthFormField id="name" label="Name" name="name" required value={form.name} onChange={updateField} />
        <AuthFormField id="subject" label="Subject" name="subject" required value={form.subject} onChange={updateField} />
      </div>
      <div className="form-grid">
        <AuthFormField id="section" label="Section" name="section" required value={form.section} onChange={updateField} />
        <label className="form-field" htmlFor="yearLevel">
          <span>Year level</span>
          <select id="yearLevel" name="yearLevel" required value={form.yearLevel} onChange={updateField}>
            <option value="">Select year level</option>
            <option value="1">1st year</option>
            <option value="2">2nd year</option>
            <option value="3">3rd year</option>
            <option value="4">4th year</option>
            <option value="5">5th year</option>
          </select>
        </label>
      </div>
      <div className="form-grid">
        <label className="form-field" htmlFor="semester">
          <span>Semester</span>
          <select id="semester" name="semester" required value={form.semester} onChange={updateField}>
            <option value="">Select semester</option>
            <option value="1st sem">1st sem</option>
            <option value="2nd sem">2nd sem</option>
            <option value="3rd sem">3rd sem</option>
            <option value="4th sem">4th sem</option>
          </select>
        </label>
        <AuthFormField id="schoolYear" label="School year" name="schoolYear" required placeholder="2025-2026" value={form.schoolYear} onChange={updateField} />
      </div>
      <label className="form-field" htmlFor="description">
        <span>Description</span>
        <textarea id="description" name="description" rows="4" value={form.description} onChange={updateField} />
      </label>
      <label className="form-field" htmlFor="syllabusId">
        <span>Assign syllabus</span>
        <select id="syllabusId" name="syllabusId" value={form.syllabusId} onChange={updateField}>
          <option value="">No syllabus selected</option>
          {syllabi.map((syllabus) => (
            <option key={syllabus.id} value={syllabus.id}>{syllabus.title}</option>
          ))}
        </select>
      </label>
      <label className="form-field" htmlFor="curriculumId">
        <span>Assign curriculum</span>
        <select id="curriculumId" name="curriculumId" value={form.curriculumId} onChange={updateField}>
          <option value="">No curriculum selected</option>
          {curricula.filter((curriculum) => curriculum.isActive).map((curriculum) => (
            <option key={curriculum.id} value={curriculum.id}>{curriculum.title}</option>
          ))}
        </select>
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="button-row">
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : classItem ? 'Update class' : 'Create class'}
        </button>
        <button className="secondary-button" type="button" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
      </div>
    </form>
  )
}
