import { useCallback, useEffect, useState } from 'react'
import {
  archiveReassignment,
  createReassignment,
  getReassignments,
  reviewReassignment,
} from '../services/reassignmentService'

export function useReassignments() {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [reassignments, setReassignments] = useState([])

  const loadReassignments = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      setReassignments(await getReassignments())
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReassignments()
  }, [loadReassignments])

  const request = useCallback(async (payload) => {
    const reassignment = await createReassignment(payload)
    setReassignments((current) => [reassignment, ...current])
    return reassignment
  }, [])

  const review = useCallback(async (id, payload) => {
    const reassignment = await reviewReassignment(id, payload)
    setReassignments((current) => current.map((item) => item.id === id ? reassignment : item))
    return reassignment
  }, [])

  const archive = useCallback(async (id) => {
    await archiveReassignment(id)
    setReassignments((current) => current.filter((item) => item.id !== id))
  }, [])

  return {
    archive,
    error,
    isLoading,
    loadReassignments,
    reassignments,
    request,
    review,
  }
}
