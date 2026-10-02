import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { Shield, Lock, Mail, User as UserIcon, UserPlus, AlertCircle, Loader2, Info, Sun, Moon } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
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

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters in length.');
      return;
    }

    setLoading(true);

    try {
      await register(email, password, fullName);
      navigate('/dashboard');
    } catch (err: any) {
      if (!isMountedRef.current) return;
      if (err.response?.status === 400 && err.response?.data?.detail?.includes('already registered')) {
        setError('This email is already associated with an existing account. Please sign in instead.');
      } else {
        setError(
          err.response?.data?.detail || 'Registration failed. Please check the provided information.'
        );
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
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
                Full name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-[#8a8a86]" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] pl-9 pr-3 py-2 text-sm text-[#191c1d] dark:text-[#f0f3f1] placeholder-[#8a8a86] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
                />
              </div>
            </div>

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
                  placeholder="jane.doe@fintech.com"
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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] pl-9 pr-3 py-2 text-sm text-[#191c1d] dark:text-[#f0f3f1] placeholder-[#8a8a86] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#525252] dark:text-[#9aa19d] mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#8a8a86]" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] pl-9 pr-3 py-2 text-sm text-[#191c1d] dark:text-[#f0f3f1] placeholder-[#8a8a86] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-[#cde2d6] dark:border-[#204a37] bg-[#ebf3ef] dark:bg-[#153226]/50 p-3 text-xs text-[#164e3f] dark:text-[#a7f3d0]">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span><span className="font-semibold">Default Access:</span> Viewer level. Contact an administrator for Analyst or Admin permissions.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#1b4332] text-white hover:bg-[#143326] py-2.5 text-xs font-semibold shadow-xs focus:outline-none disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Create account</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-[#78716c] dark:text-[#9aa19d]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#164e3f] dark:text-[#a7f3d0] hover:underline font-semibold">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
