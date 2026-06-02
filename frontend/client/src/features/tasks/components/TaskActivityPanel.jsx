import { useState } from 'react'
import { TaskHistoryItem } from './TaskHistoryItem'

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : ''
}

export function TaskActivityPanel({ comments, history, onComment }) {
  const [tab, setTab] = useState('comments')
  const [body, setBody] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (!body.trim()) return
    await onComment({ body: body.trim() })
    setBody('')
  }

  return (
    <section className="task-activity-panel">
      <div className="task-activity-title">
        <h3>Activity</h3>
        <div className="task-activity-tabs">
          <button className={tab === 'comments' ? 'is-active' : ''} type="button" onClick={() => setTab('comments')}>Comments</button>
          <button className={tab === 'history' ? 'is-active' : ''} type="button" onClick={() => setTab('history')}>History</button>
        </div>
      </div>

      {tab === 'comments' ? (
        <div className="task-detail-comments">
          <form className="task-detail-comment-form" onSubmit={submit}>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Add a comment" rows="3" />
            <button className="primary-button" type="submit">Post comment</button>
          </form>
          {(comments ?? []).map((comment) => (
            <article className="task-detail-comment" key={comment.id}>
              <strong>{comment.displayName}</strong>
              <small>{formatDate(comment.createdAt)}</small>
              <p>{comment.body}</p>
            </article>
          ))}
          {!comments?.length ? <p className="muted-copy">No comments yet.</p> : null}
        </div>
      ) : (
        <div className="task-history-list">
          {(history ?? []).map((item) => <TaskHistoryItem item={item} key={item.id} />)}
          {!history?.length ? <p className="muted-copy">No status history yet.</p> : null}
        </div>
      )}
    </section>
  )
}
