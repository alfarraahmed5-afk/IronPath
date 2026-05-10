'use client';

// EmberCanvasReal -- the actual OGL ember-particle implementation.
//
// Loaded only via dynamic import from `@/lib/canvas-bootstrap`, never imported
// statically anywhere else. This keeps the OGL dependency (~4 KB gz) and the
// shader strings out of the initial bundle.
//
// Lifecycle:
//   1. mount → init renderer / mesh / rAF loop → canvas hidden (opacity:0)
//   2. visible flips false→true → fade opacity 0→1 over 200ms via direct DOM
//   3. unmount → cancel rAF → remove canvas → drop GL refs
//
// Performance guards (per webgl-3d council lens):
//   - DPR clamped per tier (B = 0.5).
//   - First 60-frame fps watchdog: avg <30 fps → halve count once, then
//     unmount on a second failure.
//   - `gl.SRC_ALPHA, gl.ONE` additive blending -- no depth writes needed.
//   - Cleanup releases GL buffers + program before discarding the canvas.

import { useEffect, useRef } from 'react';
import { Renderer, Geometry, Program, Mesh } from 'ogl';
import { vertexShader, fragmentShader } from './EmberShader';
import type { DeviceTier } from '@/lib/device-tier';

export interface EmberCanvasRealProps {
  className?: string;
  visible?: boolean;
  tier: DeviceTier;
}

interface TierBudget {
  count: number;
  dpr: number;
}

function budgetFor(tier: DeviceTier): TierBudget {
  if (tier === 'A') {
    // Native DPR, capped to avoid 4x retina blowing up fillrate on big monitors.
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    return { count: 500, dpr };
  }
  // Tier B -- half DPR, ~30% the particle count.
  return { count: 150, dpr: 0.5 };
}

function buildAttributes(count: number): { position: Float32Array; seed: Float32Array } {
  // position = (x, y, birthPhase). x ∈ [-1, 1], y ∈ [-1, 1] (start band low).
  // seed ∈ [0, 1).
  const position = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const x = (Math.random() * 2 - 1);          // full width
    const y = -0.4 + Math.random() * 0.3;       // spawn band ~ -0.4..-0.1
    const phase = Math.random();
    position[i * 3 + 0] = x;
    position[i * 3 + 1] = y;
    position[i * 3 + 2] = phase;
    seed[i] = Math.random();
  }
  return { position, seed };
}

export function EmberCanvasReal({ className = '', visible = false, tier }: EmberCanvasRealProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  // keep the canvas ref in a closure so the visible-prop effect can fade it
  // without reaching back into OGL state.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // --- mount / unmount -----------------------------------------------------
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    let budget = budgetFor(tier);

    const renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: false,
      dpr: budget.dpr,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    });
    const gl = renderer.gl;
    const canvas = gl.canvas as HTMLCanvasElement;

    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.opacity = '0';
    canvas.style.transition = 'opacity 200ms ease-out';
    canvas.style.pointerEvents = 'none';
    canvasRef.current = canvas;
    wrap.appendChild(canvas);

    // Additive blending -- bright ember on dark poster, no depth contention.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.disable(gl.DEPTH_TEST);

    // Build particle attributes for the current budget. We rebuild if the
    // fps watchdog forces us to halve the count.
    let attrs = buildAttributes(budget.count);
    let geometry = new Geometry(gl, {
      position: { size: 3, data: attrs.position },
      seed: { size: 1, data: attrs.seed },
    });

    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [1, 1] },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    let mesh = new Mesh(gl, {
      geometry,
      program,
      mode: gl.POINTS,
    });

    // --- sizing -----------------------------------------------------------
    const resize = () => {
      const { clientWidth, clientHeight } = wrap;
      if (clientWidth === 0 || clientHeight === 0) return;
      renderer.setSize(clientWidth, clientHeight);
      program.uniforms.uResolution.value = [clientWidth, clientHeight];
    };
    resize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(wrap);
    } else {
      window.addEventListener('resize', resize);
    }

    // --- fps watchdog -----------------------------------------------------
    const FRAME_SAMPLE = 60;
    const TARGET_MIN_FPS = 30;
    let sampledFrames = 0;
    let sampleStart = 0;
    let watchdogTriggered = false;

    // --- rAF loop ---------------------------------------------------------
    const t0 = performance.now();
    let rafId = 0;

    const halveBudget = () => {
      const newCount = Math.max(40, Math.floor(budget.count / 2));
      budget = { ...budget, count: newCount };
      attrs = buildAttributes(newCount);
      // Replace geometry with the smaller buffer set.
      geometry = new Geometry(gl, {
        position: { size: 3, data: attrs.position },
        seed: { size: 1, data: attrs.seed },
      });
      mesh = new Mesh(gl, { geometry, program, mode: gl.POINTS });
    };

    const tick = (now: number) => {
      const tSec = (now - t0) / 1000;
      program.uniforms.uTime.value = tSec;

      // Manual draw -- no scene graph, no camera matrix overhead.
      mesh.draw();

      // fps sampling for the first FRAME_SAMPLE frames after mount.
      if (sampledFrames < FRAME_SAMPLE) {
        if (sampledFrames === 0) sampleStart = now;
        sampledFrames++;
        if (sampledFrames === FRAME_SAMPLE) {
          const elapsedSec = (now - sampleStart) / 1000;
          const avgFps = FRAME_SAMPLE / elapsedSec;
          if (avgFps < TARGET_MIN_FPS) {
            if (!watchdogTriggered) {
              watchdogTriggered = true;
              halveBudget();
              // Reset the sampler -- give the trimmed budget a chance.
              sampledFrames = 0;
            } else {
              // Second failure -- bail entirely. Hide the canvas; the AVIF
              // poster underneath is our LCP and looks fine on its own.
              if (canvasRef.current) canvasRef.current.style.opacity = '0';
              cancelAnimationFrame(rafId);
              return;
            }
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    // --- cleanup ----------------------------------------------------------
    return () => {
      cancelAnimationFrame(rafId);
      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener('resize', resize);

      // Drop GL resources before yanking the canvas. OGL doesn't expose a
      // catch-all dispose, but losing context releases everything attached
      // to it -- and removing the canvas from the DOM is the trigger.
      try {
        const loseExt = gl.getExtension('WEBGL_lose_context');
        loseExt?.loseContext();
      } catch {
        // best-effort; not all browsers expose this
      }
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      canvasRef.current = null;
    };
  }, [tier]);

  // --- visible-prop crossfade ----------------------------------------------
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    // Direct DOM, no Framer -- this layer is critical-path-adjacent and we
    // don't want React state churn on every frame.
    c.style.opacity = visible ? '1' : '0';
  }, [visible]);

  return <div ref={wrapRef} className={className} aria-hidden />;
}
