import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'

export function ClassCard({ classItem, onArchive, onEdit }) {
  const { role } = useAuth()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const detailPath = role === 'professor'
    ? `/professor/classes/${classItem.id}`
    : `/student/classes/${classItem.id}`

  function stopCardClick(event) {
    event.stopPropagation()
  }

  return (
    <article className="class-card clickable-card" role="button" tabIndex="0" onClick={() => navigate(detailPath)} onKeyDown={(event) => event.key === 'Enter' ? navigate(detailPath) : null}>
      <div className="syllabus-title-row">
        <h3>{classItem.name}</h3>
        <div className="syllabus-menu-wrap" onClick={stopCardClick}>
          <button className="icon-menu-button" type="button" onClick={() => setIsMenuOpen((current) => !current)} aria-label="Class actions">
            ...
          </button>
          {isMenuOpen ? (
            <div className="syllabus-menu">
              <Link to={detailPath}>View</Link>
              {role === 'professor' ? (
                <>
                  <button type="button" onClick={() => onEdit(classItem)}>Edit</button>
                  <button type="button" onClick={() => onArchive(classItem.id)}>Archive</button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <span className="syllabus-status">{classItem.subject}</span>
      <p className="class-card-description">{classItem.section} - Year {classItem.yearLevel} - {classItem.semester}</p>
      <dl className="compact-details">
        <div>
          <dt>Class code</dt>
          <dd>{classItem.classCode}</dd>
        </div>
        <div>
          <dt>School year</dt>
          <dd>{classItem.schoolYear}</dd>
        </div>
      </dl>
    </article>
  )
}
