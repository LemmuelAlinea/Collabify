import { useState } from 'react'
import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'
import { getVersionDownloadUrl } from '../services/submissionService'

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not set'
}

function formatSize(bytes) {
  if (!bytes) return '0 B'
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

export function SubmissionCard({ onReview, onSelectFinal, submission }) {
  const { role } = useAuth()
  const [feedback, setFeedback] = useState(submission.feedback ?? '')
  const [status, setStatus] = useState(submission.status === 'submitted' ? 'reviewed' : submission.status)
  const isProfessor = role === USER_ROLES.PROFESSOR
  const isStudent = role === USER_ROLES.STUDENT

  async function download(versionId) {
    const url = await getVersionDownloadUrl(versionId)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function submitReview(event) {
    event.preventDefault()
    await onReview(submission.id, { status, feedback: feedback || null })
  }

  return (
    <article className="project-card">
      <div>
        <div className="project-card-heading">
          <p className="eyebrow">{submission.task?.project?.title ?? 'Project'}</p>
          <span>{submission.status}</span>
        </div>
        <h3>{submission.task?.title ?? 'Submission'}</h3>
        <p>{submission.group?.name} / {submission.group?.className}</p>
      </div>
      <dl className="compact-details">
        <div><dt>Final version</dt><dd>{submission.versions.find((version) => version.isFinal)?.version ?? 'None'}</dd></div>
        <div><dt>Submitted</dt><dd>{formatDate(submission.submittedAt)}</dd></div>
        <div><dt>Reviewed</dt><dd>{formatDate(submission.reviewedAt)}</dd></div>
      </dl>
      <div className="version-timeline">
        {submission.versions.map((version) => (
          <div className={`version-row ${version.isFinal ? 'is-final' : ''}`} key={version.id}>
            <div>
              <strong>Version {version.version}</strong>
              <p>{version.fileName} / {formatSize(version.fileSizeBytes)}</p>
              <p>{version.notes || 'No notes.'}</p>
              <p>{formatDate(version.createdAt)} by {version.displayName}</p>
            </div>
            <div className="card-actions">
              <button className="secondary-button" type="button" onClick={() => download(version.id)}>Download</button>
              {isStudent && !version.isFinal ? (
                <button className="secondary-button" type="button" onClick={() => onSelectFinal(submission.id, version.id)}>Select final</button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {submission.feedback ? <p><strong>Feedback:</strong> {submission.feedback}</p> : null}
      {isProfessor ? (
        <form className="deadline-form" onSubmit={submitReview}>
          <label className="form-field" htmlFor={`review-${submission.id}`}>
            <span>Review status</span>
            <select id={`review-${submission.id}`} value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="reviewed">Reviewed</option>
              <option value="returned">Returned</option>
              <option value="accepted">Accepted</option>
            </select>
          </label>
          <label className="form-field" htmlFor={`feedback-${submission.id}`}>
            <span>Feedback</span>
            <textarea id={`feedback-${submission.id}`} rows="3" value={feedback} onChange={(event) => setFeedback(event.target.value)} />
          </label>
          <button className="secondary-button" type="submit">Save review</button>
        </form>
      ) : null}
    </article>
  )
}
