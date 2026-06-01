import { ClassCard } from '../components/ClassCard'
import { JoinClassForm } from '../components/JoinClassForm'
import { useClasses } from '../hooks/useClasses'

export function StudentClassesPage() {
  const { classes, error, isLoading, join } = useClasses()

  if (isLoading) return <div className="route-state">Loading classes...</div>

  return (
    <section className="module-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">Student</p>
          <h2>My Classes</h2>
          <p>Join a class with its code and view your active BSIT class spaces.</p>
        </div>
      </div>
      <JoinClassForm onJoin={join} />
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
