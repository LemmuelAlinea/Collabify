import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'
import { NotificationDropdown } from './NotificationDropdown'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const {
    markAllRead,
    markRead,
    notifications,
    unreadCount,
  } = useNotifications()

  return (
    <div className="notification-bell-wrap">
      <button className="notification-bell" type="button" onClick={() => setIsOpen((current) => !current)}>
        <Bell aria-hidden="true" />
        <span>Notifications</span>
        {unreadCount > 0 ? <strong>{unreadCount}</strong> : null}
      </button>
      {isOpen ? (
        <NotificationDropdown
          notifications={notifications}
          onMarkAllRead={markAllRead}
          onMarkRead={markRead}
        />
      ) : null}
    </div>
  )
}
