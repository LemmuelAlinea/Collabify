import { useCallback, useEffect, useState } from 'react'
import {
  deleteArchiveItem,
  getArchiveItems,
  restoreArchiveItem,
} from '../services/archiveService'

export function useArchives() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      setItems(await getArchiveItems())
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    getArchiveItems()
      .then((nextItems) => {
        if (!isMounted) return
        setItems(nextItems)
        setError('')
      })
      .catch((loadError) => {
        if (!isMounted) return
        setError(loadError.message)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const restore = useCallback(async (item) => {
    const result = await restoreArchiveItem(item.type, item.id)
    setItems((current) => current.filter((archiveItem) => `${archiveItem.type}:${archiveItem.id}` !== `${item.type}:${item.id}`))
    return result
  }, [])

  const remove = useCallback(async (item) => {
    const result = await deleteArchiveItem(item.type, item.id)
    setItems((current) => current.filter((archiveItem) => `${archiveItem.type}:${archiveItem.id}` !== `${item.type}:${item.id}`))
    return result
  }, [])

  return {
    error,
    isLoading,
    items,
    load,
    remove,
    restore,
  }
}
