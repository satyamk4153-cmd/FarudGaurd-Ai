import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { adminApi } from '../api/client';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { AdminStats, AdminUser, AuditLog } from '../types';
import {
  Users,
  ShieldAlert,
  FileText,
  Database,
  CheckCircle2,
  XCircle,
  Search,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { formatNumber } from '../utils/formatters';

export const AdminPage: React.FC = () => {
  const location = useLocation();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>(
    location.pathname.includes('audit') ? 'audit' : 'users'
  );
  const [message, setMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Audit search & pagination
  const [auditSearch, setAuditSearch] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize] = useState(15);
  const [auditTotal, setAuditTotal] = useState(0);

  const fetchAdminData = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const [statsRes, usersRes, auditRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers(),
        adminApi.getAuditLogs({ page: auditPage, page_size: auditPageSize }),
      ]);
      setStats(statsRes);
      setUsers(usersRes);
      setAuditLogs(auditRes.items);
      setAuditTotal(auditRes.total);
    } catch (err: any) {
      console.error('Failed to load admin console', err);
      const detail = err.response?.data?.detail;
      if (err.response?.status === 403 || err.response?.status === 401) {
        setAuthError(detail || 'System administration is restricted to Administrators.');
      } else {
        setAuthError(detail || 'Unable to connect to administration service.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setAuthError(null);
      try {
        const [statsRes, usersRes, auditRes] = await Promise.all([
          adminApi.getStats(),
          adminApi.getUsers(),
          adminApi.getAuditLogs({ page: auditPage, page_size: auditPageSize }),
        ]);
        if (!isMounted) return;
        setStats(statsRes);
        setUsers(usersRes);
        setAuditLogs(auditRes.items);
        setAuditTotal(auditRes.total);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Failed to load admin console', err);
        const detail = err.response?.data?.detail;
        if (err.response?.status === 403 || err.response?.status === 401) {
          setAuthError(detail || 'System administration is restricted to Administrators.');
        } else {
          setAuthError(detail || 'Unable to connect to administration service.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [auditPage]);

  // Synchronize tab if route changes
  useEffect(() => {
    if (location.pathname.includes('audit')) {
      setActiveTab('audit');
    } else if (location.pathname.includes('users')) {
      setActiveTab('users');
    }
  }, [location.pathname]);

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await adminApi.updateUserRole(userId, newRole);
      setMessage(`Updated role for user #${userId} to ${newRole}`);
      fetchAdminData();
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to update user role.');
    }
  };

  const handleToggleActive = async (userId: number, currentActive: boolean) => {
    try {
      await adminApi.updateUserStatus(userId, !currentActive);
      setMessage(`User #${userId} status set to ${!currentActive ? 'Active' : 'Disabled'}`);
      fetchAdminData();
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to update user status.');
    }
  };

  if (loading && !stats) {
    return <LoadingSpinner label="Loading administration data…" size="lg" />;
  }

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 MB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (!auditSearch) return true;
    const q = auditSearch.toLowerCase();
    return (
      log.user_email?.toLowerCase().includes(q) ||
      log.action?.toLowerCase().includes(q) ||
      log.resource_type?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration"
        subtitle="Manage user accounts, roles, and review audit logs."
      />

      {message && (
        <div className="flex items-center gap-2 rounded-xl border border-[#cde2d6] dark:border-[#204a37] bg-[#ebf3ef] dark:bg-[#153226]/50 p-4 text-xs font-semibold text-[#164e3f] dark:text-[#a7f3d0] shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#164e3f] dark:text-[#a7f3d0]" />
          <span>{message}</span>
        </div>
      )}

      {authError ? (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-[#faf9f5] dark:bg-[#1a1714] p-8 text-center shadow-xs">
          <ShieldAlert className="h-8 w-8 text-amber-600 mx-auto mb-2" />
          <h3 className="font-serif text-base font-semibold text-[#191c1d] dark:text-[#f3f4f6]">
            Administrator Access Required
          </h3>
          <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mt-1 max-w-md mx-auto">
            {authError}
          </p>
        </div>
      ) : (
        <>
          {/* Admin Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-5 shadow-xs transition-shadow hover:shadow-sm">
              <div className="flex items-center justify-between text-xs text-[#78716c] dark:text-[#9ca3af] mb-2">
                <span className="font-medium">Registered Users</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ebf3ef] dark:bg-[#1f2b24] text-[#1b4332] dark:text-[#a7f3d0]">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <span className="text-2xl font-bold font-numeric tracking-tight text-[#191c1d] dark:text-[#f3f4f6]">
                {stats?.total_users || 0}
              </span>
              <div className="mt-2 text-[11px] text-[#78716c] dark:text-[#9ca3af]">
                {stats?.active_users || 0} active accounts
              </div>
            </div>

            <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-5 shadow-xs transition-shadow hover:shadow-sm">
              <div className="flex items-center justify-between text-xs text-[#78716c] dark:text-[#9ca3af] mb-2">
                <span className="font-medium">Access Breakdown</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ebf3ef] dark:bg-[#1f2b24] text-[#1b4332] dark:text-[#a7f3d0]">
                  <ShieldAlert className="h-4 w-4" />
                </div>
              </div>
              <span className="text-xl font-bold font-numeric tracking-tight text-[#191c1d] dark:text-[#f3f4f6]">
                {stats?.analyst_count || 0} analysts · {stats?.admin_count || 0} admins
              </span>
              <div className="mt-2 text-[11px] text-[#78716c] dark:text-[#9ca3af]">
                {stats?.user_count || 0} standard users
              </div>
            </div>

            <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-5 shadow-xs transition-shadow hover:shadow-sm">
              <div className="flex items-center justify-between text-xs text-[#78716c] dark:text-[#9ca3af] mb-2">
                <span className="font-medium">Audit Trail Events</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ebf3ef] dark:bg-[#1f2b24] text-[#1b4332] dark:text-[#a7f3d0]">
                  <FileText className="h-4 w-4" />
                </div>
              </div>
              <span className="text-2xl font-bold font-numeric tracking-tight text-[#191c1d] dark:text-[#f3f4f6]">
                {formatNumber(stats?.total_audit_logs || auditTotal || 0)}
              </span>
              <div className="mt-2 text-[11px] text-[#78716c] dark:text-[#9ca3af]">Immutable compliance events</div>
            </div>

            <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-5 shadow-xs transition-shadow hover:shadow-sm">
              <div className="flex items-center justify-between text-xs text-[#78716c] dark:text-[#9ca3af] mb-2">
                <span className="font-medium">Database Footprint</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ebf3ef] dark:bg-[#1f2b24] text-[#1b4332] dark:text-[#a7f3d0]">
                  <Database className="h-4 w-4" />
                </div>
              </div>
              <span className="text-2xl font-bold font-numeric tracking-tight text-[#191c1d] dark:text-[#f3f4f6]">
                {formatBytes(stats?.database_size_bytes || 0)}
              </span>
              <div className="mt-2 text-[11px] text-[#78716c] dark:text-[#9ca3af]">Relational storage</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#e8e6df] dark:border-[#272d29] gap-4">
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'users'
                  ? 'border-[#1b4332] text-[#1b4332] dark:border-[#a7f3d0] dark:text-[#a7f3d0]'
                  : 'border-transparent text-[#78716c] hover:text-[#191c1d] dark:hover:text-white'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`pb-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'audit'
                  ? 'border-[#1b4332] text-[#1b4332] dark:border-[#a7f3d0] dark:text-[#a7f3d0]'
                  : 'border-transparent text-[#78716c] hover:text-[#191c1d] dark:hover:text-white'
              }`}
            >
              Audit logs ({formatNumber(auditTotal)})
            </button>
          </div>

          {/* User Accounts Tab */}
          {activeTab === 'users' && (
            <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5]/60 dark:bg-[#141816]/60 text-[#78716c] dark:text-[#9ca3af]">
                    <tr>
                      <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">User</th>
                      <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">Email</th>
                      <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">Role</th>
                      <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">Status</th>
                      <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">Registered</th>
                      <th className="px-5 py-3 text-right font-semibold uppercase tracking-wider text-[11px]">Change role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8e6df] dark:divide-[#272d29]">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-[#faf9f5] dark:hover:bg-[#1f2522] transition-colors">
                        <td className="px-5 py-3.5 font-medium text-[#191c1d] dark:text-[#f3f4f6]">{u.full_name}</td>
                        <td className="px-5 py-3.5 text-[#78716c] dark:text-[#9ca3af]">{u.email}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              u.role === 'ADMIN'
                                ? 'bg-[#1b4332] text-white'
                                : u.role === 'ANALYST'
                                ? 'bg-[#ebf3ef] dark:bg-[#1a382c] border border-[#cde2d6] dark:border-[#234e3e] text-[#164e3f] dark:text-[#a7f3d0]'
                                : 'bg-[#faf9f5] dark:bg-[#202623] border border-[#e8e6df] dark:border-[#38423d] text-[#78716c] dark:text-[#9ca3af]'
                            }`}
                          >
                            {u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1).toLowerCase() : 'User'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => handleToggleActive(u.id, u.is_active)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs border font-medium transition-colors ${
                              u.is_active
                                ? 'border-[#cde2d6] dark:border-[#234e3e] bg-[#ebf3ef] dark:bg-[#1a382c] text-[#164e3f] dark:text-[#a7f3d0]'
                                : 'border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#171b19] text-[#78716c]'
                            }`}
                          >
                            {u.is_active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                            <span>{u.is_active ? 'Active' : 'Disabled'}</span>
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-[#78716c] dark:text-[#9ca3af] font-numeric">
                          {u.created_at?.slice(0, 10)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#141816] px-3 py-1.5 text-xs text-[#191c1d] dark:text-[#f3f4f6] focus:border-[#1b4332] focus:ring-1 focus:ring-[#1b4332] focus:outline-none transition-colors"
                          >
                            <option value="USER">User</option>
                            <option value="ANALYST">Analyst</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Security Audit Logs Tab */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-[#78716c]" />
                  <input
                    type="text"
                    placeholder="Search audit trail by actor, action, or target..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="w-full rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] pl-10 pr-4 py-2 text-xs text-[#191c1d] dark:text-[#f3f4f6] placeholder-[#78716c] focus:border-[#1b4332] focus:ring-1 focus:ring-[#1b4332] focus:outline-none transition-colors shadow-xs"
                  />
                </div>
                <div className="text-xs text-[#78716c] dark:text-[#9ca3af]">
                  Showing page {auditPage} ({filteredLogs.length} records)
                </div>
              </div>

              <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5]/60 dark:bg-[#141816]/60 text-[#78716c] dark:text-[#9ca3af]">
                      <tr>
                        <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">Timestamp</th>
                        <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">Actor</th>
                        <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">Action</th>
                        <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">Target</th>
                        <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">IP address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e8e6df] dark:divide-[#272d29]">
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-[#78716c] dark:text-[#9ca3af]">
                            No audit records found matching your query.
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-[#faf9f5] dark:hover:bg-[#1f2522] transition-colors">
                            <td className="px-5 py-3.5 text-[#78716c] dark:text-[#9ca3af] font-numeric">
                              {log.timestamp?.slice(0, 19).replace('T', ' ')}
                            </td>
                            <td className="px-5 py-3.5 text-[#191c1d] dark:text-[#f3f4f6] font-medium">
                              {log.user_email}
                            </td>
                            <td className="px-5 py-3.5 font-medium text-[#191c1d] dark:text-[#f3f4f6]">
                              {log.action}
                            </td>
                            <td className="px-5 py-3.5 text-[#78716c] dark:text-[#9ca3af]">
                              {log.resource_type}
                              {log.resource_id ? ` (#${log.resource_id})` : ''}
                            </td>
                            <td className="px-5 py-3.5 text-[#78716c] dark:text-[#9ca3af] font-mono text-[11px]">
                              {log.ip_address || '127.0.0.1'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between border-t border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#141816] px-5 py-3 text-xs">
                  <span className="text-[#78716c] dark:text-[#9ca3af]">
                    Page {auditPage} of {Math.max(1, Math.ceil(auditTotal / auditPageSize))}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                      disabled={auditPage === 1}
                      className="inline-flex items-center gap-1 rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] px-3 py-1.5 text-[#191c1d] dark:text-[#f3f4f6] hover:bg-[#faf9f5] dark:hover:bg-[#1f2522] disabled:opacity-40 transition-colors shadow-xs"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Prev</span>
                    </button>
                    <button
                      onClick={() => setAuditPage((p) => p + 1)}
                      disabled={auditPage * auditPageSize >= auditTotal}
                      className="inline-flex items-center gap-1 rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] px-3 py-1.5 text-[#191c1d] dark:text-[#f3f4f6] hover:bg-[#faf9f5] dark:hover:bg-[#1f2522] disabled:opacity-40 transition-colors shadow-xs"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
