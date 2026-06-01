import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'
import { ActivityTimeline } from '../../activity/components/ActivityTimeline'
import { useActivity } from '../../activity/hooks/useActivity'
import { useNotifications } from '../hooks/useNotifications'
import { resolveNotificationPath } from '../services/notificationNavigation'

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function NotificationCenterPage() {
  const { role } = useAuth()
  const [filters, setFilters] = useState({
    search: '',
    sort: 'newest',
    type: '',
    unread: '',
  })
  const activityFilters = useMemo(() => ({}), [])
  const { activity } = useActivity(activityFilters)
  const {
    error,
    isLoading,
    loadNotifications,
    markAllRead,
    markRead,
    notifications,
  } = useNotifications()

  function updateFilter(event) {
    const next = {
      ...filters,
      [event.target.name]: event.target.value,
    }
    setFilters(next)
    loadNotifications(next)
  }

  return (
    <section className="module-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">Realtime</p>
          <h2>Notification Center</h2>
        </div>
        <button className="secondary-button" type="button" onClick={markAllRead}>Mark all read</button>
      </div>
      <div className="notification-filters">
        <input name="search" value={filters.search} onChange={updateFilter} placeholder="Search" />
        <select name="type" value={filters.type} onChange={updateFilter}>
          <option value="">All types</option>
          <option value="class">Class</option>
          <option value="announcement">Announcement</option>
          <option value="project">Project</option>
          <option value="group">Group</option>
          <option value="task">Task</option>
          <option value="submission">Submission</option>
          <option value="reassignment">Reassignment</option>
          <option value="message">Message</option>
          <option value="analytics">Analytics</option>
          <option value="project_health">Project health</option>
          <option value="contribution">Contribution</option>
        </select>
        <select name="unread" value={filters.unread} onChange={updateFilter}>
          <option value="">All states</option>
          <option value="true">Unread</option>
          <option value="false">Read</option>
        </select>
        <select name="sort" value={filters.sort} onChange={updateFilter}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <div className="route-state">Loading notifications...</div> : null}
      <div className="notification-center-grid">
        <div className="notification-list">
          {notifications.map((notification) => (
            <article className={`notification-card ${notification.isRead ? '' : 'is-unread'}`} key={notification.id}>
              <div>
                <span>{notification.type}</span>
                <span>{notification.priority}</span>
              </div>
              <h3>{notification.title}</h3>
              {notification.body ? <p>{notification.body}</p> : null}
              <small>{formatDate(notification.createdAt)}</small>
              <div className="card-actions">
                <Link className="secondary-button" to={resolveNotificationPath(notification, role)}>Open</Link>
                {!notification.isRead ? <button className="primary-button" type="button" onClick={() => markRead([notification.id])}>Mark read</button> : null}
              </div>
            </article>
          ))}
          {notifications.length === 0 ? <div className="empty-state"><h3>No notifications</h3><p>Notification history will appear here.</p></div> : null}
        </div>
        <ActivityTimeline activity={activity} />
      </div>
    </section>
  )
}
