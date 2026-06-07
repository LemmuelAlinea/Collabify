import { useMemo, useState } from 'react'
import { RotateCcw, Search, Trash2 } from 'lucide-react'
import { StudentPageSkeleton } from '../../../components/skeletons/StudentPageSkeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table'
import { useArchives } from '../hooks/useArchives'

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'class', label: 'Classes' },
  { value: 'project', label: 'Projects' },
  { value: 'task', label: 'Tasks' },
  { value: 'curriculum', label: 'Curriculum' },
  { value: 'syllabus', label: 'Syllabi' },
]

const TYPE_LABELS = {
  class: 'Class',
  project: 'Project',
  task: 'Task',
  curriculum: 'Curriculum',
  syllabus: 'Syllabus',
}

function formatDate(value) {
  if (!value) return 'Unknown'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function searchableText(item) {
  return [
    TYPE_LABELS[item.type],
    item.title,
    item.description,
    item.related,
  ].filter(Boolean).join(' ').toLowerCase()
}

function compareValues(left, right, direction) {
  if (left < right) return direction === 'asc' ? -1 : 1
  if (left > right) return direction === 'asc' ? 1 : -1
  return 0
}

function sortValue(item, sortBy) {
  if (sortBy === 'type') return TYPE_LABELS[item.type] ?? item.type
  if (sortBy === 'related') return item.related ?? ''
  if (sortBy === 'archivedAt') return item.archivedAt ? new Date(item.archivedAt).getTime() : 0
  return item.title ?? ''
}

export function ArchivePage() {
  const { error, isLoading, items, remove, restore } = useArchives()
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('archivedAt')
  const [sortDirection, setSortDirection] = useState('desc')
  const [pendingKey, setPendingKey] = useState('')

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return [...items]
      .filter((item) => typeFilter === 'all' || item.type === typeFilter)
      .filter((item) => !normalizedQuery || searchableText(item).includes(normalizedQuery))
      .sort((left, right) => compareValues(sortValue(left, sortBy), sortValue(right, sortBy), sortDirection))
  }, [items, query, sortBy, sortDirection, typeFilter])

  function changeSort(column) {
    if (sortBy === column) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortBy(column)
    setSortDirection(column === 'archivedAt' ? 'desc' : 'asc')
  }

  async function restoreItem(item) {
    setPendingKey(`${item.type}:${item.id}`)
    setNotice('')
    try {
      await restore(item)
      setNotice(`${TYPE_LABELS[item.type]} restored.`)
    } catch (restoreError) {
      setNotice(restoreError.message)
    } finally {
      setPendingKey('')
    }
  }

  async function deleteItem(item) {
    if (!window.confirm(`Permanently delete "${item.title}"? This cannot be undone.`)) return

    setPendingKey(`${item.type}:${item.id}`)
    setNotice('')
    try {
      await remove(item)
      setNotice(`${TYPE_LABELS[item.type]} permanently deleted.`)
    } catch (deleteError) {
      setNotice(deleteError.message)
    } finally {
      setPendingKey('')
    }
  }

  if (isLoading) return <StudentPageSkeleton variant="archive" />

  return (
    <section className="module-page archive-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">Professor</p>
          <h2>Archive</h2>
          <p>Restore archived workspace records or remove them permanently.</p>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className={notice.includes('deleted') || notice.includes('restored') ? 'form-success' : 'form-error'}>{notice}</p> : null}

      <div className="archive-panel">
        <div className="archive-toolbar">
          <label className="archive-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search archive..."
            />
          </label>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="archive-table-wrap">
          <Table className="archive-table">
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button type="button" onClick={() => changeSort('type')}>Type</button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => changeSort('title')}>Title</button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => changeSort('related')}>Related</button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => changeSort('archivedAt')}>Archived</button>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleItems.map((item) => {
                const itemKey = `${item.type}:${item.id}`
                const isPending = pendingKey === itemKey
                return (
                  <TableRow key={itemKey}>
                    <TableCell>
                      <span className={`archive-type-badge archive-type-${item.type}`}>{TYPE_LABELS[item.type]}</span>
                    </TableCell>
                    <TableCell>
                      <strong className="archive-title">{item.title}</strong>
                      {item.description ? <span className="archive-description">{item.description}</span> : null}
                    </TableCell>
                    <TableCell>{item.related || 'None'}</TableCell>
                    <TableCell>{formatDate(item.archivedAt)}</TableCell>
                    <TableCell>
                      <div className="archive-actions">
                        <button className="icon-button" type="button" title="Unarchive" aria-label={`Unarchive ${item.title}`} disabled={isPending} onClick={() => restoreItem(item)}>
                          <RotateCcw size={16} aria-hidden="true" />
                        </button>
                        <button className="icon-button danger-icon" type="button" title="Delete permanently" aria-label={`Delete ${item.title} permanently`} disabled={isPending} onClick={() => deleteItem(item)}>
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {visibleItems.length === 0 ? (
            <div className="empty-state">
              <h3>No archived items</h3>
              <p>Archived classes, projects, tasks, curriculum, and syllabi will appear here.</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
