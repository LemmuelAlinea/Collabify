import { useState } from 'react'
import { SyllabusForm } from '../components/SyllabusForm'
import { SyllabusList } from '../components/SyllabusList'
import { useSyllabi } from '../hooks/useSyllabi'

export function SyllabusManagementPage() {
  const {
    archive,
    classes,
    error,
    isLoading,
    openDownload,
    saveNewSyllabus,
    saveSyllabus,
    syllabi,
  } = useSyllabi()
  const [mode, setMode] = useState('list')
  const [selectedSyllabus, setSelectedSyllabus] = useState(null)
  const [notice, setNotice] = useState('')

  function startCreate() {
    setSelectedSyllabus(null)
    setNotice('')
    setMode('create')
  }

  function startEdit(syllabus) {
    setSelectedSyllabus(syllabus)
    setNotice('')
    setMode('edit')
  }

  async function handleSave(payload) {
    if (selectedSyllabus) {
      const patchPayload = Object.fromEntries(
        Object.entries(payload).filter(([key, value]) => {
          const previous = selectedSyllabus[key]
          return value !== previous
        }),
      )
      if (Object.keys(patchPayload).length > 0) {
        await saveSyllabus(selectedSyllabus.id, patchPayload)
        setNotice('Syllabus updated.')
      } else {
        setNotice('No changes to save.')
      }
    } else {
      await saveNewSyllabus(payload)
      setNotice('Syllabus uploaded.')
    }

    setSelectedSyllabus(null)
    setMode('list')
  }

  async function handleArchive(id) {
    await archive(id)
    setNotice('Syllabus archived.')
  }

  if (isLoading) {
    return <div className="route-state">Loading syllabi...</div>
  }

  return (
    <section className="module-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">Professor only</p>
          <h2>Syllabus Management</h2>
          <p>Upload PDF or DOCX syllabi and assign them to your classes.</p>
        </div>
        {mode === 'list' ? (
          <button className="primary-button" type="button" onClick={startCreate}>
            Upload syllabus
          </button>
        ) : null}
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-success">{notice}</p> : null}

      {classes.length === 0 ? (
        <div className="empty-state">
          <h3>No classes available</h3>
          <p>Create or import professor classes before assigning a syllabus.</p>
        </div>
      ) : null}

      {mode === 'list' ? (
        <SyllabusList
          syllabi={syllabi}
          onArchive={handleArchive}
          onDownload={openDownload}
          onEdit={startEdit}
        />
      ) : (
        <SyllabusForm
          classes={classes}
          syllabus={selectedSyllabus}
          onCancel={() => {
            setMode('list')
            setSelectedSyllabus(null)
          }}
          onSave={handleSave}
        />
      )}
    </section>
  )
}
