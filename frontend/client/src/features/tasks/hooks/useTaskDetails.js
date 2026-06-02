import { useCallback, useEffect, useState } from 'react'
import { addTaskComment, getTaskDetails, updateTask } from '../services/taskService'
import {
  archiveSubmissionVersion,
  createSubmissionVersion,
  deleteSubmissionVersion,
  selectFinalVersion,
} from '../../submissions/services/submissionService'

export function useTaskDetails(taskId) {
  const [details, setDetails] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadDetails = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setDetails(await getTaskDetails(taskId))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    loadDetails()
  }, [loadDetails])

  const saveStatus = useCallback(async (status) => {
    await updateTask(taskId, { status })
    await loadDetails()
  }, [loadDetails, taskId])

  const comment = useCallback(async (payload) => {
    await addTaskComment(taskId, payload)
    await loadDetails()
  }, [loadDetails, taskId])

  const uploadVersion = useCallback(async (payload) => {
    const submission = await createSubmissionVersion(payload)
    setDetails((current) => current ? { ...current, submission } : current)
    return submission
  }, [])

  const selectCurrent = useCallback(async (submissionId, versionId) => {
    const submission = await selectFinalVersion(submissionId, versionId)
    setDetails((current) => current ? { ...current, submission } : current)
    return submission
  }, [])

  const archiveVersion = useCallback(async (versionId) => {
    const submission = await archiveSubmissionVersion(versionId)
    setDetails((current) => current ? { ...current, submission } : current)
    return submission
  }, [])

  const deleteVersion = useCallback(async (versionId) => {
    const submission = await deleteSubmissionVersion(versionId)
    setDetails((current) => current ? { ...current, submission } : current)
    return submission
  }, [])

  return {
    archiveVersion,
    comment,
    deleteVersion,
    details,
    error,
    isLoading,
    loadDetails,
    saveStatus,
    selectCurrent,
    uploadVersion,
  }
}
