import { useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { USER_ROLES } from '../../auth/constants/roles'
import { AnnouncementForm } from './AnnouncementForm'
import { useAnnouncements } from '../hooks/useAnnouncements'

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function AnnouncementPanel({ classId, initialAnnouncements }) {
  const { role, user } = useAuth()
  const {
    announcements,
    error,
    isLoading,
    removeAnnouncement,
    saveAnnouncement,
    saveNewAnnouncement,
  } = useAnnouncements(classId, initialAnnouncements)
  const [mode, setMode] = useState('list')
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const isProfessor = role === USER_ROLES.PROFESSOR

  async function handleSave(payload) {
    if (selectedAnnouncement) {
      await saveAnnouncement(selectedAnnouncement.id, payload)
    } else {
      await saveNewAnnouncement({
        ...payload,
        classId,
      })
    }

    setSelectedAnnouncement(null)
    setMode('list')
  }

  function startEdit(announcement) {
    setSelectedAnnouncement(announcement)
    setMode('form')
  }

  return (
    <section className="announcement-panel">
      <div className="section-heading-row">
        <h3>Announcements</h3>
        {isProfessor && mode === 'list' ? (
          <button className="primary-button" type="button" onClick={() => setMode('form')}>New</button>
        ) : null}
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p>Refreshing announcements...</p> : null}

      {mode === 'form' ? (
        <AnnouncementForm
          announcement={selectedAnnouncement}
          classId={classId}
          userId={user?.id}
          onCancel={() => {
            setSelectedAnnouncement(null)
            setMode('list')
          }}
          onSave={handleSave}
        />
      ) : (
        <div className="announcement-list">
          {announcements.map((announcement) => (
            <article className="announcement-item" key={announcement.id}>
              <div>
                <div className="announcement-title-row">
                  <h4>{announcement.title}</h4>
                  {announcement.isPinned ? <span>Pinned</span> : null}
                </div>
                <p>{announcement.body}</p>
                {announcement.attachments?.length ? (
                  <div className="announcement-attachment-grid">
                    {announcement.attachments.map((attachment) => (
                      <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="announcement-attachment">
                        <img src={attachment.url} alt={attachment.fileName} loading="lazy" />
                      </a>
                    ))}
                  </div>
                ) : null}
                <small>{formatDate(announcement.publishedAt)}</small>
              </div>
              {isProfessor ? (
                <div className="card-actions">
                  <button className="secondary-button" type="button" onClick={() => startEdit(announcement)}>Edit</button>
                  <button className="secondary-button" type="button" onClick={() => saveAnnouncement(announcement.id, { isPinned: !announcement.isPinned })}>
                    {announcement.isPinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button className="danger-button" type="button" onClick={() => removeAnnouncement(announcement.id)}>Delete</button>
                </div>
              ) : null}
            </article>
          ))}
          {announcements.length === 0 ? <p>No announcements yet.</p> : null}
        </div>
      )}
    </section>
  )
}
