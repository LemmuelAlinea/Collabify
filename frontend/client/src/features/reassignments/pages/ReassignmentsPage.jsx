import { useMemo } from 'react'
import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'
import { useGroups } from '../../groups/hooks/useGroups'
import { useTasks } from '../../tasks/hooks/useTasks'
import { ReassignmentList } from '../components/ReassignmentList'
import { ReassignmentRequestForm } from '../components/ReassignmentRequestForm'
import { useReassignments } from '../hooks/useReassignments'

export function ReassignmentsPage() {
  const { role } = useAuth()
  const taskFilters = useMemo(() => ({}), [])
  const { error: groupError, groups, isLoading: isLoadingGroups } = useGroups()
  const { error: taskError, tasks, isLoading: isLoadingTasks } = useTasks(taskFilters)
  const {
    error,
    isLoading,
    reassignments,
    request,
    review,
  } = useReassignments()
  const isStudent = role === USER_ROLES.STUDENT

  if (isLoading || isLoadingTasks || isLoadingGroups) return <div className="route-state">Loading reassignments...</div>

  return (
    <section className="module-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">{role}</p>
          <h2>Task Reassignment</h2>
          <p>{isStudent ? 'Request task reassignment and choose how contribution scores should be handled.' : 'Approve or reject reassignment requests and control score transfer.'}</p>
        </div>
      </div>
      {error || taskError || groupError ? <p className="form-error">{error || taskError || groupError}</p> : null}
      {isStudent ? <ReassignmentRequestForm groups={groups} tasks={tasks} onSubmit={request} /> : null}
      <ReassignmentList reassignments={reassignments} onReview={review} />
    </section>
  )
}
