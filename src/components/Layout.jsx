import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Columns3, Clock, BarChart3, Users,
  LogOut, ChevronLeft, ChevronRight, Bell, Activity,
  CalendarClock, Umbrella, IndianRupee, Settings,
  MessageSquare, Shield, Search
} from 'lucide-react';
import { format } from 'date-fns';
import GlobalSearch from './GlobalSearch';
import InitialsAvatar from './InitialsAvatar';
import { useState, useEffect } from 'react';
import ChatBot from './ChatBot';
import SettingsModal from './SettingsModal';

const MENU_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/kanban', label: 'Ticket Tracker', icon: Columns3 },
  { path: '/timelog', label: 'Time Log', icon: Clock },
  { path: '/reports', label: 'Reports & MBR', icon: BarChart3 },
  { path: '/activity-log', label: 'Activity Log', icon: Activity },
];

// Support items intentionally left empty — Integrations removed per user request

const ADMIN_NAV = { path: '/team', label: 'Team Accounts', icon: Users };

const PAGE_TITLES = {
  '/': 'Overview',
  '/kanban': 'Ticket Management',
  '/timelog': 'Time Entries',
  '/reports': 'Analytics & Reports',
  '/salary': 'Salary Details',
  '/activity-log': 'System Activity',
  '/shifts': 'Shifts & Roster',
  '/leaves': 'Leaves & Approvals',
  '/team': 'Team Administration',
};

