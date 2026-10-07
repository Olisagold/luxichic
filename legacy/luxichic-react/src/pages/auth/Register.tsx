import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { TextField } from '../../components/ui/FormField';
import { PasswordField } from '../../components/ui/PasswordField';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { images } from '../../data/images';
import { isValidEmail, isValidPhone, validatePassword } from '../../utils/validation';
import { safeRedirect } from './Login';

export function Register() {
  const { user, register } = useAuth();
  const [params] = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'));
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  if (user && !loading) return <Navigate to={redirect} replace />;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.fullName.trim().length < 2) errs.fullName = 'Please enter your full name.';
    if (!isValidEmail(form.email)) errs.email = 'Please enter a valid email address.';
    if (!isValidPhone(form.phone)) errs.phone = 'Please enter a valid phone number.';
    const pw = validatePassword(form.password);
    if (pw) errs.password = pw;
    if (form.confirm !== form.password) errs.confirm = 'Passwords do not match.';
    if (!terms) errs.terms = 'Please accept the Terms and Conditions.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    const res = await register({ fullName: form.fullName, email: form.email, phone: form.phone, password: form.password });
    setLoading(false);
    if (!res.ok) return setErrors({ form: res.error ?? 'Registration failed.' });
    toast.success('Your LUXICHIC account has been created', { description: 'Prototype: a welcome email will be sent once the backend is connected.' });
    navigate(redirect === '/account' ? '/account?welcome=1' : redirect, { replace: true });
  };

  return (
    <AuthLayout image={images.nails} title={<>Create your <span className="italic text-pink-deep">account</span></>} text="Save your details, track orders and manage salon appointments in one place.">
      <form onSubmit={submit} noValidate className="space-y-5">
        <TextField id="reg-name" label="Full name" autoComplete="name" value={form.fullName} error={errors.fullName} onChange={set('fullName')} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField id="reg-email" type="email" label="Email address" autoComplete="email" value={form.email} error={errors.email} onChange={set('email')} />
          <TextField id="reg-phone" type="tel" label="Phone number" autoComplete="tel" value={form.phone} error={errors.phone} onChange={set('phone')} />
        </div>
        <PasswordField id="reg-password" label="Password" autoComplete="new-password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} error={errors.password} showStrength />
        <PasswordField id="reg-confirm" label="Confirm password" autoComplete="new-password" value={form.confirm} onChange={(v) => setForm({ ...form, confirm: v })} error={errors.confirm} />
        <div>
          <label className="flex items-start gap-3 text-sm text-charcoal">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 h-4 w-4 accent-ink" aria-invalid={!!errors.terms} />
            <span>I agree to the <Link to="/policies/terms" className="font-semibold underline underline-offset-2">Terms and Conditions</Link> and <Link to="/policies/privacy" className="font-semibold underline underline-offset-2">Privacy Policy</Link>.</span>
          </label>
          {errors.terms && <p className="mt-1.5 text-xs text-red-700" role="alert">{errors.terms}</p>}
        </div>
        {errors.form &&
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
            {errors.form} <Link to={`/login?email=${encodeURIComponent(form.email)}`} className="font-semibold underline">Sign in</Link>
          </p>
        }
        <Button type="submit" fullWidth size="lg" loading={loading}>Create Account</Button>
        <p className="text-center text-sm text-subtle">Already have an account? <Link to="/login" className="font-semibold text-ink underline-offset-4 hover:underline">Sign in</Link></p>
      </form>
    </AuthLayout>);

}