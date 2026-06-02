import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { getVersionDownloadUrl } from '../../submissions/services/submissionService'

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not set'
}

export function TaskVersionTable({ onArchive, onDelete, onSelectCurrent, submission }) {
  const [openMenuId, setOpenMenuId] = useState('')

  async function openFile(versionId) {
    const url = await getVersionDownloadUrl(versionId)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const versions = submission?.versions ?? []

  return (
    <div className="task-version-panel">
      <div className="task-version-table">
        <div className="task-version-row task-version-head">
          <span>File</span>
          <span>Uploaded by</span>
          <span>Uploaded</span>
          <span>Current</span>
          <span />
        </div>
        {versions.map((version) => (
          <div className="task-version-row" key={version.id}>
            <button className="link-button" type="button" onClick={() => openFile(version.id)}>{version.fileName}</button>
            <span>{version.displayName ?? 'Unknown user'}</span>
            <span>{formatDate(version.createdAt)}</span>
            <button
              className={version.isFinal ? 'success-button' : 'secondary-button'}
              type="button"
              disabled={version.isFinal}
              onClick={() => onSelectCurrent(submission.id, version.id)}
            >
              {version.isFinal ? 'Current' : 'Set current'}
            </button>
            <div className="task-version-menu">
              <button className="icon-button" type="button" onClick={() => setOpenMenuId((current) => current === version.id ? '' : version.id)}>
                <MoreHorizontal size={16} aria-hidden="true" />
              </button>
              {openMenuId === version.id ? (
                <div className="task-version-menu-popover">
                  <button type="button" onClick={() => window.confirm('Archive this version?') && onArchive(version.id)}>Archive</button>
                  <button type="button" onClick={() => window.confirm('Delete this version?') && onDelete(version.id)}>Delete</button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {versions.length === 0 ? <div className="empty-state"><h3>No attachments yet</h3><p>Uploaded task files will appear here.</p></div> : null}
    </div>
  )
}
