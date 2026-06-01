import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase/client'
import {
  createAnnouncement,
  deleteAnnouncement,
  getClassAnnouncements,
  updateAnnouncement,
} from '../services/announcementService'

function normalizeRealtimeAnnouncement(row) {
  return {
    id: row.id,
    classId: row.class_id,
    authorId: row.author_id,
    title: row.title,
    body: row.body,
    isPinned: row.is_pinned,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function sortAnnouncements(items) {
  return [...items].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    return new Date(b.publishedAt) - new Date(a.publishedAt)
  })
}

export function useAnnouncements(classId, initialAnnouncements = []) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const loadAnnouncements = useCallback(async () => {
    if (!classId) return
    setIsLoading(true)
    setError('')

    try {
      setAnnouncements(await getClassAnnouncements(classId))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [classId])

  useEffect(() => {
    setAnnouncements(initialAnnouncements)
  }, [initialAnnouncements])

  useEffect(() => {
    loadAnnouncements()
  }, [loadAnnouncements])

  useEffect(() => {
    if (!classId) return undefined

    const channel = supabase
      .channel(`class:${classId}:announcements`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements',
          filter: `class_id=eq.${classId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const announcement = normalizeRealtimeAnnouncement(payload.new)
            setAnnouncements((current) => sortAnnouncements([
              announcement,
              ...current.filter((item) => item.id !== announcement.id),
            ]))
          }

          if (payload.eventType === 'UPDATE') {
            const announcement = normalizeRealtimeAnnouncement(payload.new)
            setAnnouncements((current) => sortAnnouncements(
              current.map((item) => item.id === announcement.id ? announcement : item),
            ))
          }

          if (payload.eventType === 'DELETE') {
            setAnnouncements((current) => current.filter((item) => item.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [classId])

  const saveNewAnnouncement = useCallback(async (payload) => {
    const announcement = await createAnnouncement(payload)
    setAnnouncements((current) => sortAnnouncements([
      announcement,
      ...current.filter((item) => item.id !== announcement.id),
    ]))
    return announcement
  }, [])

  const saveAnnouncement = useCallback(async (id, payload) => {
    const announcement = await updateAnnouncement(id, payload)
    setAnnouncements((current) => sortAnnouncements(
      current.map((item) => item.id === id ? announcement : item),
    ))
    return announcement
  }, [])

  const removeAnnouncement = useCallback(async (id) => {
    await deleteAnnouncement(id)
    setAnnouncements((current) => current.filter((item) => item.id !== id))
  }, [])

  return {
    announcements,
    error,
    isLoading,
    loadAnnouncements,
    removeAnnouncement,
    saveAnnouncement,
    saveNewAnnouncement,
  }
}
