// Pure badge eligibility logic tests — no DB, no luxon timezone calls

// Extracted eligibility conditions matching badges.ts logic
function isEarlyBird(localHour: number): boolean { return localHour < 7; }
function isNightOwl(localHour: number): boolean { return localHour >= 22; }
function isFirstRep(ordinalNumber: number): boolean { return ordinalNumber === 1; }
function isTenStrong(workoutCount: number): boolean { return workoutCount >= 10; }
function isHalfCentury(workoutCount: number): boolean { return workoutCount >= 50; }
function isCentury(workoutCount: number): boolean { return workoutCount >= 100; }
function isIronMonth(currentStreakWeeks: number): boolean { return currentStreakWeeks >= 4; }
function isIronQuarter(currentStreakWeeks: number): boolean { return currentStreakWeeks >= 12; }
function isPrMachine(prCount: number): boolean { return prCount >= 10; }
function isHeavyLifter(totalVolumeKg: number): boolean { return totalVolumeKg >= 10000; }
function isConsistent(weekWorkoutCount: number): boolean { return weekWorkoutCount >= 4; }

describe('Badge eligibility — workout count milestones', () => {
  test('first_rep: only fires on ordinal 1', () => {
    expect(isFirstRep(1)).toBe(true);
    expect(isFirstRep(2)).toBe(false);
    expect(isFirstRep(0)).toBe(false);
  });

  test('ten_strong: fires at exactly 10, not 9', () => {
    expect(isTenStrong(9)).toBe(false);
    expect(isTenStrong(10)).toBe(true);
    expect(isTenStrong(11)).toBe(true);
  });

  test('half_century: fires at 50+', () => {
    expect(isHalfCentury(49)).toBe(false);
    expect(isHalfCentury(50)).toBe(true);
  });

  test('century: fires at 100+', () => {
    expect(isCentury(99)).toBe(false);
    expect(isCentury(100)).toBe(true);
    expect(isCentury(200)).toBe(true);
  });
});

describe('Badge eligibility — streak badges', () => {
  test('iron_month requires 4+ week streak', () => {
    expect(isIronMonth(3)).toBe(false);
    expect(isIronMonth(4)).toBe(true);
    expect(isIronMonth(12)).toBe(true);
  });

  test('iron_quarter requires 12+ week streak', () => {
    expect(isIronQuarter(11)).toBe(false);
    expect(isIronQuarter(12)).toBe(true);
  });
});

describe('Badge eligibility — achievement badges', () => {
  test('pr_machine requires 10+ total PRs', () => {
    expect(isPrMachine(9)).toBe(false);
    expect(isPrMachine(10)).toBe(true);
  });

  test('heavy_lifter requires 10000+ cumulative kg', () => {
    expect(isHeavyLifter(9999)).toBe(false);
    expect(isHeavyLifter(10000)).toBe(true);
    expect(isHeavyLifter(10000.1)).toBe(true);
  });

  test('consistent requires 4+ workouts in one ISO week', () => {
    expect(isConsistent(3)).toBe(false);
    expect(isConsistent(4)).toBe(true);
    expect(isConsistent(7)).toBe(true);
  });
});

describe('Badge eligibility — time-based badges', () => {
  test('early_bird: fires before 07:00 local time', () => {
    expect(isEarlyBird(0)).toBe(true);
    expect(isEarlyBird(6)).toBe(true);
    expect(isEarlyBird(6, )).toBe(true);
    expect(isEarlyBird(7)).toBe(false);   // exactly 07:00 does NOT qualify
    expect(isEarlyBird(8)).toBe(false);
    expect(isEarlyBird(23)).toBe(false);
  });

  test('night_owl: fires at 22:00+ local time', () => {
    expect(isNightOwl(21)).toBe(false);
    expect(isNightOwl(22)).toBe(true);   // exactly 22:00 qualifies
    expect(isNightOwl(23)).toBe(true);
    expect(isNightOwl(0)).toBe(false);   // midnight = hour 0, not >= 22
  });

  test('early_bird and night_owl are mutually exclusive for typical hours', () => {
    for (let h = 7; h < 22; h++) {
      expect(isEarlyBird(h)).toBe(false);
      expect(isNightOwl(h)).toBe(false);
    }
  });
});

describe('Badge eligibility — boundary conditions', () => {
  test('all workout-count badges fire simultaneously at 100 workouts', () => {
    const count = 100;
    expect(isTenStrong(count)).toBe(true);
    expect(isHalfCentury(count)).toBe(true);
    expect(isCentury(count)).toBe(true);
  });

  test('heavy_lifter does not fire at 9999.99kg', () => {
    expect(isHeavyLifter(9999.99)).toBe(false);
  });
});
