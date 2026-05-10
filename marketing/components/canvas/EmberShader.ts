// GLSL shaders for the ember-particle canvas.
//
// Vertex attributes (interleaved per-particle, set once at init):
//   position.xy  -- base spawn position in clip space (-1..1).
//   position.z   -- birth-phase offset (0..1), keeps particles desynchronized.
//   seed         -- per-particle pseudo-random for jitter / size variance.
//
// Uniforms (updated per frame):
//   uTime        -- seconds since canvas mount.
//   uResolution  -- canvas width/height in CSS px (for any FS-based math).
//
// Animation lives entirely in the vertex shader so we don't have to push a
// new buffer every frame. Each particle integrates its own age from uTime,
// wraps via mod() at age=1.0, and re-spawns visually without any JS work.

export const vertexShader = /* glsl */ `
attribute vec3 position;
attribute float seed;

uniform float uTime;
uniform vec2 uResolution;

varying float vAge;

void main() {
  // age in [0,1). Each particle has its own rate (seed-controlled).
  float age = position.z + uTime * (0.3 + seed * 0.4);
  age = mod(age, 1.0);
  vAge = age;

  // Subtle horizontal drift -- sin wave, period a few seconds, ±0.05 NDC.
  float driftX = sin(uTime * 0.5 + seed * 6.28) * 0.05;

  // Vertical travel: spawn near bottom (y - 0.7), rise 1.4 over a full life.
  vec2 pos = vec2(
    position.x + driftX,
    position.y + age * 1.4 - 0.7
  );

  gl_Position = vec4(pos, 0.0, 1.0);

  // Particles shrink as they rise and fade. Size also varies per-particle.
  gl_PointSize = (1.0 - age) * 6.0 * (0.5 + seed * 0.5);
}
`;

export const fragmentShader = /* glsl */ `
precision mediump float;

varying float vAge;

void main() {
  // brand-500 (#C8102E) in roughly linear sRGB. Slight bias toward warmer
  // ember red over the wire crimson -- this layer is additive over a B&W
  // poster, so the saturation reads stronger in screen space.
  vec3 ember = vec3(0.78, 0.06, 0.18);

  // Soft round point: distance from gl_PointCoord center, smoothstep 0.5→0.
  float d = length(gl_PointCoord - vec2(0.5));
  float alpha = (1.0 - vAge) * smoothstep(0.5, 0.0, d);

  // 0.6 max alpha keeps the layer from washing out the poster on tier-A
  // displays. mix-blend-screen on the parent <div> still gives it lift.
  gl_FragColor = vec4(ember, alpha * 0.6);
}
`;
