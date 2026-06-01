import { useState } from 'react'
import { ClassCard } from '../components/ClassCard'
import { ClassForm } from '../components/ClassForm'
import { useClasses } from '../hooks/useClasses'
import { useSyllabi } from '../../syllabus/hooks/useSyllabi'
import { assignClassSyllabus } from '../services/classService'

export function ProfessorClassesPage() {
  const { classes, error, isLoading, removeClass, saveClass, saveNewClass } = useClasses()
  const { syllabi } = useSyllabi()
  const [mode, setMode] = useState('list')
  const [selectedClass, setSelectedClass] = useState(null)
  const [notice, setNotice] = useState('')

  function startCreate() {
    setSelectedClass(null)
    setNotice('')
    setMode('form')
  }

  function startEdit(classItem) {
    setSelectedClass(classItem)
    setNotice('')
    setMode('form')
  }

  async function handleSave(payload) {
    const { syllabusId, ...classPayload } = payload

    if (selectedClass) {
      const patchPayload = Object.fromEntries(
        Object.entries(classPayload).filter(([key, value]) => value !== selectedClass[key]),
      )

      if (Object.keys(patchPayload).length > 0) {
        await saveClass(selectedClass.id, patchPayload)
      }

      if (syllabusId) {
        await assignClassSyllabus(selectedClass.id, syllabusId)
      }

      setNotice(
        Object.keys(patchPayload).length > 0 || syllabusId
          ? 'Class updated.'
          : 'No changes to save.',
      )
    } else {
      const createdClass = await saveNewClass(classPayload)
      if (syllabusId) {
        await assignClassSyllabus(createdClass.id, syllabusId)
      }
      setNotice('Class created.')
    }

    setSelectedClass(null)
    setMode('list')
  }

  async function handleArchive(classId) {
    await removeClass(classId)
    setNotice('Class archived.')
  }

  if (isLoading) return <div className="route-state">Loading classes...</div>

  return (
    <section className="module-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">Professor</p>
          <h2>Class Management</h2>
          <p>Create classes, share class codes, assign syllabi, and manage active sections.</p>
        </div>
        {mode === 'list' ? <button className="primary-button" type="button" onClick={startCreate}>Create class</button> : null}
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-success">{notice}</p> : null}
      {mode === 'form' ? (
        <ClassForm
          classItem={selectedClass}
          syllabi={syllabi}
          onCancel={() => {
            setSelectedClass(null)
            setMode('list')
          }}
          onSave={handleSave}
        />
      ) : (
        <div className="class-grid">
          {classes.map((classItem) => (
            <ClassCard key={classItem.id} classItem={classItem} onArchive={handleArchive} onEdit={startEdit} />
          ))}
          {classes.length === 0 ? <div className="empty-state"><h3>No classes yet</h3><p>Create your first class to start inviting students.</p></div> : null}
        </div>
      )}
    </section>
  )
}
