import { useMemo, useState } from 'react'
import { StudentPageSkeleton } from '../../../components/skeletons/StudentPageSkeleton'
import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'
import { useGroups } from '../../groups/hooks/useGroups'
import { useTasks } from '../../tasks/hooks/useTasks'
import { ReassignmentList } from '../components/ReassignmentList'
import { ReassignmentRequestForm } from '../components/ReassignmentRequestForm'
import { useReassignments } from '../hooks/useReassignments'

export function ReassignmentsPage() {
  const { profile, role, user } = useAuth()
  const taskFilters = useMemo(() => ({}), [])
  const { error: groupError, groups, isLoading: isLoadingGroups } = useGroups()
  const { error: taskError, tasks, isLoading: isLoadingTasks } = useTasks(taskFilters)
  const {
    analyze,
    error,
    isLoading,
    reassignments,
    archive,
    request,
    review,
  } = useReassignments()
  const isStudent = role === USER_ROLES.STUDENT
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const currentAssigneeName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() || profile?.fullName || profile?.displayName || user?.email || 'Current assignee'

  async function submitRequest(payload) {
    const result = await request(payload)
    setIsRequestModalOpen(false)
    return result
  }

  if (isLoading || isLoadingTasks || isLoadingGroups) return <StudentPageSkeleton variant="reassignments" />

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
      {isStudent ? (
        <>
          <div className="page-actions">
            <button className="primary-button" type="button" onClick={() => setIsRequestModalOpen(true)}>
              Request reassignment
            </button>
          </div>
          {isRequestModalOpen ? (
            <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsRequestModalOpen(false)}>
              <div className="modal-panel reassignment-request-modal" role="dialog" aria-modal="true" aria-label="Request reassignment" onMouseDown={(event) => event.stopPropagation()}>
                <div className="section-heading-row">
                  <div>
                    <p className="eyebrow">Task reassignment</p>
                    <h3>Request reassignment</h3>
                  </div>
                  <button className="ghost-button" type="button" onClick={() => setIsRequestModalOpen(false)}>Close</button>
                </div>
                <ReassignmentRequestForm currentAssigneeName={currentAssigneeName} groups={groups} tasks={tasks} userId={user?.id} onSubmit={submitRequest} />
              </div>
            </div>
          ) : null}
        </>
      ) : null}
      <ReassignmentList reassignments={reassignments} onAnalyze={analyze} onArchive={archive} onReview={review} />
    </section>
  )
}
