import { useMemo, useState } from 'react'
import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'
import { useTasks } from '../../tasks/hooks/useTasks'
import { SubmissionCard } from '../components/SubmissionCard'
import { SubmissionUploadForm } from '../components/SubmissionUploadForm'
import { useSubmissions } from '../hooks/useSubmissions'

export function SubmissionsPage() {
  const { role } = useAuth()
  const [taskId, setTaskId] = useState('')
  const filters = useMemo(() => ({ taskId }), [taskId])
  const taskFilters = useMemo(() => ({}), [])
  const { tasks } = useTasks(taskFilters)
  const {
    error,
    isLoading,
    review,
    selectFinal,
    submissions,
    uploadVersion,
  } = useSubmissions(filters)
  const isStudent = role === USER_ROLES.STUDENT

  function flattenTasks(items) {
    return items.flatMap((task) => [task, ...flattenTasks(task.children ?? [])])
  }

  const taskOptions = flattenTasks(tasks)

  if (isLoading) return <div className="route-state">Loading submissions...</div>

  return (
    <section className="module-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">{role}</p>
          <h2>Submissions</h2>
          <p>{isStudent ? 'Upload unlimited versions and choose your final submission.' : 'Review every submitted version and final selection.'}</p>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <label className="form-field" htmlFor="submissionTaskFilter">
        <span>Task filter</span>
        <select id="submissionTaskFilter" value={taskId} onChange={(event) => setTaskId(event.target.value)}>
          <option value="">All visible tasks</option>
          {taskOptions.map((task) => (
            <option key={task.id} value={task.id}>{task.title}</option>
          ))}
        </select>
      </label>

      {isStudent ? <SubmissionUploadForm tasks={tasks} onUpload={uploadVersion} /> : null}

      <div className="project-grid">
        {submissions.map((submission) => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            onReview={review}
            onSelectFinal={selectFinal}
          />
        ))}
        {submissions.length === 0 ? <div className="empty-state"><h3>No submissions yet</h3><p>Submission versions will appear here.</p></div> : null}
      </div>
    </section>
  )
}
