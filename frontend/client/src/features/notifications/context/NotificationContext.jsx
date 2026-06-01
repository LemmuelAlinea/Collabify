import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase/client'
import { useAuth } from '../../auth/hooks/useAuth'
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationsRead,
} from '../services/notificationService'

export const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const loadNotifications = useCallback(async (filters = {}) => {
    if (!user?.id) return []
    setIsLoading(true)
    setError('')

    try {
      const [items, count] = await Promise.all([
        getNotifications(filters),
        getUnreadNotificationCount(),
      ])
      setNotifications(items)
      setUnreadCount(count)
      return items
    } catch (loadError) {
      setError(loadError.message)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  useEffect(() => {
    if (!user?.id) return undefined

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => loadNotifications())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadNotifications, user?.id])

  const markRead = useCallback(async (ids) => {
    if (!ids.length) return []
    const updated = await markNotificationsRead(ids)
    setNotifications((current) => current.map((item) => {
      const next = updated.find((notification) => notification.id === item.id)
      return next ?? item
    }))
    setUnreadCount((current) => Math.max(0, current - updated.length))
    return updated
  }, [])

  const markAllRead = useCallback(async () => {
    const updated = await markAllNotificationsRead()
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true, readAt: item.readAt ?? new Date().toISOString() })))
    setUnreadCount(0)
    return updated
  }, [])

  const value = useMemo(() => ({
    error,
    isLoading,
    loadNotifications,
    markAllRead,
    markRead,
    notifications,
    unreadCount,
  }), [error, isLoading, loadNotifications, markAllRead, markRead, notifications, unreadCount])

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}
