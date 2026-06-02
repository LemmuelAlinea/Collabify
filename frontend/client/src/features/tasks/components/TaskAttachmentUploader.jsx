import { useRef, useState } from 'react'
import { Paperclip } from 'lucide-react'
import { uploadSubmissionFile, validateSubmissionFile } from '../../submissions/services/submissionUploadService'

export function TaskAttachmentUploader({ canUpload, onUpload, taskId, userId }) {
  const inputRef = useRef(null)
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setError('')
    setIsUploading(true)

    try {
      validateSubmissionFile(file)
      const filePayload = await uploadSubmissionFile(userId, taskId, file)
      await onUpload({
        taskId,
        selectAsFinal: true,
        ...filePayload,
      })
      event.target.value = ''
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="task-attachment-uploader">
      <input ref={inputRef} type="file" onChange={handleFileChange} disabled={!canUpload || isUploading} />
      <button className="secondary-button" type="button" onClick={() => inputRef.current?.click()} disabled={!canUpload || isUploading}>
        <Paperclip size={16} aria-hidden="true" />
        {isUploading ? 'Uploading...' : 'Attach file'}
      </button>
      {!canUpload ? <p className="form-error">Only assigned owners can attach files to this task.</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  )
}
