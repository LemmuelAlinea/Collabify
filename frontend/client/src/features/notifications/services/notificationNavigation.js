import { USER_ROLES } from '../../auth/constants/roles'

export function resolveNotificationPath(notification, role) {
  const base = role === USER_ROLES.PROFESSOR ? '/professor' : '/student'

  if (notification.entityType === 'class' || notification.classId) return `${base}/classes${notification.classId ? `/${notification.classId}` : ''}`
  if (notification.entityType === 'project' || notification.projectId) return `${base}/projects${notification.projectId ? `/${notification.projectId}` : ''}`
  if (notification.entityType === 'message') return `${base}/messages`
  if (notification.entityType === 'task' || notification.taskId) return `${base}/tasks`
  if (notification.entityType === 'submission') return `${base}/submissions`
  if (notification.entityType === 'reassignment') return `${base}/reassignments`
  if (notification.entityType === 'group' || notification.groupId) return `${base}/groups`

  return role === USER_ROLES.PROFESSOR ? '/professor/notifications' : '/notifications'
}
