import React from 'react';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  User,
  Mail,
  Shield,
  Clock,
  Key,
  Calendar,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Profile"
        subtitle="Your account details, role permissions, and session settings."
      />

      <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[#e8e6df] dark:border-[#272d29]">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1b4332] text-white text-2xl font-bold shadow-xs">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#191c1d] dark:text-[#f3f4f6]">
                {user?.full_name || 'System Analyst'}
              </h2>
              <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mt-0.5">
                {user?.email || 'analyst@fraudguard.ai'}
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#ebf3ef] dark:bg-[#1a382c] border border-[#cde2d6] dark:border-[#234e3e] px-3 py-0.5 text-xs font-semibold text-[#164e3f] dark:text-[#a7f3d0]">
                  <Shield className="h-3.5 w-3.5" />
                  <span>{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase() : 'Analyst'}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#ebf3ef] dark:bg-[#1a382c] border border-[#cde2d6] dark:border-[#234e3e] px-3 py-0.5 text-xs font-semibold text-[#164e3f] dark:text-[#a7f3d0]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Active Session</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Credentials & Role Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-[#faf9f5] dark:bg-[#141816] border border-[#e8e6df] dark:border-[#272d29]">
            <span className="text-xs text-[#78716c] dark:text-[#9ca3af] block mb-1">
              User ID
            </span>
            <span className="text-sm font-mono font-medium text-[#191c1d] dark:text-[#f3f4f6]">
              USR-{user?.id ? String(user.id).padStart(4, '0') : '0002'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#faf9f5] dark:bg-[#141816] border border-[#e8e6df] dark:border-[#272d29]">
            <span className="text-xs text-[#78716c] dark:text-[#9ca3af] block mb-1">
              Account status
            </span>
            <span className="text-sm font-semibold text-[#164e3f] dark:text-[#a7f3d0] flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Operational
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#faf9f5] dark:bg-[#141816] border border-[#e8e6df] dark:border-[#272d29]">
            <span className="text-xs text-[#78716c] dark:text-[#9ca3af] block mb-1">
              Authentication method
            </span>
            <span className="text-sm text-[#191c1d] dark:text-[#f3f4f6] flex items-center gap-1.5 font-medium">
              <Lock className="h-4 w-4 text-[#78716c]" /> Password (Bcrypt) + JWT Token
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#faf9f5] dark:bg-[#141816] border border-[#e8e6df] dark:border-[#272d29]">
            <span className="text-xs text-[#78716c] dark:text-[#9ca3af] block mb-1">
              Session timeout
            </span>
            <span className="text-sm text-[#191c1d] dark:text-[#f3f4f6] flex items-center gap-1.5 font-medium">
              <Clock className="h-4 w-4 text-[#78716c]" /> 120 minutes
            </span>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 rounded-xl bg-[#faf9f5] dark:bg-[#141816] border border-[#e8e6df] dark:border-[#272d29] p-5 text-xs text-[#78716c] dark:text-[#9ca3af]">
          <p className="font-semibold text-[#191c1d] dark:text-[#f3f4f6] flex items-center gap-2 mb-1.5">
            <Shield className="h-4 w-4 text-[#164e3f] dark:text-[#a7f3d0]" />
            <span>Role-Based Access Governance</span>
          </p>
          <p>
            Role permissions (Admin, Analyst, User) determine access levels across the platform. Contact an administrator to request permission changes or scope re-assignments.
          </p>
        </div>
      </div>
    </div>
  );
};
