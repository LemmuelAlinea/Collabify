import { useState } from 'react'
import { CurriculumForm } from '../components/CurriculumForm'
import { CurriculumList } from '../components/CurriculumList'
import { useCurricula } from '../hooks/useCurricula'

export function CurriculumManagementPage() {
  const {
    archive,
    curricula,
    error,
    isLoading,
    openDownload,
    saveNewCurriculum,
  } = useCurricula()
  const [mode, setMode] = useState('list')
  const [notice, setNotice] = useState('')

  async function handleSave(payload) {
    await saveNewCurriculum(payload)
    setNotice('Curriculum uploaded.')
    setMode('list')
  }

  async function handleArchive(id) {
    await archive(id)
    setNotice('Curriculum archived.')
  }

  if (isLoading) return <div className="route-state">Loading curricula...</div>

  return (
    <section className="module-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">Professor only</p>
          <h2>Curriculum Management</h2>
          <p>Upload reusable curricula and align classes, syllabi, and project validation.</p>
        </div>
        {mode === 'list' ? <button className="primary-button" type="button" onClick={() => { setNotice(''); setMode('create') }}>Upload curriculum</button> : null}
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-success">{notice}</p> : null}

      {mode === 'list' ? (
        <CurriculumList curricula={curricula} onArchive={handleArchive} onDownload={openDownload} />
      ) : (
        <CurriculumForm onCancel={() => setMode('list')} onSave={handleSave} />
      )}
    </section>
  )
}
