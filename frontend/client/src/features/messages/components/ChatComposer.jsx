import { useId, useState } from 'react'
import { Paperclip, Send } from 'lucide-react'
import { useAuth } from '../../auth/hooks/useAuth'
import { uploadMessageFiles } from '../services/messageUploadService'

export function ChatComposer({ chatId, scope, onSend }) {
  const { user } = useAuth()
  const fileInputId = useId()
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
      <div className="chat-compose-box">
        <label className="chat-file-button" htmlFor={fileInputId} aria-label="Attach files" title="Attach files">
          <Paperclip size={16} aria-hidden="true" />
        </label>
        <input
          id={fileInputId}
          className="chat-file-input"
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          onChange={(event) => setFiles([...event.target.files])}
        />
        <div className="chat-input-stack">
          <textarea
            aria-label="Message"
            rows="1"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write your message..."
          />
          {files.length ? (
            <div className="chat-selected-files">
              {files.map((file) => (
                <span key={`${file.name}-${file.size}`}>{file.name}</span>
              ))}
            </div>
          ) : null}
        </div>
        <button className="primary-button" type="submit" disabled={isSending || (!body.trim() && files.length === 0)} aria-label="Send message">
          {isSending ? '...' : <Send size={16} aria-hidden="true" />}
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  )
}
