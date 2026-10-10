'use client';

import React, { useState } from 'react';
import { CheckCircle2Icon, ClockIcon, InstagramIcon, MailIcon, MapPinIcon, PhoneIcon } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { SelectField, TextAreaField, TextField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { useStorefront } from '@/components/storefront/StorefrontProvider';
import { isValidEmail, isValidPhone, wait } from '@/lib/utils/validation';

const subjects = ['Order enquiry', 'Product question', 'Salon appointment', 'Wholesale / business', 'Other'];
const igLabels = { hairs: 'LUXICHIC Hairs', salon: 'Beauty Salon & Spa', tools: 'Hair Tools & Essentials' };

export function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const { contact, instagram, whatsapp } = useStorefront().business;
  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = 'Please enter your name.';
    if (!isValidEmail(form.email)) errs.email = 'Please enter a valid email address.';
    if (form.phone && !isValidPhone(form.phone)) errs.phone = 'Please enter a valid phone number.';
    if (!form.subject) errs.subject = 'Please choose a subject.';
    if (form.message.trim().length < 10) errs.message = 'Please write a little more (at least 10 characters).';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setStatus('sending');
    await wait(900);
    setStatus('sent');
  };

  const info = [
    { icon: PhoneIcon, label: contact.phone },
    { icon: MailIcon, label: contact.email },
    { icon: MapPinIcon, label: contact.address },
    { icon: ClockIcon, label: contact.hours },
  ];

  return (
    <div className="mx-auto max-w-site px-5 pb-24 pt-10 lg:px-8">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Contact Us' }]} />
      <h1 className="mt-6 font-display text-5xl text-ink md:text-6xl">We’d love to hear from you</h1>
      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[28px] bg-white p-6 md:p-8" aria-label="Contact form">
          {status === 'sent' ? (
            <div role="status" className="py-10 text-center">
              <CheckCircle2Icon className="mx-auto h-10 w-10 text-emerald-600" aria-hidden />
              <p className="mt-4 font-display text-3xl text-ink">Message received</p>
              <p className="mt-2 text-sm text-subtle">
                Thank you, {form.name.split(' ')[0]}. Our team will get back to you soon.
              </p>
              <p className="mt-4 text-xs text-subtle">
                Prototype: messages are not delivered until the backend is connected.
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => {
                  setForm({ name: '', email: '', phone: '', subject: '', message: '' });
                  setStatus('idle');
                }}
              >
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <TextField
                id="ct-name"
                label="Name"
                autoComplete="name"
                value={form.name}
                error={errors.name}
                onChange={set('name')}
              />
              <TextField
                id="ct-email"
                type="email"
                label="Email"
                autoComplete="email"
                value={form.email}
                error={errors.email}
                onChange={set('email')}
              />
              <TextField
                id="ct-phone"
                type="tel"
                label="Phone number"
                optional
                value={form.phone}
                error={errors.phone}
                onChange={set('phone')}
              />
              <SelectField
                id="ct-subject"
                label="Subject"
                value={form.subject}
                error={errors.subject}
                placeholder="Choose a subject"
                onChange={set('subject')}
                options={subjects.map((s) => ({ value: s, label: s }))}
              />
              <TextAreaField
                id="ct-message"
                label="Message"
                wrapperClassName="sm:col-span-2"
                value={form.message}
                error={errors.message}
                onChange={set('message')}
                rows={6}
              />
              <div className="sm:col-span-2">
                <Button type="submit" size="lg" loading={status === 'sending'}>
                  Send Message
                </Button>
              </div>
            </form>
          )}
        </section>
        <aside className="space-y-8">
          <div>
            <h2 className="font-display text-2xl text-ink">Contact details</h2>
            <ul className="mt-4 space-y-3">
              {info.map((i) => (
                <li key={i.label} className="flex gap-3 text-sm text-charcoal">
                  <i.icon className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
                  {i.label}
                </li>
              ))}
            </ul>
            <WhatsAppButton
              number={whatsapp.general}
              message="Hello LUXICHIC, I would like to make an enquiry."
              className="mt-6"
            />
          </div>
          <div>
            <h2 className="font-display text-2xl text-ink">Follow us</h2>
            <ul className="mt-4 space-y-2">
              {(Object.keys(instagram) as (keyof typeof instagram)[]).map((k) => (
                <li key={k}>
                  <a
                    href={instagram[k].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 text-sm transition-colors duration-150 hover:bg-blush/60"
                  >
                    <span className="flex items-center gap-3 font-medium text-ink">
                      <InstagramIcon className="h-4 w-4" aria-hidden />
                      {igLabels[k]}
                    </span>
                    <span className="text-subtle">{instagram[k].handle}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
