import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users } from 'lucide-react'
import { StudentPageSkeleton } from '../../../components/skeletons/StudentPageSkeleton'
import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'
import { useClasses } from '../../classes/hooks/useClasses'
import { useGroups } from '../../groups/hooks/useGroups'
import { ChatComposer } from '../components/ChatComposer'
import { MessageList } from '../components/MessageList'
import { useMessages } from '../hooks/useMessages'

export function MessagesPage() {
  const { role } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const { classes } = useClasses()
  const { groups } = useGroups()
  const [scope, setScope] = useState(searchParams.get('scope') === 'group' ? 'group' : 'class')
  const [manualTargetId, setManualTargetId] = useState('')
  const [showPinned, setShowPinned] = useState(false)

  const targets = useMemo(() => (
    scope === 'class'
      ? classes.map((item) => ({ id: item.id, chatId: item.classChat?.id ?? '', name: `${item.name} ${item.section ?? ''}`.trim() }))
      : groups.map((item) => ({ id: item.id, chatId: item.groupChat?.id ?? item.id, name: item.name }))
  ), [classes, groups, scope])
  const routeTargetId = scope === 'class' ? searchParams.get('classId') : searchParams.get('groupId')
  const routeTargetIsValid = routeTargetId && targets.some((target) => target.id === routeTargetId)
  const manualTargetIsValid = manualTargetId && targets.some((target) => target.id === manualTargetId)
  const targetId = manualTargetIsValid ? manualTargetId : routeTargetIsValid ? routeTargetId : targets[0]?.id ?? ''
  const selectedTarget = targets.find((target) => target.id === targetId)
  const chatId = selectedTarget?.chatId ?? ''
  const { error, isLoading, messages, pin, remove, send } = useMessages(scope, chatId)
  const pinnedMessages = messages.filter((message) => message.isPinned)
  const chatTitle = selectedTarget?.name ?? (scope === 'class' ? 'Class chat' : 'Group chat')

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('scope', scope)
    if (scope === 'class') {
      if (targetId) nextParams.set('classId', targetId)
      nextParams.delete('groupId')
    } else {
      if (targetId) nextParams.set('groupId', targetId)
      nextParams.delete('classId')
    }
    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true })
    }
  }, [scope, targetId, searchParams, setSearchParams])

  if (isLoading && messages.length === 0) return <StudentPageSkeleton variant="messages" />

  return (
    <section className="module-page messages-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">{role}</p>
          <h2>Messages</h2>
          <button type="button" className="secondary-button pinned-chats-button" onClick={() => setShowPinned(true)}>
            Pinned chats ({pinnedMessages.length})
          </button>
        </div>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <div className="route-state">Loading messages...</div> : null}
      {chatId ? (
        <div className="messages-layout">
          <aside className="chat-sidebar-panel">
            <div className="chat-scope-tabs">
              <button className={scope === 'class' ? 'is-active' : ''} type="button" onClick={() => {
                setManualTargetId('')
                setScope('class')
              }}>Class</button>
              {role === USER_ROLES.STUDENT ? (
                <button className={scope === 'group' ? 'is-active' : ''} type="button" onClick={() => {
                  setManualTargetId('')
                  setScope('group')
                }}>Group</button>
              ) : null}
            </div>
            <div className="chat-target-list">
              {targets.map((target) => (
                <button className={target.id === targetId ? 'is-active' : ''} key={target.id} type="button" onClick={() => setManualTargetId(target.id)}>
                  <span><Users size={16} aria-hidden="true" /></span>
                  <strong>{target.name}</strong>
                  <small>{scope === 'class' ? 'Class chat' : 'Group chat'}</small>
                </button>
              ))}
            </div>
          </aside>
          <div className="chat-panel">
            <header className="chat-panel-header">
              <div>
                <p className="eyebrow">{scope === 'class' ? 'Class chat' : 'Group chat'}</p>
                <h3>{chatTitle}</h3>
                <span>Collaborate creatively, deliver clearly.</span>
              </div>
            </header>
            <MessageList messages={messages} onDelete={remove} onPin={pin} />
            <ChatComposer scope={scope} chatId={chatId} onSend={send} />
          </div>
        </div>
      ) : (
        <div className="empty-state"><h3>No chat selected</h3><p>Select a class or group.</p></div>
      )}

      {showPinned ? (
        <div className="modal-backdrop">
          <div className="modal-panel pinned-modal">
            <div className="task-modal-header">
              <h3>Pinned chats</h3>
              <button className="secondary-button" type="button" onClick={() => setShowPinned(false)}>Close</button>
            </div>
            {pinnedMessages.length === 0 ? (
              <div className="empty-state"><h3>No pinned messages</h3><p>Pin messages from the menu.</p></div>
            ) : (
              <div className="pinned-modal-list">
                {pinnedMessages.map((message) => (
                  <article key={message.id} className="pinned-modal-item">
                    <strong>{message.senderName}</strong>
                    <p>{message.body || message.attachments[0]?.fileName || 'Pinned message'}</p>
                    <small>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(message.createdAt))}</small>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
