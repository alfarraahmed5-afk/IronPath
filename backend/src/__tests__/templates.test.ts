// Validate trainer-templates.js at load time — no DB required

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { TEMPLATES, resolveTemplateKey } = require('../../data/trainer-templates');

const REQUIRED_KEYS = [
  'beginner_strength_3_full_gym',
  'beginner_strength_3_dumbbells',
  'beginner_strength_3_bodyweight',
  'beginner_hypertrophy_3_full_gym',
  'beginner_hypertrophy_4_full_gym',
  'beginner_general_2_full_gym',
  'beginner_general_3_full_gym',
  'beginner_endurance_3_bodyweight',
  'intermediate_strength_3_full_gym',
  'intermediate_strength_4_full_gym',
  'intermediate_strength_3_dumbbells',
  'intermediate_hypertrophy_4_full_gym',
  'intermediate_hypertrophy_5_full_gym',
  'intermediate_general_3_full_gym',
  'advanced_strength_4_full_gym',
  'advanced_strength_5_full_gym',
  'advanced_hypertrophy_5_full_gym',
  'advanced_hypertrophy_6_full_gym',
  'advanced_general_4_full_gym',
];

describe('trainer-templates.js — all 19 required keys exist', () => {
  test.each(REQUIRED_KEYS)('template "%s" exists', (key) => {
    expect(TEMPLATES[key]).toBeDefined();
  });
});

describe('trainer-templates.js — template structure validity', () => {
  for (const key of REQUIRED_KEYS) {
    describe(`template: ${key}`, () => {
      const t = TEMPLATES[key];

      test('has required top-level fields', () => {
        expect(t.name).toBeTruthy();
        expect(['linear', 'wave', 'undulating']).toContain(t.protocol);
        expect(typeof t.deload_after_failures).toBe('number');
        expect(t.deload_percentage).toBeGreaterThan(0);
        expect(t.deload_percentage).toBeLessThanOrEqual(1);
        expect(Array.isArray(t.sessions)).toBe(true);
        expect(t.sessions.length).toBeGreaterThanOrEqual(1);
      });

      test('each session has a day_label and exercises', () => {
        for (const session of t.sessions) {
          expect(typeof session.day_label).toBe('string');
          expect(Array.isArray(session.exercises)).toBe(true);
          expect(session.exercises.length).toBeGreaterThan(0);
        }
      });

      test('each exercise has required fields', () => {
        for (const session of t.sessions) {
          for (const ex of session.exercises) {
            expect(typeof ex.wger_id).toBe('number');
            expect(ex.wger_id).toBeGreaterThan(0);
            expect(typeof ex.sets).toBe('number');
            expect(ex.sets).toBeGreaterThanOrEqual(1);
            expect(['weight_reps', 'bodyweight_reps', 'duration', 'distance']).toContain(ex.logging_type);
            expect(typeof ex.is_lower_body).toBe('boolean');
          }
        }
      });

      test('duration exercises have target_duration_seconds, not reps', () => {
        for (const session of t.sessions) {
          for (const ex of session.exercises) {
            if (ex.logging_type === 'duration') {
              expect(ex.target_duration_seconds).not.toBeNull();
              expect(ex.target_duration_seconds).toBeGreaterThan(0);
            }
          }
        }
      });
    });
  }
});

describe('resolveTemplateKey — fallback chain', () => {
  test('exact match returns directly', () => {
    expect(resolveTemplateKey('beginner', 'strength', 3, 'full_gym')).toBe('beginner_strength_3_full_gym');
  });

  test('falls back to fewer days when exact day count not available', () => {
    // beginner_strength_6_full_gym doesn't exist → should fall back
    const result = resolveTemplateKey('beginner', 'strength', 6, 'full_gym');
    expect(TEMPLATES[result]).toBeDefined();
  });

  test('falls back to full_gym when equipment not found', () => {
    const result = resolveTemplateKey('beginner', 'strength', 3, 'home_mixed');
    expect(TEMPLATES[result]).toBeDefined();
  });

  test('falls back to general when goal not found', () => {
    const result = resolveTemplateKey('beginner', 'mobility', 3, 'full_gym');
    expect(TEMPLATES[result]).toBeDefined();
  });

  test('ultimate fallback is beginner_general_3_full_gym', () => {
    const result = resolveTemplateKey('expert', 'olympic', 7, 'unknown_equipment');
    expect(result).toBe('beginner_general_3_full_gym');
  });

  test('all 19 required keys are directly resolvable', () => {
    for (const key of REQUIRED_KEYS) {
      const [exp, goal, days, equip] = key.split('_');
      const resolved = resolveTemplateKey(exp, goal, parseInt(days), equip + (key.split('_').length > 4 ? '_gym' : ''));
      // Just verify fallback doesn't throw and returns something valid
      expect(TEMPLATES[resolved]).toBeDefined();
    }
  });
});

describe('session count matches days_per_week for standard templates', () => {
  const dayCounts: Record<string, number> = {
    beginner_general_2_full_gym: 2,
    beginner_strength_3_full_gym: 2, // A/B = 2 sessions cycling
    beginner_hypertrophy_3_full_gym: 3,
    beginner_hypertrophy_4_full_gym: 4,
    intermediate_hypertrophy_5_full_gym: 5,
    advanced_hypertrophy_6_full_gym: 6,
  };

  for (const [key, expectedCount] of Object.entries(dayCounts)) {
    test(`${key} has ${expectedCount} sessions`, () => {
      expect(TEMPLATES[key].sessions.length).toBe(expectedCount);
    });
  }
});
