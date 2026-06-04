import { useEffect, useState } from 'react'
import { Eye, Pencil, Trash2 } from 'lucide-react'
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

function studyTitle(item, index) {
  return item?.title || item?.content?.slice(0, 120) || `Program of Study ${index + 1}`
}

function formatDate(value) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function CurriculumDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [curriculum, setCurriculum] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [studyModal, setStudyModal] = useState({ mode: '', item: null, index: null, title: '', content: '' })

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

  async function saveStudy() {
    const title = studyModal.title.trim()
    const content = studyModal.content.trim()
    if (!title || !content) return

    const programStudies = curriculum.programStudies.map((item, index) => (
      index === studyModal.index ? { ...item, title, content } : item
    ))
    const nextCurriculum = await updateCurriculum(id, { programStudies })
    setCurriculum(nextCurriculum)
    setStudyModal({ mode: '', item: null, index: null, title: '', content: '' })
    setNotice('Program of study updated.')
  }

  async function deleteStudy(index) {
    const programStudies = curriculum.programStudies.filter((_, itemIndex) => itemIndex !== index)
    const nextCurriculum = await updateCurriculum(id, { programStudies })
    setCurriculum(nextCurriculum)
    setNotice('Program of study deleted.')
  }

  if (isLoading) return <div className="route-state">Loading curriculum...</div>
  if (error) return <div className="route-state">{error}</div>
  if (!curriculum) return <div className="route-state">Curriculum not found.</div>

  return (
    <section className="module-page curriculum-details-page">
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
          <section className="analytics-panel program-study-section">
            <div className="syllabus-title-row">
              <h3>Program of study</h3>
              <span className="syllabus-status">{curriculum.programStudies.length} items</span>
            </div>
            {curriculum.programStudies.length ? (
              <div className="program-study-table-wrap">
                <table className="program-study-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Created at</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {curriculum.programStudies.map((item, index) => (
                      <tr key={item.id ?? `${item.content}-${index}`}>
                        <td>{studyTitle(item, index)}</td>
                        <td>{formatDate(item.createdAt)}</td>
                        <td>
                          <div className="program-study-actions">
                            <button
                              type="button"
                              className="icon-button"
                              aria-label="View program of study"
                              onClick={() => setStudyModal({ mode: 'view', item, index, title: studyTitle(item, index), content: item.content })}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              aria-label="Edit program of study"
                              onClick={() => setStudyModal({ mode: 'edit', item, index, title: studyTitle(item, index), content: item.content })}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-button danger-icon"
                              aria-label="Delete program of study"
                              onClick={() => deleteStudy(index)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="muted-text">No program of study items yet.</p>}
          </section>

          {studyModal.mode ? (
            <div className="modal-backdrop program-study-modal-backdrop">
              <div className="dialog-card compact-dialog program-study-modal-card">
                <div className="syllabus-title-row">
                  <h3>{studyModal.mode === 'edit' ? 'Edit Program of Study' : 'Program of Study Details'}</h3>
                  <button className="secondary-button" type="button" onClick={() => setStudyModal({ mode: '', item: null, index: null, title: '', content: '' })}>Close</button>
                </div>
                {studyModal.mode === 'edit' ? (
                  <>
                    <label className="form-field" htmlFor="studyTitle">
                      <span>Program of study title</span>
                      <input id="studyTitle" value={studyModal.title} onChange={(event) => setStudyModal((current) => ({ ...current, title: event.target.value }))} />
                    </label>
                    <label className="form-field" htmlFor="studyContent">
                      <span>Content</span>
                      <textarea id="studyContent" rows="7" value={studyModal.content} onChange={(event) => setStudyModal((current) => ({ ...current, content: event.target.value }))} />
                    </label>
                    <button className="primary-button" type="button" onClick={saveStudy}>Save</button>
                  </>
                ) : (
                  <div className="program-study-detail">
                    <h4>{studyModal.title}</h4>
                    <p>{studyModal.content}</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
