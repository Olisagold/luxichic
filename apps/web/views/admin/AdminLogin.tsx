'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navigate } from '@/components/ui/Navigate';
import { motion, useReducedMotion } from 'framer-motion';
import { toast, Toaster } from 'sonner';
import { AlertCircleIcon, EyeIcon, EyeOffIcon, Loader2Icon, MailIcon } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Logo } from '@/components/ui/Logo';
import { isValidEmail } from '@/lib/utils/validation';
import { DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD } from '@/data/adminSeed';
import { images } from '@/data/images';

function safeNext(v: string | null) {
  return v && v.startsWith('/admin') && !v.startsWith('/admin/login') ? v : '/admin/dashboard';
}

const field =
  'h-11 w-full rounded-lg border border-white/15 bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-white/35 transition-[border-color,box-shadow] duration-150 focus:border-pink focus:outline-none focus:ring-2 focus:ring-pink/25';

export function AdminLogin() {
  const { admin, login } = useAdminAuth();
  const router = useRouter();
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgot, setForgot] = useState(false);

  if (admin) return <Navigate to={safeNext(params.get('next'))} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidEmail(email)) return setError('Enter a valid email address.');
    if (!password) return setError('Enter your password.');
    setLoading(true);
    const res = await login(email, password, remember);
    setLoading(false);
    if (!res.ok) return setError(res.error ?? 'Unable to sign in.');
    setPassword('');
    toast('Login alert email would be sent', {
      description: `Prototype: “Your LUXICHIC administrator account was just logged in” would go to ${email.trim()}. Nothing has been sent.`,
      icon: <MailIcon className="h-4 w-4" />,
      duration: 6000,
    });
    router.replace(safeNext(params.get('next')));
  };

  return (
    <div className="grid min-h-screen w-full bg-ink font-sans text-white lg:grid-cols-[1fr_minmax(0,560px)]">
      <div className="relative hidden overflow-hidden lg:block">
        <img src={images.heroModel} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-ink/40" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo variant="main" className="h-12" />
          <div className="max-w-md">
            <p className="font-display text-5xl leading-[1.05]">Run every part of LUXICHIC from one place.</p>
            <p className="mt-4 text-sm text-white/70">
              Orders, payments, stock, appointments and website content for Hairs, Salon &amp; Spa and Hair Tools.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="mx-auto w-full max-w-sm"
        >
          <div className="mb-10 flex items-center gap-2 lg:hidden">
            <Logo variant="main" className="h-10" />
          </div>
          <p className="text-xs font-semibold text-pink">LUXICHIC Admin</p>
          <h1 className="mt-2 font-display text-5xl leading-none">Welcome back.</h1>
          <p className="mt-3 text-sm text-white/60">Sign in to manage your LUXICHIC business.</p>

          {forgot ? (
            <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/75">
              <p className="font-semibold text-white">Reset your admin password</p>
              <p className="mt-2 leading-relaxed">
                Sub-admins: ask the main administrator to reset your password. The main administrator’s reset will be
                handled by the backend via a secure email link.
              </p>
              <button onClick={() => setForgot(false)} className="mt-4 text-sm font-semibold text-pink hover:underline">
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="mt-8 space-y-4">
              {error && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-200"
                >
                  <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {error}
                </p>
              )}
              <div>
                <label htmlFor="admin-email" className="mb-1.5 block text-xs font-semibold text-white/70">
                  Email
                </label>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={field}
                  placeholder="you@luxichic.com"
                />
              </div>
              <div>
                <label htmlFor="admin-password" className="mb-1.5 block text-xs font-semibold text-white/70">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={show ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${field} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-white/50 hover:text-white"
                    aria-label={show ? 'Hide password' : 'Show password'}
                  >
                    {show ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <label className="flex items-center gap-2 text-white/70">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 accent-pink"
                  />{' '}
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => setForgot(true)}
                  className="font-semibold text-white/70 hover:text-white"
                >
                  Forgot password?
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-pink text-sm font-bold text-ink transition-[background-color,transform] duration-150 ease-lux hover:bg-pink-hover active:scale-[0.99] disabled:opacity-70"
              >
                {loading && <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden />}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}

          <div className="mt-10 rounded-xl border border-dashed border-white/15 p-4 text-xs text-white/55">
            <p className="font-semibold text-white/80">Prototype demo access</p>
            <p className="mt-1">Frontend-only review account. Production sign-in will be handled by the backend.</p>
            <button
              type="button"
              onClick={() => {
                setEmail(DEMO_ADMIN_EMAIL);
                setPassword(DEMO_ADMIN_PASSWORD);
                setError('');
              }}
              className="mt-3 rounded-md border border-white/20 px-3 py-1.5 font-semibold text-white hover:bg-white/10"
            >
              Fill demo admin
            </button>
          </div>
        </motion.div>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}
