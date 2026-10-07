import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheckIcon } from 'lucide-react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { TextField } from '../../components/ui/FormField';
import { Button } from '../../components/ui/Button';
import { PrototypeNote } from '../../components/ui/PrototypeNote';
import { useAuth } from '../../contexts/AuthContext';
import { isValidEmail } from '../../utils/validation';

export function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [demoToken, setDemoToken] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) return setError('Please enter a valid email address.');
    setError('');
    setLoading(true);
    const token = await requestPasswordReset(email);
    setLoading(false);
    setDemoToken(token);
    setSent(true);
  };

  return (
    <AuthLayout title="Forgot your password?" text="Enter the email linked to your account and we’ll send you instructions to reset it.">
      {sent ?
      <div role="status" className="rounded-[24px] bg-white p-6">
          <MailCheckIcon className="h-8 w-8 text-gold" aria-hidden />
          <p className="mt-4 font-display text-2xl text-ink">Check your inbox</p>
          <p className="mt-2 text-sm leading-relaxed text-subtle">If an account exists for <strong className="text-ink">{email}</strong>, password reset instructions will be sent to that email address.</p>
          <PrototypeNote className="mt-6">
            <p>No email is sent in this prototype. In production, the reset link is delivered by email (SMTP).</p>
            {demoToken && <Link to={`/reset-password?token=${demoToken}`} className="mt-2 inline-block font-semibold text-pink-deep underline-offset-4 hover:underline">Open the simulated reset link</Link>}
          </PrototypeNote>
          <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-ink underline-offset-4 hover:underline">Back to sign in</Link>
        </div> :

      <form onSubmit={submit} noValidate className="space-y-5">
          <TextField id="fp-email" type="email" label="Email address" autoComplete="email" value={email} error={error} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" fullWidth size="lg" loading={loading}>Send Reset Instructions</Button>
          <p className="text-center text-sm text-subtle"><Link to="/login" className="font-semibold text-ink underline-offset-4 hover:underline">Back to sign in</Link></p>
        </form>
      }
    </AuthLayout>);

}