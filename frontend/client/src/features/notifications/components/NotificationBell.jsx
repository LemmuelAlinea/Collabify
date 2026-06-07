import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'
import { NotificationDropdown } from './NotificationDropdown'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState({})
  const wrapRef = useRef(null)
  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)
  const {
    markAllRead,
    markRead,
    notifications,
    unreadCount,
  } = useNotifications()

  const placeDropdown = useCallback(() => {
    const button = buttonRef.current
    if (!button) return
    const rect = button.getBoundingClientRect()
    const width = Math.min(360, window.innerWidth - 24)
    const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))
    setDropdownStyle({
      position: 'fixed',
      top: `${rect.bottom + 10}px`,
      left: `${left}px`,
      right: 'auto',
      width: `${width}px`,
    })
  }, [])

  useLayoutEffect(() => {
    if (!isOpen) return undefined

    function handlePointerDown(event) {
      if (wrapRef.current?.contains(event.target)) return
      if (dropdownRef.current?.contains(event.target)) return
      setIsOpen(false)
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    placeDropdown()
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', placeDropdown)
    window.addEventListener('scroll', placeDropdown, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', placeDropdown)
      window.removeEventListener('scroll', placeDropdown, true)
    }
  }, [isOpen, placeDropdown])

  return (
    <div className="notification-bell-wrap" ref={wrapRef}>
      <button
        ref={buttonRef}
        className="notification-bell"
        type="button"
        aria-label="Notifications"
        title="Notifications"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation()
          if (!isOpen) placeDropdown()
          setIsOpen((current) => !current)
        }}
      >
        <Bell aria-hidden="true" />
        <span>Notifications</span>
        {unreadCount > 0 ? <strong>{unreadCount}</strong> : null}
      </button>
      {isOpen ? createPortal(
        <div ref={dropdownRef} className="notification-dropdown-scroll-shell" style={dropdownStyle}>
          <NotificationDropdown
            notifications={notifications}
            onMarkAllRead={markAllRead}
            onMarkRead={markRead}
          />
        </div>,
        document.body,
      ) : null}
    </div>
  )
}
