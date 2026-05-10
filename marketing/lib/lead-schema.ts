// Shared Zod schema for the lead form.
//
// Lives in /lib (not /components/lead-form) because both the client form
// AND the edge API route at /app/api/lead need to import it. Edge routes
// cannot import from a `'use client'` module (the named export only resolves
// to a client reference, not the actual function), so the schema must live
// in a runtime-neutral file.
//
// The component re-exports `leadSchema` and `createLeadSchema` for backwards
// compat so existing call sites do not break.

import { z } from 'zod';

export interface LeadFormErrorMessages {
  gymNameTooShort: string;
  gymNameTooLong: string;
  ownerEmailRequired: string;
  ownerEmailInvalid: string;
  memberCountType: string;
  memberCountInteger: string;
  memberCountMin: string;
  memberCountMax: string;
}

export const DEFAULT_ERROR_MESSAGES: LeadFormErrorMessages = {
  gymNameTooShort: "Your gym's name needs at least 2 characters.",
  gymNameTooLong: "That's a very long gym name. Keep it under 80 characters.",
  ownerEmailRequired: 'We need your email to set up your account.',
  ownerEmailInvalid: 'That email looks incomplete. Try again.',
  memberCountType: 'Member count needs to be a number.',
  memberCountInteger: 'Round to a whole number.',
  memberCountMin: 'You need at least 1 member to get started.',
  memberCountMax: 'For 100k+ members, get in touch with sales directly.',
};

export function createLeadSchema(messages: LeadFormErrorMessages = DEFAULT_ERROR_MESSAGES) {
  return z.object({
    gym_name: z
      .string()
      .trim()
      .min(2, messages.gymNameTooShort)
      .max(80, messages.gymNameTooLong),
    owner_email: z
      .string()
      .trim()
      .min(1, messages.ownerEmailRequired)
      .email(messages.ownerEmailInvalid),
    member_count: z.coerce
      .number({ invalid_type_error: messages.memberCountType })
      .int(messages.memberCountInteger)
      .min(1, messages.memberCountMin)
      .max(100_000, messages.memberCountMax),
  });
}

// Server-side default. Used by the API route -- locale-specific copy lives
// client-side; the API returns generic top-level "validation failed" rather
// than per-field copy.
export const leadSchema = createLeadSchema();

export type LeadFormValues = z.infer<typeof leadSchema>;
