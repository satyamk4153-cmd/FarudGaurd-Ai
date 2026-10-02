import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { Shield, Lock, Mail, AlertCircle, Loader2, LogIn, UserCheck, Eye, Sun, Moon } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = usePreferences();
  const navigate = useNavigate();

  const isMountedRef = React.useRef(true);
  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      if (!isMountedRef.current) return;
      if (err.response?.status === 401) {
        setError('Incorrect email or password. Please verify credentials.');
      } else if (err.response?.status === 403) {
        setError('Account has been deactivated. Please contact your system administrator.');
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Unable to reach authentication server. Please check your network or server status.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const selectDemoRole = (roleEmail: string, rolePassword: string) => {
    setEmail(roleEmail);
    setPassword(rolePassword);
    setError(null);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#faf9f5] dark:bg-[#111413] px-4 py-12 transition-colors">
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] text-[#191c1d] dark:text-[#f3f4f6] shadow-xs hover:border-[#1b4332]/40 transition-colors"
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#1b4332] text-white mb-3.5 shadow-xs">
            <Shield className="h-6 w-6 stroke-[1.75]" />
          </div>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-[#191c1d] dark:text-[#f0f3f1]">
            FraudGuard
          </h2>
          <p className="mt-1 text-[10px] font-bold tracking-widest uppercase text-[#78716c] dark:text-[#9aa19d]">
            FINANCIAL RISK INTELLIGENCE
          </p>
        </div>

        {/* Login Box */}
        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-8 shadow-xs">
          {error && (
            <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-700 dark:text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#525252] dark:text-[#9aa19d] mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#8a8a86]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@fraudguard.ai"
                  className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] pl-9 pr-3 py-2 text-sm text-[#191c1d] dark:text-[#f0f3f1] placeholder-[#8a8a86] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#525252] dark:text-[#9aa19d] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#8a8a86]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] pl-9 pr-3 py-2 text-sm text-[#191c1d] dark:text-[#f0f3f1] placeholder-[#8a8a86] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-[#525252] dark:text-[#9aa19d] cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#e8e6df] text-[#1b4332] focus:ring-0"
                />
                <span>Remember session</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#1b4332] hover:bg-[#143326] py-2.5 text-xs font-semibold text-white shadow-xs focus:outline-none disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Sign in</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Role Selectors */}
          <div className="mt-6 border-t border-[#e8e6df] dark:border-[#272d29] pt-5">
            <p className="text-xs font-medium text-[#191c1d] dark:text-white mb-1">
              Demo accounts
            </p>
            <p className="text-xs text-[#78716c] dark:text-[#9aa19d] mb-3">
              Click a role to auto-fill credentials, then press <span className="font-semibold">Sign in</span>:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => selectDemoRole('admin@fraudguard.ai', 'Admin@123456')}
                className="flex flex-col items-center justify-center gap-1 rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] py-2.5 text-xs text-[#191c1d] dark:text-[#f0f3f1] hover:border-[#1b4332] hover:bg-[#ebf3ef] hover:text-[#164e3f] transition-colors font-medium"
              >
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-[#164e3f]" />
                  <span>Admin</span>
                </div>
                <span className="text-[9px] text-[#78716c] font-normal">Admin@123456</span>
              </button>
              <button
                type="button"
                onClick={() => selectDemoRole('analyst@fraudguard.ai', 'Analyst@123456')}
                className="flex flex-col items-center justify-center gap-1 rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] py-2.5 text-xs text-[#191c1d] dark:text-[#f0f3f1] hover:border-[#1b4332] hover:bg-[#ebf3ef] hover:text-[#164e3f] transition-colors font-medium"
              >
                <div className="flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-[#164e3f]" />
                  <span>Analyst</span>
                </div>
                <span className="text-[9px] text-[#78716c] font-normal">Analyst@123456</span>
              </button>
              <button
                type="button"
                onClick={() => selectDemoRole('user@fraudguard.ai', 'User@123456')}
                className="flex flex-col items-center justify-center gap-1 rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] py-2.5 text-xs text-[#191c1d] dark:text-[#f0f3f1] hover:border-[#1b4332] hover:bg-[#ebf3ef] hover:text-[#164e3f] transition-colors font-medium"
              >
                <div className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-[#164e3f]" />
                  <span>Viewer</span>
                </div>
                <span className="text-[9px] text-[#78716c] font-normal">User@123456</span>
              </button>
            </div>
          </div>

          <div className="mt-5 text-center text-xs text-[#78716c] dark:text-[#9aa19d]">
            Need an account?{' '}
            <Link to="/register" className="text-[#164e3f] dark:text-[#a7f3d0] hover:underline font-semibold">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