export default function Layout({ children, tickets = [], onSelectTicket, overdueCount = 0 }) {
  const { userDoc, logout, isAdmin, isModerator } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const handleResize = () => setCollapsed(window.innerWidth < 1280);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = isAdmin ? [...MENU_ITEMS, ADMIN_NAV] : MENU_ITEMS;
  const pageTitle = PAGE_TITLES[location.pathname] || 'Dashboard';
  const sidebarWidth = collapsed ? 80 : 260;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
      {/* ───── Sidebar ───── */}
      <aside style={{
        width: sidebarWidth,
        flexShrink: 0,
        background: 'var(--color-sidebar)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 50,
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}>
        {/* Logo area */}
        <div style={{
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 24px',
          flexShrink: 0,
        }}>
          {collapsed ? (
            <img src="/indeed-icon.svg" alt="Indeed" style={{ width: 32, height: 32 }} />
          ) : (
            <img src="/indeed-logo-white.svg" alt="Indeed" style={{ height: 28, objectFit: 'contain' }} />
          )}
        </div>

        {/* Navigation */}
        <div style={{ flex: 1, padding: collapsed ? '12px 8px' : '12px 20px', overflowY: 'auto' }}>
          
          {!collapsed && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-secondary-text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, marginTop: 8, paddingLeft: 12 }}>Menu</div>}
          
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {menuItems.map((item) => {
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
                    gap: 14,
                    padding: collapsed ? '12px 0' : '12px 16px',
                    borderRadius: 12,
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 500,
                    fontFamily: '"Inter", sans-serif',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-secondary-text)',
                    background: isActive ? 'var(--color-sidebar-active)' : 'transparent',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.background = 'var(--color-sidebar-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--color-secondary-text)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} style={{ color: isActive ? 'var(--color-primary)' : 'inherit' }} />
                  {!collapsed && item.label}
                  {isActive && !collapsed && (
                    <div style={{ position: 'absolute', right: 8, width: 4, height: 20, background: 'var(--color-primary)', borderRadius: 4, boxShadow: 'var(--shadow-glow)' }} />
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div style={{ margin: '32px 0 16px', height: 1, background: 'var(--color-border)', opacity: 0.5 }} />

          {!collapsed && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-secondary-text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, paddingLeft: 12 }}>Support</div>}

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              onClick={() => setShowSettings(true)}
              title={collapsed ? "Settings" : undefined}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
                gap: 14, padding: collapsed ? '12px 0' : '12px 16px', borderRadius: 12, cursor: 'pointer',
                border: 'none', background: 'transparent',
                fontSize: 14, fontWeight: 500, fontFamily: '"Inter", sans-serif', color: 'var(--color-secondary-text)',
                transition: 'all 0.2s', whiteSpace: 'nowrap', width: '100%', textAlign: 'left'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'var(--color-sidebar-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-secondary-text)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <Settings size={20} /> {!collapsed && "Settings"}
            </button>

          </nav>

        </div>



        {/* User / Collapse Section */}
        <div style={{
          padding: collapsed ? '16px 0' : '16px 20px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
              <InitialsAvatar name={userDoc?.name} size={36} bg="var(--color-surface)" color="#fff" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userDoc?.name || 'User'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-secondary-text)' }}>
                  {userDoc?.roles?.includes('admin') ? 'Administrator' : 'Team Member'}
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={() => setCollapsed(!collapsed)}
            title="Toggle Sidebar"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 8, cursor: 'pointer', color: 'var(--color-secondary-text)',
              transition: 'all 0.2s', flexShrink: 0
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-secondary-text)'; e.currentTarget.style.background = 'var(--color-surface)'; }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>

      {/* ───── Main content ───── */}
      <div style={{ flex: 1, marginLeft: sidebarWidth, transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header / TopNav */}
        <header style={{
          height: 80,
          background: 'var(--color-background)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          position: 'sticky',
          top: 0, zIndex: 40,
        }}>
          {/* Left space for page title usually, but reference puts search here or title */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
             {/* Modern Search Bar */}
             <div style={{ 
               display: 'flex', alignItems: 'center', background: 'var(--color-surface)', 
               border: '1px solid var(--color-border)', borderRadius: 12, padding: '8px 16px', width: 360,
               transition: 'border-color 0.2s'
             }} className="hover:border-[var(--color-primary)]">
               <Search size={18} color="var(--color-secondary-text)" />
               <input 
                 type="text" 
                 placeholder="Search tickets, reports or users..." 
                 style={{ border: 'none', background: 'transparent', outline: 'none', color: '#fff', fontSize: 14, marginLeft: 12, width: '100%' }}
                 onChange={() => {}} /* Placeholder for actual global search integration */
               />
               <div style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '2px 6px', fontSize: 10, color: 'var(--color-secondary-text)', fontWeight: 600 }}>Ctrl+K</div>
             </div>
          </div>

          {/* Right Area: Icons + Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button style={{ position: 'relative', background: 'var(--color-surface)', border: '1px solid var(--color-border)', width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-secondary-text)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--color-secondary-text)'}>
                <Bell size={20} />
                <div style={{ position: 'absolute', top: 10, right: 12, width: 8, height: 8, background: 'var(--color-error)', borderRadius: '50%', border: '2px solid var(--color-surface)' }} />
              </button>
              <button style={{ position: 'relative', background: 'var(--color-surface)', border: '1px solid var(--color-border)', width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-secondary-text)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--color-secondary-text)'}>
                <MessageSquare size={20} />
              </button>
            </div>
            
            <div style={{ width: 1, height: 24, background: 'var(--color-border)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={logout} title="Click to logout">
              <InitialsAvatar name={userDoc?.name} size={44} bg="var(--color-surface)" color="#fff" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{userDoc?.name?.split(' ')[0] || 'User'}</span>
                <span style={{ fontSize: 12, color: 'var(--color-secondary-text)' }}>Workspace</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ padding: '0 40px 40px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header Title moved inside main area for better hierarchy */}
          <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 28, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                {pageTitle}
              </h1>
              <p style={{ margin: 0, color: 'var(--color-secondary-text)', fontSize: 14 }}>
                Welcome back to your workspace. Here is what's happening today.
              </p>
            </div>
          </div>
          
          <div style={{ flex: 1 }}>
            {children}
          </div>
        </main>
      </div>

      {/* AI Help Bot */}
      <ChatBot />

      {/* Settings Modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
