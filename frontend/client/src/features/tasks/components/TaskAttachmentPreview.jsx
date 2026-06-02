import { useEffect, useState } from 'react'
import { Download, File, FileImage, FileText, Film, Trash2 } from 'lucide-react'
import { getVersionDownloadUrl } from '../../submissions/services/submissionService'

function iconFor(mimeType = '') {
  if (mimeType.startsWith('image/')) return FileImage
  if (mimeType.startsWith('video/')) return Film
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word')) return FileText
  return File
}

function formatSize(bytes) {
  if (!bytes) return '0 B'
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

function previewType(mimeType = '') {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.includes('pdf')) return 'pdf'
  return 'file'
}

export function TaskAttachmentPreview({ canManage = false, onDelete, version }) {
  const Icon = iconFor(version.mimeType)
  const [url, setUrl] = useState('')
  const type = previewType(version.mimeType)

  useEffect(() => {
    let isMounted = true

    getVersionDownloadUrl(version.id)
      .then((signedUrl) => {
        if (isMounted) setUrl(signedUrl)
      })
      .catch(() => {
        if (isMounted) setUrl('')
      })

    return () => {
      isMounted = false
    }
  }, [version.id])

  function downloadFile() {
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <article className={`task-file-paper ${version.isFinal ? 'is-current' : ''}`}>
      <div className="task-file-preview">
        {type === 'image' && url ? <img src={url} alt={version.fileName} loading="lazy" /> : null}
        {type === 'video' && url ? <video src={url} muted preload="metadata" /> : null}
        {type === 'pdf' && url ? <iframe src={`${url}#toolbar=0&navpanes=0`} title={version.fileName} /> : null}
        {(!url || type === 'file') ? <Icon size={28} aria-hidden="true" /> : null}
      </div>
      <div className="task-file-caption">
        <strong title={version.fileName}>{version.fileName}</strong>
        <span>v{version.version}</span>
        <small>{formatSize(version.fileSizeBytes)}</small>
      </div>
      <div className="task-file-actions">
        <button type="button" onClick={downloadFile} disabled={!url} aria-label={`Download ${version.fileName}`}>
          <Download size={14} aria-hidden="true" />
        </button>
        {canManage ? (
          <button type="button" onClick={() => window.confirm('Delete this attachment?') && onDelete?.(version.id)} aria-label={`Delete ${version.fileName}`}>
            <Trash2 size={14} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </article>
  )
}
