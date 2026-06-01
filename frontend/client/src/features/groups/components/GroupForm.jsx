import { useState } from 'react'
import { AuthFormField } from '../../auth/components/AuthFormField'

export function GroupForm({ onCancel, onSave, projects }) {
  const [form, setForm] = useState({
    projectId: '',
    name: '',
    description: '',
  })
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
        description: form.description || null,
      })
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="project-form" onSubmit={handleSubmit}>
      <label className="form-field" htmlFor="projectId">
        <span>Project</span>
        <select id="projectId" name="projectId" required value={form.projectId} onChange={updateField}>
          <option value="">Select project</option>
          {projects.filter((project) => project.workMode === 'group').map((project) => (
            <option key={project.id} value={project.id}>{project.title}</option>
          ))}
        </select>
      </label>
      <AuthFormField id="name" label="Group name" name="name" required value={form.name} onChange={updateField} />
      <label className="form-field" htmlFor="description">
        <span>Description</span>
        <textarea id="description" name="description" rows="4" value={form.description} onChange={updateField} />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="button-row">
        <button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create group'}</button>
        <button className="secondary-button" type="button" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
      </div>
    </form>
  )
}
