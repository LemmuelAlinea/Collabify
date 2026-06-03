import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  BarChart3,
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
        { to: '/student/tasks', label: 'Tasks' },
        { to: '/student/tasks/ai-planner', label: 'AI Planner', isChild: true },
        { to: '/student/reassignments', label: 'Reassignments' },
        { to: '/student/messages', label: 'Messages' },
      ],
    },
    {
      title: 'Insights',
      items: [
        { to: '/student/progress', label: 'Progress' },
        { to: '/student/contributions', label: 'Contributions' },
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
        { to: '/professor/tasks', label: 'Tasks' },
        { to: '/professor/tasks/ai-planner', label: 'AI Planner', isChild: true },
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
        { to: '/professor/contributions', label: 'Contributions' },
        { to: '/professor/health', label: 'Project Health' },
      ],
    },
  ],
}

function SidebarIcon({ label }) {
  const Icon = navIcons[label] ?? LayoutDashboard
  return <Icon size={14} aria-hidden="true" />
}

export function DashboardLayout() {
  const { role, signOut } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const profilePath = role === USER_ROLES.PROFESSOR ? '/professor/profile' : '/student/profile'

  const sections = navSections[role] ?? []

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
                <NavLink key={item.to} to={item.to} title={item.label} className={item.isChild ? 'sidebar-sub-item' : ''}>
                  <span><SidebarIcon label={item.label} /></span>
                  <strong>{item.label}</strong>
                </NavLink>
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
                <NavLink key={item.to} to={item.to} className={item.isChild ? 'sidebar-sub-item' : ''} onClick={() => setIsMobileMenuOpen(false)}>
                  <span><SidebarIcon label={item.label} /></span>
                  <strong>{item.label}</strong>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <button className="sidebar-logout" type="button" onClick={signOut}>
          <span><LogOut size={14} aria-hidden="true" /></span>
          <strong>Logout</strong>
        </button>
      </aside>
      <main className="dashboard-content">
        <header className="desktop-app-bar">
        <div className="topbar-actions">
          <NotificationBell />
          <NavLink to={profilePath} className="topbar-profile-button" aria-label="Profiles" title="Profiles">
            <UserRound size={18} aria-hidden="true" />
          </NavLink>
        </div>
      </header>
        <Outlet />
      </main>
    </div>
  )
}
