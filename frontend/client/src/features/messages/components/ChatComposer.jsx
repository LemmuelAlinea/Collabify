import { useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { uploadMessageFiles } from '../services/messageUploadService'

export function ChatComposer({ chatId, scope, onSend }) {
  const { user } = useAuth()
  const [body, setBody] = useState('')
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    setError('')
    setIsSending(true)

    try {
      const attachments = await uploadMessageFiles(user.id, chatId, files)
      await onSend({
        scope,
        chatId,
        body: body || null,
        attachments,
      })
      setBody('')
      setFiles([])
      formElement.reset()
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <form className="chat-composer" onSubmit={handleSubmit}>
      <textarea
        aria-label="Message"
        rows="3"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Write a message"
      />
      <div className="chat-composer-actions">
        <input
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          onChange={(event) => setFiles([...event.target.files])}
        />
        <button className="primary-button" type="submit" disabled={isSending || (!body.trim() && files.length === 0)}>
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  )
}
