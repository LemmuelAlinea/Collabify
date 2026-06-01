import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'
import { useClasses } from '../../classes/hooks/useClasses'
import { getClassDetails } from '../../classes/services/classService'
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
  const [targetId, setTargetId] = useState('')
  const [classChatId, setClassChatId] = useState('')
  const [showPinned, setShowPinned] = useState(false)
  const selectedGroup = groups.find((group) => group.id === targetId)
  const chatId = scope === 'class' ? classChatId : selectedGroup?.groupChat?.id
  const { error, isLoading, messages, pin, remove, send } = useMessages(scope, chatId)
  const pinnedMessages = messages.filter((message) => message.isPinned)

  const targets = useMemo(() => (
    scope === 'class'
      ? classes.map((item) => ({ id: item.id, name: `${item.name} ${item.section ?? ''}`.trim() }))
      : groups.map((item) => ({ id: item.id, name: item.name }))
  ), [classes, groups, scope])

  useEffect(() => {
    const preselectedClassId = searchParams.get('classId')
    const preselectedGroupId = searchParams.get('groupId')
    const preferredId = scope === 'class' ? preselectedClassId : preselectedGroupId
    const validPreferredId = preferredId && targets.some((target) => target.id === preferredId) ? preferredId : ''
    setTargetId(validPreferredId || (targets[0]?.id ?? ''))
  }, [scope, targets, searchParams])

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

  useEffect(() => {
    let isMounted = true

    async function loadClassChat() {
      setClassChatId('')
      if (scope !== 'class' || !targetId) return
      const details = await getClassDetails(targetId)
      if (isMounted) setClassChatId(details.classChat?.id ?? '')
    }

    loadClassChat().catch(() => {
      if (isMounted) setClassChatId('')
    })

    return () => {
      isMounted = false
    }
  }, [scope, targetId])

  return (
    <section className="module-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">{role}</p>
          <h2>Messages</h2>
          <button type="button" className="secondary-button pinned-chats-button" onClick={() => setShowPinned(true)}>
            Pinned chats ({pinnedMessages.length})
          </button>
        </div>
        <div className="chat-selector">
          <select value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="class">Class chat</option>
            {role === USER_ROLES.STUDENT ? <option value="group">Group chat</option> : null}
          </select>
          <select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
            {targets.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}
          </select>
        </div>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <div className="route-state">Loading messages...</div> : null}
      {chatId ? (
        <div className="chat-panel">
          <MessageList messages={messages} onDelete={remove} onPin={pin} />
          <ChatComposer scope={scope} chatId={chatId} onSend={send} />
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
