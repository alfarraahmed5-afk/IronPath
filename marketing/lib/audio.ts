/**
 * Marketing audio system -- Howler-backed sprite player.
 *
 * Design constraints (sound-design + a11y council):
 *   1. Muted by default. NO autoplay. AudioContext is never resumed
 *      until the user clicks the visible "Sound on" toggle.
 *   2. Howler is lazy-imported the first time the user opts in, so
 *      the ~10 KB gz library does not enter the critical bundle.
 *   3. iOS Safari requires a silent-buffer "primer" that runs INSIDE
 *      the user-gesture handler. `initAudio()` is awaited by the
 *      toggle's onClick before any sound plays.
 *   4. Per-sound volumes are normalized so the loudest clip
 *      (`weight-drop`) sits at -3 dBFS; everything else is quieter.
 *      Volumes are stored as linear gains, not dB, to avoid a Math.pow
 *      call on every play.
 *   5. Ducking dips the ambient bed for `durationMs` so a transient
 *      SFX (a CTA confirm or weight drop) is intelligible above it.
 *   6. AudioContext is suspended whenever `document.hidden` flips true
 *      (the user tabbed away). It resumes on the next visibility event
 *      iff sound is still on -- no spurious resume on a backgrounded
 *      tab.
 *
 * Public API:
 *   - initAudio()                 -- call inside a user-gesture handler.
 *   - play(name, options?)        -- fire a sprite. No-op when muted.
 *   - playAmbient() / stopAmbient()
 *   - duck(durationMs)
 *   - setMuted(boolean)           -- kill switch wired to useSoundOn().
 *
 * This module is imported by `components/sound/sound-toggle.tsx` and
 * (eventually) by scene components that want to fire confirm/hover
 * SFX. It is safe to import at the top of any client component -- the
 * Howler dependency is only loaded after `initAudio()` runs.
 */

import type { Howl } from 'howler';

// Sprite layout -- keep in lockstep with `lib/audio-licenses.md`.
// [offsetMs, durationMs] tuples. `true` (third element) marks loops.
export const SPRITE: Record<string, [number, number]> = {
  'cta-hover':   [0,    180],
  'cta-confirm': [200,  280],
  'plate-clack': [600,  220],
  'weight-drop': [900, 1400],
  'tick':        [2400,  60],
  'gym-door':    [2600, 1800],
};

export type SpriteName = keyof typeof SPRITE;

// Per-sound linear gain (10^(dB/20)). Sourced from the council spec:
//   weight-drop: -3 dB,  cta-confirm/plate-clack: -9 dB,
//   cta-hover/tick: -15 dB, gym-door: -6 dB, ambient-bed: -24 dB.
const VOLUMES: Record<string, number> = {
  'cta-hover':   0.178, // -15 dB
  'cta-confirm': 0.355, //  -9 dB
  'plate-clack': 0.355, //  -9 dB
  'weight-drop': 0.708, //  -3 dB (loudest)
  'tick':        0.178, // -15 dB
  'gym-door':    0.501, //  -6 dB
};

const AMBIENT_VOLUME    = 0.063; // -24 dB
const AMBIENT_DUCKED_VOLUME = 0.0316; // -30 dB

const SPRITE_URL  = '/audio/sfx-sprite.opus';
const AMBIENT_URL = '/audio/ambient-bed.opus';

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

type HowlerModule = typeof import('howler');

let _howlerModulePromise: Promise<HowlerModule> | null = null;
let _spriteHowl: Howl | null = null;
let _ambientHowl: Howl | null = null;
let _ambientId: number | null = null;
let _initialized = false;
let _muted = true;             // default: muted until user opts in
let _duckTimer: ReturnType<typeof setTimeout> | null = null;
let _visibilityWired = false;

function loadHowler(): Promise<HowlerModule> {
  if (!_howlerModulePromise) {
    _howlerModulePromise = import('howler');
  }
  return _howlerModulePromise;
}

/**
 * Prime the AudioContext from inside a user-gesture handler. On iOS
 * Safari the context is created in "suspended" state and the only way
 * to unlock it is to play a zero-byte buffer during a touch handler.
 * Howler 2.2 already plays a silent buffer in its `_unlockAudio`
 * routine, but only on the first `Howl.play()` -- which is too late if
 * we want subsequent plays to be reliable. So we trigger that path
 * explicitly here.
 *
 * Safe to call multiple times; subsequent calls are no-ops.
 */
export async function initAudio(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (_initialized) return;

  const Howler = (await loadHowler()).Howler;

  // Howler exposes `ctx` once any Howl is created; we force creation
  // by instantiating the sprite eagerly.
  await ensureSprite();

  // The act of touching `Howler.ctx` from inside a gesture handler is
  // sufficient to flip the context out of "suspended". Belt-and-suspenders:
  // also call `resume()` if the API is present.
  const ctx: AudioContext | undefined = (Howler as unknown as { ctx?: AudioContext }).ctx;
  if (ctx && ctx.state === 'suspended') {
    try { await ctx.resume(); } catch { /* ignore */ }
  }

  if (!_visibilityWired) {
    document.addEventListener('visibilitychange', _onVisibilityChange);
    _visibilityWired = true;
  }

  _initialized = true;
}

