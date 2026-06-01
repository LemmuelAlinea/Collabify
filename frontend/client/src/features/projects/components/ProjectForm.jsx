import { useMemo, useState } from 'react'
import { AuthFormField } from '../../auth/components/AuthFormField'
import { PROJECT_TYPES } from '../constants/projectTypes'

function toLocalInput(value) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function toIso(value) {
  return new Date(value).toISOString()
}

function toDateInput(value) {
  return toLocalInput(value).slice(0, 10)
}

function toTimeInput(value) {
  return toLocalInput(value).slice(11, 16)
}

function stringifyRubrics(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

function toFormState(project) {
  const classIds = project?.classIds?.length
    ? project.classIds
    : project?.classes?.map((classItem) => classItem.id) ?? (project?.classId ? [project.classId] : [])

  return {
    classIds,
    title: project?.title ?? '',
    description: project?.description ?? '',
    guidelines: project?.guidelines ?? '',
    rubrics: stringifyRubrics(project?.rubrics),
    projectType: project?.projectType ?? 'system_development',
    yearLevel: project?.yearLevel ?? '',
    workMode: project?.workMode ?? 'group',
    memberCount: project?.memberCount ?? '',
    startAt: toLocalInput(project?.startAt),
    deadlineAt: toLocalInput(project?.deadlineAt),
    releaseDate: toDateInput(project?.releaseAt ?? project?.visibilityAt),
    releaseTime: toTimeInput(project?.releaseAt ?? project?.visibilityAt),
  }
}

export function ProjectForm({ classes, onCancel, onSave, project }) {
  const initialForm = useMemo(() => toFormState(project), [project])
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(event) {
    if (event.target.name === 'classIds') {
      const values = Array.from(event.target.selectedOptions).map((option) => option.value)
      setForm((current) => ({
        ...current,
        classIds: values,
      }))
      return
    }

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
      const releaseAt = toIso(`${form.releaseDate}T${form.releaseTime}`)
      await onSave({
        ...form,
        classId: form.classIds[0],
        classIds: form.classIds,
        yearLevel: Number(form.yearLevel),
        memberCount: form.workMode === 'individual' ? 1 : Number(form.memberCount),
        startAt: toIso(form.startAt),
        deadlineAt: toIso(form.deadlineAt),
        visibilityAt: releaseAt,
        releaseAt,
        guidelines: form.guidelines || null,
      })
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="project-form" onSubmit={handleSubmit}>
      <label className="form-field" htmlFor="classIds">
        <span>Classes</span>
        <select id="classIds" name="classIds" multiple required value={form.classIds} onChange={updateField}>
          {classes.map((classItem) => (
            <option key={classItem.id} value={classItem.id}>{classItem.name} - {classItem.section}</option>
          ))}
        </select>
      </label>
      <AuthFormField id="title" label="Title" name="title" required value={form.title} onChange={updateField} />
      <label className="form-field" htmlFor="description"><span>Description</span><textarea id="description" name="description" rows="4" required value={form.description} onChange={updateField} /></label>
      <label className="form-field" htmlFor="guidelines"><span>Guidelines</span><textarea id="guidelines" name="guidelines" rows="5" value={form.guidelines} onChange={updateField} /></label>
      <label className="form-field" htmlFor="rubrics"><span>Rubrics</span><textarea id="rubrics" name="rubrics" rows="5" value={form.rubrics} onChange={updateField} /></label>
      <div className="form-grid">
        <label className="form-field" htmlFor="projectType"><span>Project type</span><select id="projectType" name="projectType" required value={form.projectType} onChange={updateField}>{PROJECT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
        <AuthFormField id="yearLevel" label="Year level" name="yearLevel" type="number" min="1" max="5" required value={form.yearLevel} onChange={updateField} />
      </div>
      <div className="form-grid">
        <label className="form-field" htmlFor="workMode"><span>Group or individual</span><select id="workMode" name="workMode" required value={form.workMode} onChange={updateField}><option value="group">Group</option><option value="individual">Individual</option></select></label>
        <AuthFormField id="memberCount" label="Member count" name="memberCount" type="number" min="1" max="20" required={form.workMode === 'group'} disabled={form.workMode === 'individual'} value={form.workMode === 'individual' ? 1 : form.memberCount} onChange={updateField} />
      </div>
      <div className="form-grid">
        <AuthFormField id="startAt" label="Start date" name="startAt" type="datetime-local" required value={form.startAt} onChange={updateField} />
        <AuthFormField id="deadlineAt" label="Deadline" name="deadlineAt" type="datetime-local" required value={form.deadlineAt} onChange={updateField} />
      </div>
      <div className="form-grid">
        <AuthFormField id="releaseDate" label="Release date" name="releaseDate" type="date" required value={form.releaseDate} onChange={updateField} />
        <AuthFormField id="releaseTime" label="Release time" name="releaseTime" type="time" required value={form.releaseTime} onChange={updateField} />
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="button-row">
        <button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : project ? 'Update project' : 'Create project'}</button>
        <button className="secondary-button" type="button" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
      </div>
    </form>
  )
}
