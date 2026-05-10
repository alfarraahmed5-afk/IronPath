'use client';

import { useEffect, useState } from 'react';

// User preferences for motion + sound.
// - Motion: respects OS `prefers-reduced-motion: reduce` AND a user-set
//   in-app toggle. The toggle persists to localStorage and overrides OS.
// - Sound: muted by default; user explicit opt-in only (autoplay policy).

const MOTION_KEY = 'ironpath-motion'; // 'on' | 'off' | null = follow OS
const SOUND_KEY  = 'ironpath-sound';  // 'on' | 'off' | null = off

function readLocal(key: string): 'on' | 'off' | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(key);
  return v === 'on' || v === 'off' ? v : null;
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
    window.addEventListener('storage', compute);
    return () => {
      mq.removeEventListener('change', compute);
      window.removeEventListener('storage', compute);
    };
  }, []);

  return reduced;
}

export function setMotionPreference(value: 'on' | 'off' | 'system'): void {
  if (typeof window === 'undefined') return;
  if (value === 'system') localStorage.removeItem(MOTION_KEY);
  else localStorage.setItem(MOTION_KEY, value);
  window.dispatchEvent(new StorageEvent('storage'));
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
    window.addEventListener('storage', compute);
    return () => window.removeEventListener('storage', compute);
  }, []);

  return on;
}

export function setSoundPreference(value: 'on' | 'off'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_KEY, value);
  window.dispatchEvent(new StorageEvent('storage'));
}
