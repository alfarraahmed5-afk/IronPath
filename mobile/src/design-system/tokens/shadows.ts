/**
 * IronPath shadow + elevation tokens.
 *
 * iOS leans on shadow*; Android leans on elevation. Both keys are present
 * on every preset so React Native picks the right one per platform.
 *
 * `ember` is a subtle crimson-tinted shadow used under brand-colored hero
 * fills (PR badge, celebrate ring stroke). Lens 2 spec.
 */
export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  // Subtle crimson glow. Use behind brand-coloured hero fills (PR badge,
  // celebrate hero halo, finish-screen number flares). Per lens 2 P0-6 +
  // P1-4: `<Surface variant="floating">` adds an ember accent line on
  // Android because elevation alone reads flat.
  ember: {
    shadowColor: '#C8102E',  // brand-500
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export type Shadows = typeof shadows;