async function ensureSprite(): Promise<Howl> {
  if (_spriteHowl) return _spriteHowl;
  const { Howl } = await loadHowler();
  _spriteHowl = new Howl({
    src: [SPRITE_URL],
    preload: true,
    sprite: Object.fromEntries(
      Object.entries(SPRITE).map(([k, [start, dur]]) => [k, [start, dur]]),
    ),
  });
  return _spriteHowl;
}

async function ensureAmbient(): Promise<Howl> {
  if (_ambientHowl) return _ambientHowl;
  const { Howl } = await loadHowler();
  _ambientHowl = new Howl({
    src: [AMBIENT_URL],
    loop: true,
    volume: AMBIENT_VOLUME,
    preload: true,
  });
  return _ambientHowl;
}

function _onVisibilityChange() {
  // Suspend on hide, resume on show only if still un-muted.
  loadHowler().then(({ Howler }) => {
    const ctx: AudioContext | undefined = (Howler as unknown as { ctx?: AudioContext }).ctx;
    if (!ctx) return;
    if (document.hidden) {
      if (ctx.state === 'running') ctx.suspend().catch(() => {});
    } else if (!_muted && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Wire the mute state from React preferences. Call this from any
 * component that subscribes to `useSoundOn()` so the audio layer can
 * short-circuit play() / playAmbient() without consulting localStorage
 * on the hot path.
 *
 * When transitioning from on -> off, ambient is faded out and any
 * scheduled duck-restore is cancelled. When off -> on, no sound plays
 * automatically -- the caller decides whether to start the ambient bed.
 */
export function setMuted(muted: boolean): void {
  _muted = muted;
  if (muted) {
    stopAmbient();
  }
}

export function isMuted(): boolean {
  return _muted;
}

/**
 * Play a sprite by name. No-op when muted, when the sprite name is
 * unknown, or when audio has not been initialized yet (initAudio()
 * MUST be called from a user gesture before this works).
 *
 * `options.volumeMultiplier` lets a caller dim a specific play (e.g.
 * a CTA-hover that fires repeatedly while the cursor moves).
 */
export function play(
  name: SpriteName,
  options: { volumeMultiplier?: number } = {},
): void {
  if (_muted || !_initialized) return;
  if (!(name in SPRITE)) return;

  // Fire-and-forget. The Howl is already loaded by ensureSprite().
  ensureSprite().then((howl) => {
    if (_muted) return; // race: user toggled off between gesture and load
    const id = howl.play(name);
    const base = VOLUMES[name] ?? 0.5;
    const mult = options.volumeMultiplier ?? 1;
    howl.volume(Math.max(0, Math.min(1, base * mult)), id);
  }).catch(() => {});
}

/**
 * Start the ambient gym bed (looping). Idempotent -- calling twice does
 * not stack two loops. No-op when muted.
 */
export function playAmbient(): void {
  if (_muted || !_initialized) return;
  if (_ambientId !== null) return;

  ensureAmbient().then((howl) => {
    if (_muted) return;
    if (_ambientId !== null) return;
    _ambientId = howl.play();
  }).catch(() => {});
}

export function stopAmbient(): void {
  if (!_ambientHowl || _ambientId === null) return;
  // Fade out over 200 ms to avoid a click.
  const id = _ambientId;
  _ambientId = null;
  const howl = _ambientHowl;
  howl.fade(howl.volume(id) as number, 0, 200, id);
  setTimeout(() => howl.stop(id), 220);

  if (_duckTimer) {
    clearTimeout(_duckTimer);
    _duckTimer = null;
  }
}

/**
 * Dip the ambient bed to -30 dB for `durationMs` then fade back to
 * the standard ambient level over 200 ms. Useful right before firing
 * a `weight-drop` so the transient is audible above the pad.
 *
 * No-op when ambient isn't currently playing.
 */
export function duck(durationMs: number): void {
  if (!_ambientHowl || _ambientId === null) return;
  const howl = _ambientHowl;
  const id = _ambientId;

  if (_duckTimer) clearTimeout(_duckTimer);

  howl.fade(howl.volume(id) as number, AMBIENT_DUCKED_VOLUME, 80, id);
  _duckTimer = setTimeout(() => {
    if (_ambientHowl !== howl || _ambientId !== id) return;
    howl.fade(AMBIENT_DUCKED_VOLUME, AMBIENT_VOLUME, 200, id);
    _duckTimer = null;
  }, Math.max(0, durationMs));
}

// ---------------------------------------------------------------------------
// Test hook (only used by unit tests; tree-shaken in prod via NODE_ENV)
// ---------------------------------------------------------------------------

/** @internal Reset module state. Test-only. */
export function __resetForTests(): void {
  _howlerModulePromise = null;
  _spriteHowl = null;
  _ambientHowl = null;
  _ambientId = null;
  _initialized = false;
  _muted = true;
  if (_duckTimer) { clearTimeout(_duckTimer); _duckTimer = null; }
}
