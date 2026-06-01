import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function isImage(mimeType) {
  return mimeType.startsWith('image/')
}

export function MessageList({ messages, onDelete, onPin }) {
  const { user } = useAuth()
  const [openMenuId, setOpenMenuId] = useState('')
  const threadRef = useRef(null)
  const pinnedMessages = useMemo(() => messages.filter((message) => message.isPinned), [messages])

  useEffect(() => {
    const thread = threadRef.current
    if (!thread) return
    thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' })
  }, [messages])

  return (
    <div className="chat-thread" ref={threadRef}>
      {pinnedMessages.length > 0 ? (
        <div className="pinned-strip">
          {pinnedMessages.map((message) => (
            <button key={message.id} type="button" onClick={() => onPin(message.id, false)}>
              {message.body || message.attachments[0]?.fileName || 'Pinned message'}
            </button>
          ))}
        </div>
      ) : null}
      {messages.map((message) => {
        const mine = message.senderId === user?.id

        return (
          <article className={`chat-message ${mine ? 'is-mine' : ''}`} key={message.id}>
            <div className="chat-message-meta">
              <strong>{mine ? 'You' : message.senderName}</strong>
              <span>{formatTime(message.createdAt)}</span>
              {message.isPinned ? <span>Pinned</span> : null}
            </div>
            {message.isDeleted ? (
              <p className="muted-text">Message deleted</p>
            ) : (
              <>
                {message.body ? <p>{message.body}</p> : null}
                {message.attachments.length > 0 ? (
                  <div className="attachment-grid">
                    {message.attachments.map((attachment) => (
                      <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer">
                        {isImage(attachment.mimeType) ? <img src={attachment.url} alt={attachment.fileName} /> : null}
                        <span>{attachment.fileName}</span>
                      </a>
                    ))}
                  </div>
                ) : null}
              </>
            )}
            <div className="chat-message-actions">
              <button
                type="button"
                className="message-menu-trigger"
                onClick={() => setOpenMenuId((current) => current === message.id ? '' : message.id)}
                aria-label="Message options"
              >
                ⋯
              </button>
              {openMenuId === message.id ? (
                <div className="message-menu">
                  {!message.isDeleted ? <button type="button" onClick={() => onPin(message.id, !message.isPinned)}>{message.isPinned ? 'Unpin' : 'Pin'}</button> : null}
                  <button type="button" onClick={() => onDelete(message.id, 'me')}>Delete for me</button>
                  {!message.isDeleted && mine ? <button type="button" onClick={() => onDelete(message.id, 'everyone')}>Delete for everyone</button> : null}
                </div>
              ) : null}
            </div>
          </article>
        )
      })}
      {messages.length === 0 ? <div className="empty-state"><h3>No messages</h3><p>Start the conversation.</p></div> : null}
    </div>
  )
}
