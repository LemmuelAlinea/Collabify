import { Link } from 'react-router-dom'
import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'
import { resolveNotificationPath } from '../services/notificationNavigation'

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

export function NotificationDropdown({ dropdownRef, notifications, onMarkAllRead, onMarkRead, style }) {
  const { role } = useAuth()
  const preview = notifications.slice(0, 6)
  const centerPath = role === USER_ROLES.PROFESSOR ? '/professor/notifications' : '/notifications'

  return (
    <div className="notification-dropdown" ref={dropdownRef} style={style}>
      <div className="notification-dropdown-header">
        <strong>Notifications</strong>
        <button type="button" onClick={onMarkAllRead}>Mark all read</button>
      </div>
      {preview.map((notification) => (
        <Link
          className={`notification-preview ${notification.isRead ? '' : 'is-unread'}`}
          key={notification.id}
          to={resolveNotificationPath(notification, role)}
          onClick={() => onMarkRead([notification.id])}
        >
          <span>{notification.priority}</span>
          <strong>{notification.title}</strong>
          {notification.body ? <p>{notification.body}</p> : null}
          <small>{formatTime(notification.createdAt)}</small>
        </Link>
      ))}
      {preview.length === 0 ? <p className="muted-text">No notifications.</p> : null}
      <Link className="notification-center-link" to={centerPath}>View all</Link>
    </div>
  )
}
