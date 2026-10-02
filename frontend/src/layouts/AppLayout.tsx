import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { alertsApi } from '../api/client';
import {
  Shield,
  LayoutDashboard,
  Radio,
  CreditCard,
  Search,
  FileSpreadsheet,
  AlertTriangle,
  FolderKanban,
  BarChart3,
  Cpu,
  Database,
  Activity,
  Bot,
  Users,
  FileText,
  Settings,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  Bell,
  Coins,
  Sun,
  Moon,
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, logout, isAdmin, isAnalyst } = useAuth();
  const { theme, toggleTheme, currency } = usePreferences();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alertCount, setAlertCount] = useState<number>(6); // default to realistic counter like screenshot
  const [quickSearch, setQuickSearch] = useState('');

  useEffect(() => {
    let isMounted = true;
    if (isAnalyst) {
      alertsApi
        .getAlerts({ page: 1, page_size: 1, status: 'NEW' })
        .then((res) => {
          if (isMounted && typeof res.total === 'number') {
            setAlertCount(res.total);
          }
        })
        .catch(() => {
          // Fallback
        });
    }

    return () => {
      isMounted = false;
    };
  }, [location.pathname, isAnalyst]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSearch.trim()) return;
    navigate(`/transactions?search=${encodeURIComponent(quickSearch.trim())}`);
    setQuickSearch('');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'AU';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Main operational navigation matching PolicyLens visual hierarchy
  const primaryNavItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Financial Data', path: '/transactions', icon: CreditCard },
    { label: 'Anomaly Detection', path: '/analyze', icon: Search },
    { label: 'Risk Insights', path: '/analytics', icon: BarChart3 },
    ...(isAnalyst
      ? [
          { label: 'Cases', path: '/investigations', icon: FolderKanban },
          { label: 'Alerts', path: '/alerts', icon: AlertTriangle, badgeCount: alertCount },
        ]
      : []),
    { label: 'Live Stream', path: '/live-monitor', icon: Radio, isLive: true },
    { label: 'Batch Analysis', path: '/batch-analysis', icon: FileSpreadsheet },
  ];

  // MLOps & Model Governance (Analyst & Admin)
  const mlopsNavItems = [
    { label: 'Models & Reports', path: '/models', icon: Cpu },
    { label: 'System Health', path: '/monitoring', icon: Activity },
  ];

  // Governance & Admin navigation (Admin only)
  const adminNavItems = [
    { label: 'Datasets', path: '/datasets', icon: Database },
    { label: 'Administration', path: '/admin/users', icon: Users },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: FileText },
  ];

  return (
    <div className="flex min-h-screen bg-[#faf9f5] dark:bg-[#111413] text-[#191c1d] dark:text-[#f0f3f1] font-sans antialiased transition-colors duration-150">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] select-none shrink-0">
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-[#e8e6df] dark:border-[#272d29] px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1b4332] text-white shadow-xs">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-serif text-base font-bold tracking-tight text-[#191c1d] dark:text-white leading-tight">
              FraudGuard
            </div>
            <div className="text-[9px] font-bold tracking-wider text-[#78716c] dark:text-[#9aa19d] uppercase">
              FINANCIAL RISK INTELLIGENCE
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 space-y-5 px-3 py-4 overflow-y-auto">
          <div className="space-y-1">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path));

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#ebf3ef] text-[#164e3f] font-semibold dark:bg-[#1a382c] dark:text-[#a7f3d0]'
                      : 'text-[#525252] dark:text-[#9aa19d] hover:bg-[#f5f4ef] dark:hover:bg-[#1b221f] hover:text-[#191c1d] dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 transition-colors ${
                        isActive
                          ? 'text-[#164e3f] dark:text-[#a7f3d0]'
                          : 'text-[#78716c] dark:text-[#6e7571] group-hover:text-[#191c1d] dark:group-hover:text-white'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.isLive && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                    )}
                    {Boolean(item.badgeCount && item.badgeCount > 0) && (
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                          isActive
                            ? 'bg-[#164e3f] text-white dark:bg-[#a7f3d0] dark:text-[#164e3f]'
                            : 'bg-[#f0ede6] dark:bg-[#272d29] text-[#525252] dark:text-[#a3a3a3]'
                        }`}
                      >
                        {item.badgeCount}
                      </span>
                    )}
                  </div>
                </NavLink>
              );
            })}
          </div>

          {/* MLOps & Model Governance */}
          {isAnalyst && (
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#78716c] dark:text-[#6e7571]">
                Intelligence
              </div>
              <div className="space-y-1">
                {mlopsNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    location.pathname === item.path ||
                    (item.path !== '/' && location.pathname.startsWith(item.path));

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={`group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-[#ebf3ef] text-[#164e3f] font-semibold dark:bg-[#1a382c] dark:text-[#a7f3d0]'
                          : 'text-[#525252] dark:text-[#9aa19d] hover:bg-[#f5f4ef] dark:hover:bg-[#1b221f] hover:text-[#191c1d] dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`h-4 w-4 transition-colors ${
                            isActive
                              ? 'text-[#164e3f] dark:text-[#a7f3d0]'
                              : 'text-[#78716c] dark:text-[#6e7571] group-hover:text-[#191c1d] dark:group-hover:text-white'
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          )}

          {/* Admin & Governance Section */}
          {isAdmin && (
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#78716c] dark:text-[#6e7571]">
                Administration
              </div>
              <div className="space-y-1">
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    location.pathname === item.path ||
                    (item.path !== '/' && location.pathname.startsWith(item.path));

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={`group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-[#ebf3ef] text-[#164e3f] font-semibold dark:bg-[#1a382c] dark:text-[#a7f3d0]'
                          : 'text-[#525252] dark:text-[#9aa19d] hover:bg-[#f5f4ef] dark:hover:bg-[#1b221f] hover:text-[#191c1d] dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`h-4 w-4 transition-colors ${
                            isActive
                              ? 'text-[#164e3f] dark:text-[#a7f3d0]'
                              : 'text-[#78716c] dark:text-[#6e7571] group-hover:text-[#191c1d] dark:group-hover:text-white'
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          )}

          {/* Settings & Preferences Nav */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#78716c] dark:text-[#6e7571]">
              System
            </div>
            <div className="space-y-1">
              <NavLink
                to="/settings"
                className={`group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  location.pathname === '/settings'
                    ? 'bg-[#ebf3ef] text-[#164e3f] font-semibold dark:bg-[#1a382c] dark:text-[#a7f3d0]'
                    : 'text-[#525252] dark:text-[#9aa19d] hover:bg-[#f5f4ef] dark:hover:bg-[#1b221f] hover:text-[#191c1d] dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Settings
                    className={`h-4 w-4 transition-colors ${
                      location.pathname === '/settings'
                        ? 'text-[#164e3f] dark:text-[#a7f3d0]'
                        : 'text-[#78716c] dark:text-[#6e7571] group-hover:text-[#191c1d] dark:group-hover:text-white'
                    }`}
                  />
                  <span>Settings</span>
                </div>
              </NavLink>

              {isAnalyst && (
                <NavLink
                  to="/copilot"
                  className={`group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    location.pathname === '/copilot'
                      ? 'bg-[#ebf3ef] text-[#164e3f] font-semibold dark:bg-[#1a382c] dark:text-[#a7f3d0]'
                      : 'text-[#525252] dark:text-[#9aa19d] hover:bg-[#f5f4ef] dark:hover:bg-[#1b221f] hover:text-[#191c1d] dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Bot
                      className={`h-4 w-4 transition-colors ${
                        location.pathname === '/copilot'
                          ? 'text-[#164e3f] dark:text-[#a7f3d0]'
                          : 'text-[#78716c] dark:text-[#6e7571] group-hover:text-[#191c1d] dark:group-hover:text-white'
                      }`}
                    />
                    <span>Analyst Copilot</span>
                  </div>
                </NavLink>
              )}
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar matching PolicyLens */}
        <header className="flex h-16 items-center justify-between border-b border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#171b19] px-4 sm:px-6 gap-4">
          <div className="flex items-center gap-4 flex-1">
            {/* Mobile Hamburger / Desktop Collapse Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-[#525252] dark:text-[#9aa19d] hover:bg-[#eae8e1] dark:hover:bg-[#272d29] transition-colors"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Prominent PolicyLens Search Bar */}
            <form onSubmit={handleQuickSearchSubmit} className="relative flex-1 max-w-lg hidden sm:block">
              <Search className="h-4 w-4 text-[#8a8a86] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder="Search records, cases, or regions..."
                className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#f3f2ee] dark:bg-[#121514] pl-9 pr-4 py-2 text-xs text-[#191c1d] dark:text-[#f0f3f1] placeholder-[#8a8a86] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
              />
            </form>
          </div>

          {/* Right Action Center */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Currency Pill */}
            <div
              title={`Active currency: ${currency}`}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#1a1f1d] text-xs text-[#525252] dark:text-[#9aa19d]"
            >
              <Coins className="h-3.5 w-3.5 text-[#1b4332] dark:text-[#a7f3d0]" />
              <span>{currency}</span>
            </div>

            {/* Notification Bell with Badge */}
            <Link
              to="/alerts"
              title="Alert review queue"
              className="relative p-2 text-[#525252] dark:text-[#9aa19d] hover:text-[#191c1d] dark:hover:text-white rounded-lg hover:bg-[#eae8e1] dark:hover:bg-[#272d29] transition-colors"
            >
              <Bell className="h-4 w-4" />
              {alertCount > 0 && (
                <span className="absolute 1 top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow-xs">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </Link>

            {/* Theme Toggle (Light / Dark) */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              className="p-2 text-[#525252] dark:text-[#9aa19d] hover:text-[#191c1d] dark:hover:text-white rounded-lg hover:bg-[#eae8e1] dark:hover:bg-[#272d29] transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-[#525252]" />
              )}
            </button>

            {/* User Profile Pill matching PolicyLens Topbar */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-[#e8e6df] dark:border-[#272d29]">
              <Link
                to="/profile"
                className="flex items-center gap-2.5 group"
                title="View user profile"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e6e3dc] dark:bg-[#2a322e] text-[#292524] dark:text-[#e5e7eb] text-xs font-semibold">
                  {getInitials(user?.full_name)}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-[#191c1d] dark:text-white leading-tight group-hover:text-[#1b4332] dark:group-hover:text-[#a7f3d0] transition-colors">
                    {user?.full_name || 'Admin User'}
                  </span>
                  <span className="text-[10px] font-semibold tracking-wider text-[#737373] dark:text-[#9aa19d] uppercase leading-tight">
                    {user?.role || 'ADMIN'}
                  </span>
                </div>
              </Link>

              {/* Logout Arrow Icon */}
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-1.5 text-[#737373] dark:text-[#9aa19d] hover:text-rose-600 rounded transition-colors ml-1"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-stone-900/60"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative flex w-64 flex-col bg-white dark:bg-[#171b19] border-r border-[#e8e6df] dark:border-[#272d29] p-4">
              <div className="flex items-center justify-between pb-4 border-b border-[#e8e6df] dark:border-[#272d29]">
                <div className="font-bold text-sm tracking-tight text-[#191c1d] dark:text-white flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1b4332] text-white">
                    <Shield className="h-4 w-4" />
                  </div>
                  <span className="font-serif">FraudGuard</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded p-1 text-[#525252] hover:text-[#191c1d]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="mt-4 flex-1 space-y-1 overflow-y-auto">
                {primaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-[#ebf3ef] text-[#164e3f] font-semibold dark:bg-[#1a382c] dark:text-[#a7f3d0]'
                          : 'text-[#525252] dark:text-[#9aa19d] hover:bg-[#f5f4ef] dark:hover:bg-[#1b221f]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}

                {isAdmin && (
                  <>
                    <div className="pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#78716c]">
                      Administration
                    </div>
                    {adminNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-[#ebf3ef] text-[#164e3f] font-semibold dark:bg-[#1a382c] dark:text-[#a7f3d0]'
                              : 'text-[#525252] dark:text-[#9aa19d] hover:bg-[#f5f4ef] dark:hover:bg-[#1b221f]'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </>
                )}
              </nav>

              <div className="border-t border-[#e8e6df] dark:border-[#272d29] pt-3 space-y-1">
                <Link
                  to="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-[#525252] hover:bg-[#f5f4ef] rounded-lg"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 rounded-lg p-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Content Viewport with warm paper background */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#faf9f5] dark:bg-[#111413]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
