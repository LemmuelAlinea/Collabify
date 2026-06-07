import { useState } from 'react'
import { ClassCard } from '../components/ClassCard'
import { JoinClassForm } from '../components/JoinClassForm'
import { useClasses } from '../hooks/useClasses'

export function StudentClassesPage() {
  const { classes, error, isLoading, join } = useClasses()
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)

  if (isLoading) return <div className="route-state">Loading classes...</div>

  return (
    <section className="module-page classes-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">Student</p>
          <h2>My Classes</h2>
          <p>Join a class with its code and view your active BSIT class spaces.</p>
        </div>
        <button className="primary-button" type="button" onClick={() => setIsJoinModalOpen(true)}>
          Join class
        </button>
      </div>
      {isJoinModalOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsJoinModalOpen(false)}>
          <div className="modal-panel join-class-modal" role="dialog" aria-modal="true" aria-label="Join class" onMouseDown={(event) => event.stopPropagation()}>
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Class access</p>
                <h3>Join class</h3>
              </div>
              <button className="ghost-button" type="button" onClick={() => setIsJoinModalOpen(false)}>Close</button>
            </div>
            <JoinClassForm onJoin={join} onJoined={() => setIsJoinModalOpen(false)} />
          </div>
        </div>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
      <div className="class-grid">
        {classes.map((classItem) => (
          <ClassCard key={classItem.id} classItem={classItem} />
        ))}
        {classes.length === 0 ? <div className="empty-state"><h3>No joined classes</h3><p>Enter a class code from your professor to join.</p></div> : null}
      </div>
    </section>
  )
}
