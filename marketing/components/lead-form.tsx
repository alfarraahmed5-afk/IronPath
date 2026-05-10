'use client';

// STUB — Team Beta β3 owns the real implementation.
// Public API: 3-field form (gym_name, owner_email, member_count) that
// posts to /api/lead. variant prop controls visual placement (hero vs
// closing CTA). On success, parent navigates to admin signup.

import { useState } from 'react';

export type LeadFormVariant = 'hero' | 'inline' | 'closing';

export interface LeadFormProps {
  variant?: LeadFormVariant;
  /** Fired after successful submit; parent should navigate. */
  onSuccess?: (lead: { id: string; redirect_url: string }) => void;
  className?: string;
}

export function LeadForm({ variant = 'inline', onSuccess, className = '' }: LeadFormProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('lead failed');
      const json = await res.json();
      onSuccess?.(json);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handle} data-variant={variant} className={className}>
      <input name="gym_name" required minLength={2} maxLength={80} placeholder="Your gym name" />
      <input name="owner_email" type="email" required placeholder="Your email" />
      <input name="member_count" type="number" required min={1} placeholder="Active members (roughly)" />
      <button type="submit" disabled={submitting}>
        {submitting ? 'Starting' : 'Start my 30-day trial'}
      </button>
    </form>
  );
}
