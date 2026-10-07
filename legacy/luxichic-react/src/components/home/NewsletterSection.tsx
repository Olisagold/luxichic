import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2Icon } from 'lucide-react';
import { Button } from '../ui/Button';
import { isValidEmail, wait } from '../../utils/validation';

export function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setStatus('error');
      setError(email ? 'Please enter a valid email address.' : 'Please enter your email address.');
      return;
    }
    setStatus('loading');
    await wait(900);
    setStatus('success');
  };

  return (
    <section className="bg-blush py-20 md:py-24">
      <div className="mx-auto max-w-3xl px-5 text-center">
        <h2 className="font-display text-4xl uppercase leading-[1.05] text-ink md:text-6xl">
          Stay beautiful <span className="italic normal-case text-pink-deep">with LUXICHIC.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-charcoal">
          Discover new arrivals, exclusive offers, beauty inspiration and the latest updates from LUXICHIC.
        </p>
        <AnimatePresence mode="wait">
          {status === 'success' ?
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mx-auto mt-10 flex max-w-md items-center justify-center gap-3 rounded-full bg-white px-6 py-4 text-sm text-ink"
            role="status">
            
              <CheckCircle2Icon className="h-5 w-5 text-emerald-600" aria-hidden />
              You're on the list. Welcome to LUXICHIC!
            </motion.div> :

          <motion.form key="form" onSubmit={submit} noValidate className="mx-auto mt-10 max-w-lg" exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <div className="flex flex-col gap-2 rounded-[28px] bg-white p-2 sm:flex-row sm:rounded-full">
                <label htmlFor="newsletter-email" className="sr-only">Email address</label>
                <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === 'error') setStatus('idle');
                }}
                placeholder="Your email address"
                aria-invalid={status === 'error'}
                aria-describedby={status === 'error' ? 'newsletter-error' : undefined}
                className="h-12 flex-1 rounded-full bg-transparent px-5 text-sm text-ink placeholder:text-muted focus:outline-none" />
              
                <Button type="submit" loading={status === 'loading'}>Subscribe</Button>
              </div>
              {status === 'error' &&
            <p id="newsletter-error" className="mt-3 text-sm text-red-700" role="alert">{error}</p>
            }
              <p className="mt-3 text-xs text-subtle">Prototype: no email is sent until the backend is connected.</p>
            </motion.form>
          }
        </AnimatePresence>
      </div>
    </section>);

}