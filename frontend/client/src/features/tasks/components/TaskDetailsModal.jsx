import { useAuth } from '../../auth/hooks/useAuth'
import { TaskDetailsContent } from './TaskDetailsContent'
import { useTaskDetails } from '../hooks/useTaskDetails'

export function TaskDetailsModal({ forceReadOnly = false, onClose, taskId }) {
  const { role, user } = useAuth()
  const actions = useTaskDetails(taskId)

  if (!taskId) return null

  return (
    <div className="task-detail-modal-backdrop" role="dialog" aria-modal="true">
      <div className="task-detail-modal-panel">
        {actions.isLoading ? <div className="route-state">Loading task...</div> : null}
        {actions.error ? <div className="route-state">{actions.error}</div> : null}
        {actions.details?.task ? (
          <TaskDetailsContent
            actions={actions}
            backPath="/student/tasks"
            details={actions.details}
            forceReadOnly={forceReadOnly}
            isModal
            onClose={onClose}
            role={role}
            user={user}
          />
        ) : null}
      </div>
    </div>
  )
}
