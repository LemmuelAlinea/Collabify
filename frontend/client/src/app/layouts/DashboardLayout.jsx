import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Archive,
  BookOpen,
  Bot,
  ClipboardList,
  FolderKanban,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  LogOut,
  MessageSquare,
  ShieldAlert,
  Users,
  CircleUserRound,
  UserRound,
  Repeat2,
  ScrollText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { USER_ROLES } from '../../features/auth/constants/roles'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { NotificationBell } from '../../features/notifications/components/NotificationBell'
import { ThemeToggle } from '../providers/ThemeProvider'

const navIcons = {
  Dashboard: LayoutDashboard,
  Curriculum: ScrollText,
  Syllabi: BookOpen,
  Classes: GraduationCap,
  Projects: FolderKanban,
  Groups: Users,
  Tasks: ClipboardList,
  'AI Planner': Bot,
  Reassignments: Repeat2,
  Messages: MessageSquare,
  Progress: Gauge,
  Analytics: BarChart3,
  Contributions: LineChart,
  'Project Health': ShieldAlert,
  Archive,
  Profile: CircleUserRound,
}

const navSections = {
  [USER_ROLES.STUDENT]: [
    { title: 'Main', items: [{ to: '/student/dashboard', label: 'Dashboard' }] },
    {
      title: 'Workspace',
      items: [
        { to: '/student/classes', label: 'Classes' },
        { to: '/student/projects', label: 'Projects' },
        { to: '/student/groups', label: 'Groups' },
        {
          to: '/student/tasks',
          label: 'Tasks',
          children: [{ to: '/student/tasks/ai-planner', label: 'AI Planner' }],
        },
        { to: '/student/reassignments', label: 'Reassignments' },
        { to: '/student/messages', label: 'Messages' },
      ],
    },
    {
      title: 'Insights',
      items: [
        { to: '/student/progress', label: 'Progress' },
      ],
    },
  ],
  [USER_ROLES.PROFESSOR]: [
    { title: 'Main', items: [{ to: '/professor/dashboard', label: 'Dashboard' }] },
    {
      title: 'Workspace',
      items: [
        { to: '/professor/classes', label: 'Classes' },
        { to: '/professor/projects', label: 'Projects' },
        { to: '/professor/groups', label: 'Groups' },
        {
          to: '/professor/tasks',
          label: 'Tasks',
          children: [{ to: '/professor/tasks/ai-planner', label: 'AI Planner' }],
        },
        { to: '/professor/archive', label: 'Archive' },
        { to: '/professor/reassignments', label: 'Reassignments' },
        { to: '/professor/messages', label: 'Messages' },
      ],
    },
    {
      title: 'Course Alignment',
      items: [
        { to: '/professor/curriculum', label: 'Curriculum' },
        { to: '/professor/syllabi', label: 'Syllabi' },
      ],
    },
    {
      title: 'Insights',
      items: [
        { to: '/professor/progress', label: 'Progress' },
        { to: '/professor/analytics', label: 'Analytics' },
      ],
    },
  ],
}

function SidebarIcon({ label }) {
  const Icon = navIcons[label] ?? LayoutDashboard
  return <Icon size={14} aria-hidden="true" />
}

function buildInitialExpandedNav(sections, pathname) {
  const initial = {}
  sections.forEach((section) => {
    section.items.forEach((item) => {
      if (item.children?.some((child) => pathname.startsWith(child.to))) {
        initial[item.to] = true
      }
    })
  })
  return initial
}

