import { useState } from 'react'
import { StudentPageSkeleton } from '../../../components/skeletons/StudentPageSkeleton'
import { ClassCard } from '../components/ClassCard'
import { ClassForm } from '../components/ClassForm'
import { useClasses } from '../hooks/useClasses'
import { useCurricula } from '../../curriculum/hooks/useCurricula'
import { useSyllabi } from '../../syllabus/hooks/useSyllabi'

export function ProfessorClassesPage() {
  const { classes, error, isLoading, removeClass, saveClass, saveNewClass } = useClasses()
  const { curricula } = useCurricula()
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
    if (selectedClass) {
      const patchPayload = Object.fromEntries(
        Object.entries(payload).filter(([key, value]) => value !== selectedClass[key]),
      )

      if (Object.keys(patchPayload).length > 0) {
        await saveClass(selectedClass.id, patchPayload)
      }

      setNotice(
        Object.keys(patchPayload).length > 0
          ? 'Class updated.'
          : 'No changes to save.',
      )
    } else {
      await saveNewClass(payload)
      setNotice('Class created.')
    }

    setSelectedClass(null)
    setMode('list')
  }

  async function handleArchive(classId) {
    await removeClass(classId)
    setNotice('Class archived.')
  }

  function closeModal() {
    setSelectedClass(null)
    setMode('list')
  }

  if (isLoading) return <StudentPageSkeleton variant="classes" />

  return (
    <section className="module-page classes-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">Professor</p>
          <h2>Class Management</h2>
          <p>Create classes, share class codes, assign syllabi, and manage active sections.</p>
        </div>
        <button className="primary-button" type="button" onClick={startCreate}>Create class</button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-success">{notice}</p> : null}
      <div className="class-grid">
        {classes.map((classItem) => (
          <ClassCard key={classItem.id} classItem={classItem} onArchive={handleArchive} onEdit={startEdit} />
        ))}
        {classes.length === 0 ? <div className="empty-state"><h3>No classes yet</h3><p>Create your first class to start inviting students.</p></div> : null}
      </div>
      {mode === 'form' ? (
        <div className="class-modal-backdrop" role="presentation" onMouseDown={closeModal}>
          <div className="class-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="class-modal-header">
              <div>
                <p className="eyebrow">Classes</p>
                <h3>{selectedClass ? 'Edit class' : 'Create class'}</h3>
              </div>
              <button className="secondary-button" type="button" onClick={closeModal}>Close</button>
            </div>
            <ClassForm
              classItem={selectedClass}
              curricula={curricula}
              syllabi={syllabi}
              onCancel={closeModal}
              onSave={handleSave}
            />
          </div>
        </div>
      ) : null}
    </section>
  )
}
