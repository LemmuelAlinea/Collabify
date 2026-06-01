import { useCallback, useEffect, useState } from 'react'
import {
  archiveClass,
  createClass,
  getMyClasses,
  joinClass,
  updateClass,
} from '../services/classService'

export function useClasses() {
  const [classes, setClasses] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadClasses = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      setClasses(await getMyClasses())
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  const saveNewClass = useCallback(async (payload) => {
    const classItem = await createClass(payload)
    setClasses((current) => [classItem, ...current])
    return classItem
  }, [])

  const saveClass = useCallback(async (classId, payload) => {
    const classItem = await updateClass(classId, payload)
    setClasses((current) => current.map((item) => item.id === classId ? classItem : item))
    return classItem
  }, [])

  const removeClass = useCallback(async (classId) => {
    const classItem = await archiveClass(classId)
    setClasses((current) => current.filter((item) => item.id !== classId))
    return classItem
  }, [])

  const join = useCallback(async (classCode) => {
    const classItem = await joinClass(classCode)
    setClasses((current) => {
      if (current.some((item) => item.id === classItem.id)) return current
      return [classItem, ...current]
    })
    return classItem
  }, [])

  return {
    classes,
    error,
    isLoading,
    join,
    loadClasses,
    removeClass,
    saveClass,
    saveNewClass,
  }
}
