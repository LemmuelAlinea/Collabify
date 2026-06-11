import { useState } from 'react'
import { Archive } from 'lucide-react'
import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not reviewed'
}

function scoreLabel(value) {
  return {
    keep_original: 'Keep original',
    split_50_50: 'Split 50/50',
    full_transfer: 'Full transfer',
  }[value] ?? value
}

const VERDICT_LABELS = {
  valid: 'Likely valid',
  valid_negative: 'Likely valid (performance concern)',
  questionable: 'Questionable',
  needs_info: 'Needs more information',
}

const WORKLOAD_STATUS_LABELS = {
  over: 'Overloaded',
  under: 'Underloaded',
  balanced: 'Balanced',
}

const ACTIVITY_STATUS_LABELS = {
  active: 'Active',
  low_activity: 'Low activity',
  inactive: 'Inactive',
}

const REASON_CATEGORY_LABELS = {
  emergency: 'Emergency / health-related',
  performance: 'Performance concern',
  unclear: 'Unclear',
}

function ReassignmentAnalysisPanel({ analysis, currentAssigneeId }) {
  return (
    <div className="reassignment-analysis">
      <div className={`reassignment-analysis-verdict reassignment-analysis-verdict--${analysis.verdict}`}>
        <strong>{VERDICT_LABELS[analysis.verdict] ?? analysis.verdict}</strong>
        <p>{analysis.suggestion}</p>
      </div>
      <div className="reassignment-analysis-section">
        <h4>Workload distribution</h4>
        <p className="muted-text">{analysis.workload.balanced ? 'Tasks appear evenly distributed across the group.' : 'Workload appears uneven across the group.'}</p>
        <ul className="reassignment-analysis-list">
          {analysis.workload.members.map((member) => (
            <li key={member.userId}>
              <span>{member.name}{member.userId === currentAssigneeId ? ' (current assignee)' : ''}</span>
              <span>{member.share}% &middot; {WORKLOAD_STATUS_LABELS[member.status] ?? member.status}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="reassignment-analysis-section">
        <h4>Reason assessment</h4>
        <p>{REASON_CATEGORY_LABELS[analysis.reason.category] ?? analysis.reason.category}</p>
        {analysis.reason.matchedKeywords.length ? <p className="muted-text">Matched keywords: {analysis.reason.matchedKeywords.join(', ')}</p> : null}
      </div>
      <div className="reassignment-analysis-section">
        <h4>Current assignee activity</h4>
        <ul className="reassignment-analysis-list">
          <li><span>Status</span><span>{ACTIVITY_STATUS_LABELS[analysis.activity.status] ?? analysis.activity.status}</span></li>
          <li><span>Contribution points</span><span>{analysis.activity.points}</span></li>
          <li><span>Score vs group average</span><span>{analysis.activity.score} / {analysis.activity.groupAverageScore}</span></li>
          <li><span>Last activity</span><span>{analysis.activity.daysSinceLastActivity === null ? 'No recorded activity' : `${analysis.activity.daysSinceLastActivity}d ago`}</span></li>
        </ul>
      </div>
    </div>
  )
}

function ReviewForm({ onAnalyze, onReview, request }) {
  const [form, setForm] = useState({
    reviewNotes: '',
    scorePolicy: request.scorePolicy,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState('')

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

  async function runAnalysis() {
    setIsAnalyzing(true)
    setAnalysisError('')
    try {
      setAnalysis(await onAnalyze(request.id))
    } catch (error) {
      setAnalysisError(error.message)
    } finally {
      setIsAnalyzing(false)
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
        <button className="secondary-button" type="button" disabled={isAnalyzing} onClick={runAnalysis}>{isAnalyzing ? 'Analyzing...' : 'AI Suggest'}</button>
      </div>
      {analysisError ? <p className="form-error">{analysisError}</p> : null}
      {analysis ? <ReassignmentAnalysisPanel analysis={analysis} currentAssigneeId={request.currentAssigneeId} /> : null}
    </div>
  )
}

function ReviewedReassignmentTable({ canArchive = false, emptyLabel, onArchive, reassignments, title, visibleWhenEmpty = false }) {
  const [query, setQuery] = useState('')
  const [archiveTarget, setArchiveTarget] = useState(null)
  const normalizedQuery = query.trim().toLowerCase()
  const filtered = reassignments.filter((request) => {
    const haystack = [
      request.task?.title,
      request.currentAssigneeName,
      request.requestedAssigneeName,
      request.scorePolicy,
      formatDate(request.createdAt),
    ].filter(Boolean).join(' ').toLowerCase()
    return !normalizedQuery || haystack.includes(normalizedQuery)
  })

  if (!visibleWhenEmpty && !reassignments.length) return null

  async function confirmArchive() {
    if (!archiveTarget) return
    await onArchive(archiveTarget.id)
    setArchiveTarget(null)
  }

  return (
    <section className="reassignment-approved-panel">
      <div className="section-heading-row">
        <div>
          <h3>{title}</h3>
          <p className="muted-text">{filtered.length} shown</p>
        </div>
        <input
          className="reassignment-search-input"
          type="search"
          placeholder="Search task, names, date"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="reassignment-table-wrap">
        <table className="reassignment-approved-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Current assignee</th>
              <th>New assignee</th>
              <th>Score</th>
              <th>Created at</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((request) => (
              <tr key={request.id}>
                <td>{request.task?.title ?? 'Task reassignment'}</td>
                <td>{request.currentAssigneeName ?? 'Current assignee'}</td>
                <td>{request.requestedAssigneeName ?? 'New assignee'}</td>
                <td>{scoreLabel(request.scorePolicy)}</td>
                <td>{formatDate(request.createdAt)}</td>
                <td>
                  {canArchive ? (
                    <button className="icon-button reassignment-archive-button" type="button" aria-label="Archive reassignment" title="archive" onClick={() => setArchiveTarget(request)}>
                      <Archive size={16} />
                    </button>
                  ) : (
                    <span className="muted-text">-</span>
                  )}
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan="6">{emptyLabel}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {archiveTarget ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setArchiveTarget(null)}>
          <div className="modal-panel confirm-panel" role="dialog" aria-modal="true" aria-labelledby={`archive-reassignment-${archiveTarget.id}`} onMouseDown={(event) => event.stopPropagation()}>
            <h3 id={`archive-reassignment-${archiveTarget.id}`}>Archive reassignment?</h3>
            <p>This will hide the request from the active reassignment list.</p>
            <div className="card-actions">
              <button className="secondary-button" type="button" onClick={() => setArchiveTarget(null)}>Cancel</button>
              <button className="danger-button" type="button" onClick={confirmArchive}>Archive</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export function ReassignmentList({ onAnalyze, onArchive, onReview, reassignments }) {
  const { role } = useAuth()
  const isProfessor = role === USER_ROLES.PROFESSOR
  const isStudent = role === USER_ROLES.STUDENT
  const pending = reassignments.filter((request) => request.status === 'pending')
  const approved = reassignments.filter((request) => request.status === 'approved')
  const rejected = reassignments.filter((request) => request.status === 'rejected')
  const visibleCards = isProfessor ? reassignments.filter((request) => request.status === 'pending') : reassignments

  if (isStudent) {
    return (
      <div className="reassignment-reviewed-grid reassignment-reviewed-grid--three student-reassignment-grid">
        <ReviewedReassignmentTable
          canArchive
          emptyLabel="No pending reassignments match your search."
          onArchive={onArchive}
          reassignments={pending}
          title="Pending requests"
          visibleWhenEmpty
        />
        <ReviewedReassignmentTable
          canArchive
          emptyLabel="No approved reassignments match your search."
          onArchive={onArchive}
          reassignments={approved}
          title="Approved requests"
          visibleWhenEmpty
        />
        <ReviewedReassignmentTable
          canArchive
          emptyLabel="No rejected reassignments match your search."
          onArchive={onArchive}
          reassignments={rejected}
          title="Rejected requests"
          visibleWhenEmpty
        />
      </div>
    )
  }

  return (
    <>
      <div className="reassignment-list">
        {visibleCards.map((request) => (
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
              <div><dt>Score</dt><dd>{scoreLabel(request.scorePolicy)}</dd></div>
              <div><dt>Reviewed</dt><dd>{formatDate(request.reviewedAt)}</dd></div>
            </dl>
            {request.reviewNotes ? <p><strong>Review:</strong> {request.reviewNotes}</p> : null}
            {isProfessor && request.status === 'pending' ? (
              <ReviewForm request={request} onAnalyze={onAnalyze} onReview={onReview} />
            ) : null}
          </article>
        ))}
        {reassignments.length === 0 ? <div className="empty-state"><h3>No reassignment requests</h3><p>Requests will appear here.</p></div> : null}
      </div>
      {isProfessor ? (
        <div className="reassignment-reviewed-grid">
          <ReviewedReassignmentTable
            canArchive
            emptyLabel="No approved reassignments match your search."
            reassignments={approved}
            title="Approved reassignments"
            onArchive={onArchive}
          />
          <ReviewedReassignmentTable
            canArchive
            emptyLabel="No rejected reassignments match your search."
            reassignments={rejected}
            title="Rejected reassignments"
            onArchive={onArchive}
          />
        </div>
      ) : null}
    </>
  )
}
