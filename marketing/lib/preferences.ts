'use client';

import { useEffect, useState } from 'react';

// User preferences for motion + sound.
// - Motion: respects OS `prefers-reduced-motion: reduce` AND a user-set
//   in-app toggle. The toggle persists to localStorage and overrides OS.
// - Sound: muted by default; user explicit opt-in only (autoplay policy).
//
// Same-tab change notification: we use a custom event ('ironpath-prefs').
// The native `storage` event only fires for OTHER tabs (cross-tab sync),
// so listening for it inside the same tab is silently broken; constructing
// `new StorageEvent('storage')` to fake it in-tab also throws in some
// browsers (Safari) under strict-mode.

const MOTION_KEY = 'ironpath-motion'; // 'on' | 'off' | null = follow OS
const SOUND_KEY  = 'ironpath-sound';  // 'on' | 'off' | null = off
const PREFS_EVENT = 'ironpath-prefs';

function readLocal(key: string): 'on' | 'off' | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(key);
    return v === 'on' || v === 'off' ? v : null;
  } catch {
    // Safari private mode + some embedded webviews throw on localStorage.
    return null;
  }
}

function notifyPrefsChange(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new Event(PREFS_EVENT));
  } catch {
    // Defensive: never let preference dispatch crash the page.
  }
}

/**
 * Returns true when motion should be REDUCED (suppressed).
 * Combines OS `prefers-reduced-motion` with the in-app override.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    function compute() {
      const override = readLocal(MOTION_KEY);
      if (override === 'off') return setReduced(true);
      if (override === 'on')  return setReduced(false);
      setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
    compute();
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', compute);
    // Same-tab updates (custom event) + cross-tab sync (storage event).
    window.addEventListener(PREFS_EVENT, compute);
    window.addEventListener('storage', compute);
    return () => {
      mq.removeEventListener('change', compute);
      window.removeEventListener(PREFS_EVENT, compute);
      window.removeEventListener('storage', compute);
    };
  }, []);

  return reduced;
}

export function setMotionPreference(value: 'on' | 'off' | 'system'): void {
  if (typeof window === 'undefined') return;
  try {
    if (value === 'system') localStorage.removeItem(MOTION_KEY);
    else localStorage.setItem(MOTION_KEY, value);
  } catch {
    // Storage may be blocked; the in-memory React state still flips via the
    // toggle's own setState, so the user gets the intended behavior for the
    // session even if persistence fails.
  }
  notifyPrefsChange();
}

/**
 * Returns true when sound is enabled. Muted by default; user must opt in
 * via the visible sound toggle (browser autoplay policies require an
 * explicit user gesture before any audio plays).
 */
export function useSoundOn(): boolean {
  const [on, setOn] = useState(false);

  useEffect(() => {
    function compute() {
      setOn(readLocal(SOUND_KEY) === 'on');
    }
    compute();
    window.addEventListener(PREFS_EVENT, compute);
    window.addEventListener('storage', compute);
    return () => {
      window.removeEventListener(PREFS_EVENT, compute);
      window.removeEventListener('storage', compute);
    };
  }, []);

  return on;
}

export function setSoundPreference(value: 'on' | 'off'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SOUND_KEY, value);
  } catch {
    // see notifyPrefsChange comment.
  }
  notifyPrefsChange();
}
