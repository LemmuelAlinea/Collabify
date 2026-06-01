import { useState } from 'react'
import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not reviewed'
}

function ReviewForm({ onReview, request }) {
  const [form, setForm] = useState({
    reviewNotes: '',
    scorePolicy: request.scorePolicy,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  async function submit(status) {
    setIsSubmitting(true)
    try {
      await onReview(request.id, {
        ...form,
        reviewNotes: form.reviewNotes || null,
        status,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="reassignment-review">
      <label className="form-field" htmlFor={`policy-${request.id}`}>
        <span>Score handling</span>
        <select id={`policy-${request.id}`} name="scorePolicy" value={form.scorePolicy} onChange={updateField}>
          <option value="keep_original">Keep original score</option>
          <option value="split_50_50">Split score 50/50</option>
          <option value="full_transfer">Full transfer</option>
        </select>
      </label>
      <label className="form-field" htmlFor={`notes-${request.id}`}>
        <span>Review notes</span>
        <textarea id={`notes-${request.id}`} name="reviewNotes" rows="2" value={form.reviewNotes} onChange={updateField} />
      </label>
      <div className="card-actions">
        <button className="primary-button" type="button" disabled={isSubmitting} onClick={() => submit('approved')}>Approve</button>
        <button className="danger-button" type="button" disabled={isSubmitting} onClick={() => submit('rejected')}>Reject</button>
      </div>
    </div>
  )
}

export function ReassignmentList({ onReview, reassignments }) {
  const { role } = useAuth()
  const isProfessor = role === USER_ROLES.PROFESSOR

  return (
    <div className="reassignment-list">
      {reassignments.map((request) => (
        <article className="reassignment-card" key={request.id}>
          <div className="project-card-heading">
            <p className="eyebrow">{request.task?.title ?? 'Task reassignment'}</p>
            <span>{request.status}</span>
          </div>
          <h3>{request.project?.title ?? 'Project'}</h3>
          <p>{request.reason}</p>
          <dl className="compact-details">
            <div><dt>Current</dt><dd>{request.currentAssigneeName ?? 'Current assignee'}</dd></div>
            <div><dt>Requested</dt><dd>{request.requestedAssigneeName ?? 'New assignee'}</dd></div>
            <div><dt>Score</dt><dd>{request.scorePolicy}</dd></div>
            <div><dt>Reviewed</dt><dd>{formatDate(request.reviewedAt)}</dd></div>
          </dl>
          {request.reviewNotes ? <p><strong>Review:</strong> {request.reviewNotes}</p> : null}
          {isProfessor && request.status === 'pending' ? (
            <ReviewForm request={request} onReview={onReview} />
          ) : null}
        </article>
      ))}
      {reassignments.length === 0 ? <div className="empty-state"><h3>No reassignment requests</h3><p>Requests will appear here.</p></div> : null}
    </div>
  )
}