function NavItem({ item, expandedNav, onToggleExpand, onNavigate }) {
  const hasChildren = Boolean(item.children?.length)

  if (!hasChildren) {
    return (
      <NavLink to={item.to} title={item.label} onClick={onNavigate}>
        <span><SidebarIcon label={item.label} /></span>
        <strong>{item.label}</strong>
      </NavLink>
    )
  }

  const isExpanded = Boolean(expandedNav[item.to])

  return (
    <div className="sidebar-nav-group">
      <div className="sidebar-nav-row">
        <NavLink to={item.to} title={item.label} onClick={onNavigate}>
          <span><SidebarIcon label={item.label} /></span>
          <strong>{item.label}</strong>
        </NavLink>
        <button
          type="button"
          className={`sidebar-expand-toggle${isExpanded ? ' is-expanded' : ''}`}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.label} submenu`}
          aria-expanded={isExpanded}
          onClick={() => onToggleExpand(item.to)}
        >
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
      {isExpanded ? item.children.map((child) => (
        <NavLink key={child.to} to={child.to} className="sidebar-sub-item" onClick={onNavigate}>
          <span><SidebarIcon label={child.label} /></span>
          <strong>{child.label}</strong>
        </NavLink>
      )) : null}
    </div>
  )
}

export function DashboardLayout() {
  const { role, signOut } = useAuth()
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isActionsCollapsed, setIsActionsCollapsed] = useState(false)
  const profilePath = role === USER_ROLES.PROFESSOR ? '/professor/profile' : '/student/profile'

  const sections = navSections[role] ?? []
  const [expandedNav, setExpandedNav] = useState(() => buildInitialExpandedNav(sections, location.pathname))

  function toggleExpandedNav(key) {
    setExpandedNav((current) => ({ ...current, [key]: !current[key] }))
  }

  return (
    <div className={`dashboard-shell ${isCollapsed ? 'is-sidebar-collapsed' : ''} ${isMobileMenuOpen ? 'is-mobile-menu-open' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src="/brand/collabify-logo.png" alt="" />
            <p className="brand-link">Collabify</p>
          </div>
          <button className="sidebar-toggle" type="button" onClick={() => setIsCollapsed((current) => !current)}>
            {isCollapsed ? <ChevronRight size={18} aria-hidden="true" /> : <ChevronLeft size={18} aria-hidden="true" />}
          </button>
        </div>
        <nav>
          {sections.map((section) => (
            <div className="sidebar-section" key={section.title}>
              <p>{section.title}</p>
              {section.items.map((item) => (
                <NavItem key={item.to} item={item} expandedNav={expandedNav} onToggleExpand={toggleExpandedNav} />
              ))}
            </div>
          ))}
        </nav>
        <button className="sidebar-logout" type="button" onClick={signOut}>
          <span><LogOut size={14} aria-hidden="true" /></span>
          <strong>Logout</strong>
        </button>
      </aside>
      <header className="mobile-app-bar">
        <button
          aria-label="Open navigation"
          className="mobile-menu-button"
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="mobile-app-brand">
          <img src="/brand/collabify-logo.png" alt="" />
          <div>
            <strong>Collabify</strong>
          </div>
        </div>
        <div className="topbar-actions">
          <NotificationBell />
          <ThemeToggle />
          <NavLink to={profilePath} className="topbar-profile-button" aria-label="Profiles" title="Profiles">
            <UserRound size={18} aria-hidden="true" />
          </NavLink>
        </div>
      </header>
      <button
        aria-label="Close navigation"
        className="mobile-sidebar-backdrop"
        type="button"
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <aside className="mobile-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src="/brand/collabify-logo.png" alt="" />
            <p className="brand-link">Collabify</p>
          </div>
          <button className="sidebar-toggle" type="button" onClick={() => setIsMobileMenuOpen(false)}>
            x
          </button>
        </div>
        <nav>
          {sections.map((section) => (
            <div className="sidebar-section" key={section.title}>
              <p>{section.title}</p>
              {section.items.map((item) => (
                <NavItem
                  key={item.to}
                  item={item}
                  expandedNav={expandedNav}
                  onToggleExpand={toggleExpandedNav}
                  onNavigate={() => setIsMobileMenuOpen(false)}
                />
              ))}
            </div>
          ))}
        </nav>
        <button className="sidebar-logout" type="button" onClick={signOut}>
          <span><LogOut size={14} aria-hidden="true" /></span>
          <strong>Logout</strong>
        </button>
      </aside>
      <div className={`desktop-floating-actions${isActionsCollapsed ? ' is-actions-collapsed' : ''}`}>
        <button
          aria-label={isActionsCollapsed ? 'Expand toolbar' : 'Collapse toolbar'}
          className="floating-actions-toggle"
          type="button"
          onClick={() => setIsActionsCollapsed((c) => !c)}
        >
          {isActionsCollapsed ? <ChevronLeft size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
        </button>
        <div className="floating-actions-items">
          <NotificationBell />
          <ThemeToggle />
          <NavLink to={profilePath} className="topbar-profile-button" aria-label="Profiles" title="Profiles">
            <UserRound size={18} aria-hidden="true" />
          </NavLink>
        </div>
      </div>
      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  )
}
