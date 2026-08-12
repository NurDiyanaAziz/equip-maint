'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Wrench, ClipboardList, CalendarCheck,
  BarChart3, Settings, Cpu, ChevronLeft, ChevronRight, LogOut, Menu, X,
} from 'lucide-react';
import './globals.css';

const PROTECTED_PREFIXES = ['/dashboard', '/equipment', '/tickets', '/preventive', '/reports', '/settings'];

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/equipment', label: 'Equipment Registry', icon: Wrench },
  { href: '/tickets', label: 'Defect Tickets', icon: ClipboardList },
  { href: '/preventive', label: 'Preventive Maintenance', icon: CalendarCheck },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function RootLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [user, setUser] = useState(null);
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === '/login';
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname?.startsWith(p + '/'));

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('equip-maint-token');
    const storedUser = localStorage.getItem('equip-maint-user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (!token && isProtected) {
      router.replace('/login');
    }
  }, [pathname, isProtected, router]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' | ' +
        now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('equip-maint-token');
    localStorage.removeItem('equip-maint-user');
    setUser(null);
    router.replace('/login');
  };

  const displayName = user ? user.name : 'Diyana Aziz';
  const displayRole = user ? user.role.replace(/_/g, ' ') : 'System Admin';
  const initials = displayName.split(' ').map((n) => n[0]).join('').toUpperCase();

  return (
    <html lang="en" className="dark">
      <body>
        {isLoginPage ? (
          <main>{children}</main>
        ) : (
        <div className="flex h-screen overflow-hidden">

          {/* Mobile sidebar backdrop */}
          {mobileOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
          )}

          {/* SIDEBAR */}
          <aside
            className={`flex flex-col bg-surface-card border-r border-surface-border transition-all duration-300 z-50
              ${mobileOpen ? 'fixed inset-y-0 left-0 w-60' : 'hidden lg:flex lg:w-60'}
              ${!mobileOpen && collapsed ? 'lg:w-16' : ''}
            `}
          >
            {/* Logo */}
            <div className="flex items-center gap-2 px-4 h-16 border-b border-surface-border">
              <Cpu className="w-6 h-6 text-accent-blue shrink-0" />
              {!collapsed && (
                <span className="text-lg font-bold tracking-tight text-text-primary whitespace-nowrap">
                  EQUIP-MAINT
                </span>
              )}
            </div>

            {/* Nav Links */}
            <nav className="flex-1 py-4 space-y-1 px-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 ${
                      isActive
                        ? 'bg-accent-blue/15 text-accent-blue'
                        : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </nav>

            {/* Collapse toggle — desktop only */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex items-center justify-center h-10 m-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </aside>

          {/* MAIN CONTENT */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* TOP HEADER */}
            <header className="flex items-center justify-between h-16 px-4 lg:px-6 bg-surface-card border-b border-surface-border shrink-0 gap-3">
              <button
                className="lg:hidden p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm lg:text-lg font-semibold text-text-primary truncate">
                  Shop Floor Equipment Maintenance & Defect Tracker
                </h1>
              </div>
              <div className="flex items-center gap-3 lg:gap-6 text-sm text-text-secondary shrink-0">
                <span className="hidden sm:inline">{currentTime}</span>
                <div className="flex items-center gap-2 pl-3 lg:pl-4 border-l border-surface-border">
                  <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue text-xs font-bold shrink-0">
                    {initials}
                  </div>
                  <span className="hidden md:inline text-text-primary font-medium">{displayName}</span>
                  <span className="hidden md:inline text-text-muted text-xs bg-surface-elevated px-2 py-0.5 rounded">
                    {displayRole}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-400/10 transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </header>

            {/* PAGE CONTENT */}
            <main className="flex-1 overflow-y-auto p-4 lg:p-6">
              {children}
            </main>
          </div>
        </div>
        )}
      </body>
    </html>
  );
}
