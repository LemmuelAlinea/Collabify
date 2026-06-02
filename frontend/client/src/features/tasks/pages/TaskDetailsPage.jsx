import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../../auth/hooks/useAuth'
import { USER_ROLES } from '../../auth/constants/roles'
import { TaskDetailsContent } from '../components/TaskDetailsContent'
import { useTaskDetails } from '../hooks/useTaskDetails'

export function TaskDetailsPage() {
  const navigate = useNavigate()
  const { taskId } = useParams()
  const { role, user } = useAuth()
  const actions = useTaskDetails(taskId)

  if (actions.isLoading) return <div className="route-state">Loading task...</div>
  if (actions.error) return <div className="route-state">{actions.error}</div>
  if (!actions.details?.task) return <div className="route-state">Task not found</div>

  const isProfessor = role === USER_ROLES.PROFESSOR
  const backPath = isProfessor ? '/professor/tasks' : '/student/tasks'
  const task = actions.details.task

  return (
    <section className="module-page task-detail-page">
      <div className="task-detail-breadcrumb">
        <button className="secondary-button" type="button" onClick={() => navigate(backPath)}>
          <ArrowLeft size={16} aria-hidden="true" />
          Tasks
        </button>
        <span>{task.project?.title ?? 'Project'}</span>
        <span>{task.group?.name ?? 'Group'}</span>
      </div>

      <TaskDetailsContent actions={actions} backPath={backPath} details={actions.details} role={role} user={user} />
    </section>
  )
}
