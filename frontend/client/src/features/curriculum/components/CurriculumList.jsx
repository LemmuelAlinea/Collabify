import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function formatFileSize(bytes) {
  if (!bytes) return 'No file'
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`
}

function CurriculumItem({ curriculum, onArchive, onDownload }) {
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  function openDetails() {
    navigate(`/professor/curriculum/${curriculum.id}`)
  }

  return (
    <article className={`syllabus-item clickable-card ${!curriculum.isActive ? 'is-archived' : ''}`} role="button" tabIndex="0" onClick={openDetails} onKeyDown={(event) => event.key === 'Enter' ? openDetails() : null}>
      <div className="syllabus-title-row">
        <h3>{curriculum.title}</h3>
        <div className="syllabus-menu-wrap" onClick={(event) => event.stopPropagation()}>
          <button className="icon-menu-button" type="button" onClick={() => setIsMenuOpen((current) => !current)} aria-label="Curriculum actions">...</button>
          {isMenuOpen ? (
            <div className="syllabus-menu">
              <button type="button" onClick={openDetails}>Details</button>
              {curriculum.storagePath ? <button type="button" onClick={() => onDownload(curriculum.id)}>Download</button> : null}
              {curriculum.isActive ? <button type="button" onClick={() => onArchive(curriculum.id)}>Archive</button> : null}
            </div>
          ) : null}
        </div>
      </div>
      <span className="syllabus-status">{curriculum.isActive ? 'Active' : 'Archived'}</span>
      <p className="syllabus-description">{curriculum.description || 'No description provided.'}</p>
      <dl className="compact-details">
        <div>
          <dt>Academic year</dt>
          <dd>{curriculum.academicYear || 'Not set'}</dd>
        </div>
        <div>
          <dt>Program study</dt>
          <dd>{curriculum.programStudies.length} items</dd>
        </div>
        <div>
          <dt>File</dt>
          <dd>{curriculum.fileName || 'No file'}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{formatFileSize(curriculum.fileSizeBytes)}</dd>
        </div>
      </dl>
    </article>
  )
}

export function CurriculumList({ curricula, onArchive, onDownload }) {
  if (curricula.length === 0) return <div className="empty-state"><h3>No curricula yet</h3><p>Upload a curriculum and assign it to classes for project validation.</p></div>

  return (
    <div className="syllabus-list">
      {curricula.map((curriculum) => (
        <CurriculumItem key={curriculum.id} curriculum={curriculum} onArchive={onArchive} onDownload={onDownload} />
      ))}
    </div>
  )
}
