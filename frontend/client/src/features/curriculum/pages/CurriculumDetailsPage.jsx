import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CurriculumForm } from '../components/CurriculumForm'
import { getCurriculum, getCurriculumDownloadUrl, updateCurriculum } from '../services/curriculumService'

function DetailBlock({ label, children }) {
  return (
    <section className="analytics-panel curriculum-detail-block">
      <h3>{label}</h3>
      <p>{children || 'Not provided.'}</p>
    </section>
  )
}

export function CurriculumDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [curriculum, setCurriculum] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let ignore = false
    async function load() {
      setIsLoading(true)
      setError('')
      try {
        const nextCurriculum = await getCurriculum(id)
        if (!ignore) setCurriculum(nextCurriculum)
      } catch (loadError) {
        if (!ignore) setError(loadError.message)
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [id])

  async function handleSave(payload) {
    const nextCurriculum = await updateCurriculum(id, payload)
    setCurriculum(nextCurriculum)
    setNotice('Curriculum updated.')
    setIsEditing(false)
  }

  async function handleDownload() {
    const url = await getCurriculumDownloadUrl(id)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (isLoading) return <div className="route-state">Loading curriculum...</div>
  if (error) return <div className="route-state">{error}</div>
  if (!curriculum) return <div className="route-state">Curriculum not found.</div>

  return (
    <section className="module-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">Curriculum</p>
          <h2>{curriculum.title}</h2>
          <p>{curriculum.academicYear || 'No academic year set'}</p>
        </div>
        <div className="button-row">
          {curriculum.storagePath ? <button className="secondary-button" type="button" onClick={handleDownload}>Download</button> : null}
          <button className="secondary-button" type="button" onClick={() => navigate('/professor/curriculum')}>Back</button>
          <button className="primary-button" type="button" onClick={() => setIsEditing((current) => !current)}>{isEditing ? 'Close edit' : 'Edit curriculum'}</button>
        </div>
      </div>

      {notice ? <p className="form-success">{notice}</p> : null}

      {isEditing ? (
        <CurriculumForm curriculum={curriculum} onCancel={() => setIsEditing(false)} onSave={handleSave} />
      ) : (
        <>
          <div className="detail-grid">
            <DetailBlock label="Description">{curriculum.description}</DetailBlock>
            <DetailBlock label="Program objectives">{curriculum.programObjectives}</DetailBlock>
            <DetailBlock label="Program outcomes">{curriculum.programOutcomes}</DetailBlock>
            <DetailBlock label="Curriculum components">{curriculum.curriculumComponents}</DetailBlock>
          </div>
          <section className="analytics-panel">
            <div className="syllabus-title-row">
              <h3>Program of study</h3>
              <span className="syllabus-status">{curriculum.programStudies.length} items</span>
            </div>
            {curriculum.programStudies.length ? (
              <ol className="program-study-list readonly">
                {curriculum.programStudies.map((item) => <li key={item.id}><span>{item.content}</span></li>)}
              </ol>
            ) : <p className="muted-text">No program of study items yet.</p>}
          </section>
        </>
      )}
    </section>
  )
}
