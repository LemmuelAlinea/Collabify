import { useCallback, useEffect, useState } from 'react'
import {
  createSubmissionVersion,
  getSubmissions,
  reviewSubmission,
  selectFinalVersion,
} from '../services/submissionService'

export function useSubmissions(filters) {
  const [submissions, setSubmissions] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadSubmissions = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      setSubmissions(await getSubmissions(filters))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadSubmissions()
  }, [loadSubmissions])

  const uploadVersion = useCallback(async (payload) => {
    const submission = await createSubmissionVersion(payload)
    setSubmissions((current) => {
      const exists = current.some((item) => item.id === submission.id)
      return exists ? current.map((item) => item.id === submission.id ? submission : item) : [submission, ...current]
    })
    return submission
  }, [])

  const selectFinal = useCallback(async (id, versionId) => {
    const submission = await selectFinalVersion(id, versionId)
    setSubmissions((current) => current.map((item) => item.id === id ? submission : item))
    return submission
  }, [])

  const review = useCallback(async (id, payload) => {
    const submission = await reviewSubmission(id, payload)
    setSubmissions((current) => current.map((item) => item.id === id ? submission : item))
    return submission
  }, [])

  return {
    error,
    isLoading,
    loadSubmissions,
    review,
    selectFinal,
    submissions,
    uploadVersion,
  }
}
