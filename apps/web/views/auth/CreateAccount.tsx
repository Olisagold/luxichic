'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LinkIcon, PackageCheckIcon, UserCheckIcon } from 'lucide-react';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { PasswordField } from '@/components/ui/PasswordField';
import { TextField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/contexts/OrdersContext';
import { formatNaira } from '@/lib/utils/currency';
import { validatePassword } from '@/lib/utils/validation';

/** Post-confirmation account creation, opened from the secure link in the order-confirmation email. */
export function CreateAccount() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const { findOrderByToken, linkGuestRecords } = useOrders();
  const { register } = useAuth();
  const router = useRouter();
  const [order] = useState(() => findOrderByToken(token));
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [exists, setExists] = useState(false);

  const expired = !order?.accountToken || new Date(order.accountToken.expiresAt).getTime() < Date.now();

  if (!order || expired) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24">
        <EmptyState
          icon={<LinkIcon className="h-7 w-7" />}
          title="This link is invalid or has expired"
          text="Account links are tied to a confirmed order and expire for your security. You can still create an account or sign in."
          actions={
            <>
              <Button to="/register">Create an account</Button>
              <Button to="/login" variant="outline">
                Sign in
              </Button>
            </>
          }
        />
      </div>
    );
  }

  if (exists) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24">
        <EmptyState
          icon={<UserCheckIcon className="h-7 w-7" />}
          title="You already have an account"
          text={`An account already exists for ${order.customer.email}. Sign in to view your orders.`}
          actions={
            <Button to={`/login?email=${encodeURIComponent(order.customer.email)}&redirect=/account/orders`}>
              Sign in
            </Button>
          }
        />
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const pw = validatePassword(password);
    if (pw) errs.password = pw;
    if (confirm !== password) errs.confirm = 'Passwords do not match.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    const res = await register({
      fullName: order.customer.fullName,
      email: order.customer.email,
      phone: order.customer.phone,
      password,
    });
    if (!res.ok) {
      setLoading(false);
      if (res.exists) return setExists(true);
      return setErrors({ form: res.error ?? 'We could not create your account.' });
    }
    linkGuestRecords(order.customer.email);
    toast.success('Welcome to LUXICHIC!', { description: `Order ${order.orderNumber} is now in your account.` });
    router.replace('/account?welcome=1');
  };

  return (
    <AuthLayout
      title={
        <>
          Your order has been <span className="italic text-pink-deep">confirmed!</span>
        </>
      }
      text="Create your LUXICHIC account to track your orders, save your details and enjoy a more convenient shopping experience."
    >
      <div className="mb-6 flex items-center gap-4 rounded-2xl bg-white p-4">
        <PackageCheckIcon className="h-6 w-6 shrink-0 text-gold" aria-hidden />
        <div className="text-sm">
          <p className="font-semibold text-ink">Order {order.orderNumber}</p>
          <p className="text-subtle">
            {order.items.length} item{order.items.length > 1 ? 's' : ''} · {formatNaira(order.total)} · will be added to
            your account
          </p>
        </div>
      </div>
      <form onSubmit={submit} noValidate className="space-y-5">
        <TextField
          id="ca-email"
          label="Email address"
          value={order.customer.email}
          disabled
          readOnly
          hint="Linked to your confirmed order."
        />
        <PasswordField
          id="ca-password"
          label="Password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          showStrength
        />
        <PasswordField
          id="ca-confirm"
          label="Confirm password"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          error={errors.confirm}
        />
        {errors.form && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
            {errors.form}
          </p>
        )}
        <Button type="submit" fullWidth size="lg" loading={loading}>
          Create My Account
        </Button>
      </form>
    </AuthLayout>
  );
}
