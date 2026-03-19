import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Columns3, Clock, BarChart3, Users,
  LogOut, ChevronLeft, ChevronRight, Bell, Activity,
  CalendarClock, Umbrella, IndianRupee, Settings
} from 'lucide-react';
import { format } from 'date-fns';
import GlobalSearch from './GlobalSearch';
import InitialsAvatar from './InitialsAvatar';
import { useState, useEffect } from 'react';
import ChatBot from './ChatBot';
import SettingsModal from './SettingsModal';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/kanban', label: 'Kanban Board', icon: Columns3 },
  { path: '/timelog', label: 'Time Log', icon: Clock },
  { path: '/shifts', label: 'Shifts & Attendance', icon: CalendarClock },
  { path: '/leaves', label: 'Leave Management', icon: Umbrella },
  { path: '/reports', label: 'Reports & MBR', icon: BarChart3 },
  { path: '/salary', label: 'Salary Management', icon: IndianRupee },
  { path: '/activity-log', label: 'Activity Log', icon: Activity },
];

const ADMIN_NAV = { path: '/team', label: 'Team', icon: Users };

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/kanban': 'Kanban Board',
  '/timelog': 'Time Log',
  '/reports': 'Reports & MBR',
  '/salary': 'Salary Management',
  '/activity-log': 'Activity Log',
  '/shifts': 'Shifts & Attendance',
  '/leaves': 'Leave Management',
  '/team': 'Team Management',
};

export default function Layout({ children, tickets = [], onSelectTicket, overdueCount = 0 }) {
  const { userDoc, logout, isAdmin, isModerator, isDesigner } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const handleResize = () => setCollapsed(window.innerWidth < 1280);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = isAdmin ? [...NAV_ITEMS, ADMIN_NAV] : NAV_ITEMS;
  const pageTitle = PAGE_TITLES[location.pathname] || 'Dashboard';
  const sidebarWidth = collapsed ? 68 : 240;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ───── Sidebar ───── */}
      <aside style={{
        width: sidebarWidth,
        flexShrink: 0,
        background: '#1A1A2E',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 50,
        transition: 'width 0.25s ease',
        overflow: 'hidden',
      }}>
        {/* Logo area */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}>
          {collapsed ? (
            /* Collapsed: Indeed "i" with arc icon */
            <img
              src="/indeed-icon.svg"
              alt="Indeed"
              style={{ width: 28, height: 28 }}
            />
          ) : (
            /* Expanded: Logo + Tracker centered vertically */
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <img
                src="/indeed-logo.svg"
                alt="Indeed"
                style={{ height: 22, filter: 'brightness(0) invert(1)' }}
              />
              <div style={{
                width: 1, height: 20,
                background: 'rgba(255,255,255,0.15)',
              }} />
              <span style={{
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 600,
                fontSize: 12,
                color: 'rgba(255,255,255,0.6)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}>
                Tracker
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  gap: 12,
                  padding: collapsed ? '11px 0' : '11px 20px',
                  margin: collapsed ? '2px 8px' : '2px 10px',
                  borderRadius: 10,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  fontFamily: '"Poppins", sans-serif',
                  color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
                  background: isActive ? '#2557A7' : 'transparent',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
                  }
                }}
              >
                <Icon size={18} />
                {!collapsed && item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 8, margin: '0 12px 10px',
            background: 'rgba(255,255,255,0.06)', border: 'none',
            borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* User section */}
        <div style={{
          padding: collapsed ? '14px 0' : '14px 16px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 10,
        }}>
          <InitialsAvatar
            name={userDoc?.name}
            size={34}
            bg="#2557A7"
            color="#fff"
          />
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: '#fff',
                fontFamily: '"Poppins", sans-serif',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {userDoc?.name}
              </div>
              <span style={{
                fontSize: 10, padding: '1px 8px', borderRadius: 20,
                background: userDoc?.roles?.includes('admin') ? 'rgba(37,87,167,0.3)' : 'rgba(255,255,255,0.1)',
                color: userDoc?.roles?.includes('admin') ? '#8ABAFF' : 'rgba(255,255,255,0.5)',
                fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {userDoc?.role}
              </span>
            </div>
          )}
          {!collapsed && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => setShowSettings(true)}
                title="Settings"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 6, display: 'flex', borderRadius: 6,
                  color: 'rgba(255,255,255,0.4)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                }}
              >
                <Settings size={16} />
              </button>
              <button
                onClick={logout}
                title="Logout"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 6, display: 'flex', borderRadius: 6,
                  color: 'rgba(255,255,255,0.4)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(220,38,38,0.15)';
                  e.currentTarget.style.color = '#FF6B6B';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ───── Main content ───── */}
      <div style={{ flex: 1, marginLeft: sidebarWidth, transition: 'margin-left 0.25s ease' }}>
        {/* Header */}
        <header style={{
          height: 64,
          background: '#FFFFFF',
          borderBottom: '1px solid #D4D2D0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          position: 'sticky',
          top: 0, zIndex: 40,
        }}>
          <h1 style={{
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 700, fontSize: 20,
            color: '#1A1A2E', margin: 0,
            letterSpacing: '-0.01em',
          }}>
            {pageTitle}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 13, color: '#767676', fontWeight: 500 }}>
              {format(new Date(), 'EEE, dd MMM yyyy')}
            </span>
            <GlobalSearch tickets={tickets} onSelectTicket={onSelectTicket} />
          </div>
        </header>

        {/* Page content */}
        <main style={{ padding: 32, minHeight: 'calc(100vh - 64px)' }}>
          {children}
        </main>
      </div>

      {/* AI Help Bot */}
      <ChatBot />

      {/* Settings Modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
