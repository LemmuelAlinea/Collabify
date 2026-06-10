import { useEffect, useRef, useState } from 'react'

function formatFileSize(bytes) {
  if (!bytes) return 'Unknown size'
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`
}

function SyllabusItem({ onArchive, onDownload, onEdit, syllabus }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const hasLongDescription = (syllabus.description ?? '').length > 110
  const menuRef = useRef(null)

  function handleCardClick() {
    onDownload(syllabus.id)
  }

  function stopCardClick(event) {
    event.stopPropagation()
  }

  useEffect(() => {
    if (!isMenuOpen) return undefined

    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMenuOpen])

  return (
    <article className={`syllabus-item clickable-card ${!syllabus.isActive ? 'is-archived' : ''}`} role="button" tabIndex="0" onClick={handleCardClick} onKeyDown={(event) => event.key === 'Enter' ? handleCardClick() : null}>
      <div className="syllabus-title-row">
        <h3>{syllabus.title}</h3>
        <div className="syllabus-menu-wrap" ref={menuRef} onClick={stopCardClick}>
          <button className="icon-menu-button" type="button" onClick={() => setIsMenuOpen((current) => !current)} aria-label="Syllabus actions">
            ...
          </button>
          {isMenuOpen ? (
            <div className="syllabus-menu">
              <button type="button" onClick={() => onDownload(syllabus.id)}>Download</button>
              <button type="button" onClick={() => onEdit(syllabus)}>Edit</button>
              {syllabus.isActive ? <button type="button" onClick={() => onArchive(syllabus.id)}>Archive</button> : null}
            </div>
          ) : null}
        </div>
      </div>
      <span className="syllabus-status">{syllabus.isActive ? 'Active' : 'Archived'}</span>
      <p className={`syllabus-description ${isExpanded ? 'is-expanded' : ''}`}>{syllabus.description || 'No description provided.'}</p>
      {hasLongDescription ? (
        <button className="inline-button" type="button" onClick={(event) => {
          event.stopPropagation()
          setIsExpanded((current) => !current)
        }}>
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
      <dl className="compact-details">
        <div>
          <dt>Class</dt>
          <dd>{syllabus.class?.code} - {syllabus.class?.title}</dd>
        </div>
        <div>
          <dt>File</dt>
          <dd>{syllabus.fileName}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{formatFileSize(syllabus.fileSizeBytes)}</dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd>v{syllabus.version}</dd>
        </div>
      </dl>
    </article>
  )
}

export function SyllabusList({ onArchive, onDownload, onEdit, syllabi }) {
  if (syllabi.length === 0) return <div className="empty-state"><h3>No syllabi yet</h3><p>Upload a PDF or DOCX syllabus and assign it to one of your classes.</p></div>

  return (
    <div className="syllabus-list">
      {syllabi.map((syllabus) => (
        <SyllabusItem key={syllabus.id} syllabus={syllabus} onArchive={onArchive} onDownload={onDownload} onEdit={onEdit} />
      ))}
    </div>
  )
}
