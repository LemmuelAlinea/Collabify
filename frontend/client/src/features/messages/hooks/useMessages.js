import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase/client'
import {
  deleteMessage,
  getMessages,
  sendMessage,
  setMessagePin,
} from '../services/messageService'

function upsertMessage(messages, message) {
  const exists = messages.some((item) => item.id === message.id)
  const next = exists
    ? messages.map((item) => item.id === message.id ? message : item)
    : [...messages, message]

  return next.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}

export function useMessages(scope, chatId) {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState([])

  const loadMessages = useCallback(async () => {
    if (!scope || !chatId) {
      setMessages([])
      return
    }

    setIsLoading(true)
    setError('')

    try {
      setMessages(await getMessages(scope, chatId))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [chatId, scope])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (!scope || !chatId) return undefined

    const messageListener = {
      event: '*',
      schema: 'public',
      table: 'messages',
    }
    if (scope === 'class') messageListener.filter = `class_chat_id=eq.${chatId}`
    if (scope === 'group') messageListener.filter = `group_chat_id=eq.${chatId}`

    let reloadTimer
    const scheduleLoad = () => {
      window.clearTimeout(reloadTimer)
      reloadTimer = window.setTimeout(loadMessages, 120)
    }

    const channel = supabase
      .channel(`chat:${scope}:${chatId}`)
      .on('postgres_changes', messageListener, scheduleLoad)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attachments',
      }, scheduleLoad)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pinned_messages',
      }, scheduleLoad)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_deletions',
      }, scheduleLoad)
      .subscribe()

    return () => {
      window.clearTimeout(reloadTimer)
      supabase.removeChannel(channel)
    }
  }, [chatId, loadMessages, scope])

  const send = useCallback(async (payload) => {
    const message = await sendMessage(payload)
    setMessages((current) => upsertMessage(current, message))
    return message
  }, [])

  const remove = useCallback(async (id, mode) => {
    const message = await deleteMessage(id, mode)
    setMessages((current) => (
      mode === 'me'
        ? current.filter((item) => item.id !== id)
        : current.map((item) => item.id === id ? message : item)
    ))
    return message
  }, [])

  const pin = useCallback(async (id, isPinned) => {
    const message = await setMessagePin(id, isPinned)
    await loadMessages()
    return message
  }, [loadMessages])

  return {
    error,
    isLoading,
    loadMessages,
    messages,
    pin,
    remove,
    send,
  }
}
