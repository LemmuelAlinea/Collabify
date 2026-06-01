import { useCallback, useEffect, useState } from 'react'
import { getProfessorClasses } from '../../classes/services/classService'
import {
  archiveSyllabus,
  createSyllabus,
  getSyllabi,
  getSyllabusDownloadUrl,
  updateSyllabus,
} from '../services/syllabusService'

export function useSyllabi() {
  const [classes, setClasses] = useState([])
  const [syllabi, setSyllabi] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const [nextClasses, nextSyllabi] = await Promise.all([
        getProfessorClasses(),
        getSyllabi(),
      ])
      setClasses(nextClasses)
      setSyllabi(nextSyllabi)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const saveNewSyllabus = useCallback(async (payload) => {
    const syllabus = await createSyllabus(payload)
    setSyllabi((current) => [syllabus, ...current])
    return syllabus
  }, [])

  const saveSyllabus = useCallback(async (id, payload) => {
    const syllabus = await updateSyllabus(id, payload)
    setSyllabi((current) => current.map((item) => item.id === id ? syllabus : item))
    return syllabus
  }, [])

  const archive = useCallback(async (id) => {
    const syllabus = await archiveSyllabus(id)
    setSyllabi((current) => current.map((item) => item.id === id ? syllabus : item))
    return syllabus
  }, [])

  const openDownload = useCallback(async (id) => {
    const url = await getSyllabusDownloadUrl(id)
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  return {
    archive,
    classes,
    error,
    isLoading,
    load,
    openDownload,
    saveNewSyllabus,
    saveSyllabus,
    syllabi,
  }
}
