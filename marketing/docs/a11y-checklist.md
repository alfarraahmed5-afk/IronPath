# Marketing accessibility — manual release checklist

Owner: Team Gamma γ3.
Run this checklist before promoting a marketing build to `ironpath.health`.
Automated gates (Playwright + axe + Lighthouse) cover the structural side; this
checklist covers what only a human can confirm: screen-reader narration quality,
forced-colors visual integrity, and motion comfort.

> Time budget: ~30 minutes per release. Skipping any section requires a written
> waiver in the PR description.

---

## 1. Screen reader: NVDA on Windows + Firefox

NVDA is the screen reader most independent gym owners with low vision will be
running. Firefox is the recommended pairing.

- [ ] Install NVDA (latest stable) and Firefox (latest stable).
- [ ] Enable NVDA speech viewer (`NVDA + n → Tools → Speech Viewer`).
- [ ] Open `https://staging.ironpath.health/`.
- [ ] First press of `Tab` reads "Skip to content, link". (Hard requirement.)
- [ ] Activate skip link with `Enter`. Focus must land inside `<main id="main">`.
- [ ] Press `H` to walk the heading tree. Order must be: h1 → h2 → h2 → h2…
      with no skips. Each heading must be readable as plain English (no
      "comma comma comma" from emoji).
- [ ] Press `K` to walk all links. Every link must read with discernible text
      ("Pricing, link" — not "page, link" or "link").
- [ ] Press `B` to walk all buttons. Every button must read with a label.
      `Sound off, button, not pressed` and `Motion: System, switch, mixed` are
      both acceptable.
- [ ] Activate the Motion toggle three times. NVDA must announce the new
      state on every press: "Reduced", "Full", "System (mixed)".
- [ ] Activate the Sound toggle. NVDA must announce "Sound on, pressed" /
      "Sound off, not pressed".
- [ ] Submit the lead form with empty required fields. NVDA must read each
      validation error in order; focus must land on the first invalid field.

## 2. Screen reader: VoiceOver on macOS + Safari

- [ ] Enable VoiceOver (`Cmd + F5`).
- [ ] Open `https://staging.ironpath.health/` in Safari.
- [ ] Use the rotor (`VO + U`) to walk the landmark list. Required landmarks:
      `banner` (header), `navigation`, `main`, `contentinfo` (footer).
- [ ] Walk the heading list. Same structural rules as NVDA.
- [ ] Walk the form-controls list. Every control reads its label.
- [ ] `VO + Right Arrow` through the page. Verify decorative ember/canvas
      elements are skipped (they should have `aria-hidden="true"`).

## 3. Forced colors / High contrast (Windows)

- [ ] Enable Windows Settings → Accessibility → Contrast themes → "Aquatic".
- [ ] Open `https://staging.ironpath.health/` in Edge.
- [ ] Verify every interactive control still shows a visible border or
      button-face — no controls become invisible against the background.
- [ ] Verify the focus ring is still visible on every focusable.
- [ ] Verify text contrast ≥ 4.5:1 for body and ≥ 3:1 for large text. Use
      Edge DevTools → Accessibility Inspector to spot-check.
- [ ] Switch to "Desert" theme. Repeat. Visual hierarchy should survive.

## 4. Reduce-motion mode (cross-OS)

Test BOTH the OS-level preference and the in-app Motion toggle.

- [ ] **macOS:** System Settings → Accessibility → Display → Reduce motion: On.
      Open `/`. Confirm: no GSAP timelines play, no canvas particle motion,
      Lenis smooth scroll is disabled, the ember-seam pulse is paused. Page is
      still navigable; copy is unchanged.
- [ ] **Windows:** Settings → Accessibility → Visual effects → Animation
      effects: Off. Repeat the same checks.
- [ ] In-app: leave OS at default, click Motion toggle to "Reduced". Same
      visual outcome as the OS-level test.
- [ ] In-app: click Motion toggle to "Full". Animations resume.
- [ ] In-app: click Motion toggle to "System". Animations follow the OS again.

## 5. Keyboard-only navigation

- [ ] Unplug mouse / disable trackpad.
- [ ] Tab from the top of the page to the bottom. Every interactive must be
      reachable; focus must always be visible; nothing may trap focus.
- [ ] Open the lead form. Fill it out using only Tab + typing. Submit with
      Enter on the submit button.
- [ ] Open `/pricing`. Tab through every CTA. All links navigate on `Enter`.
- [ ] Verify the sticky header never occludes a freshly-focused control —
      `scroll-margin-top: 80px` should kick in on every Tab.

## 6. Touch targets

- [ ] On a real phone (or Chrome DevTools mobile emulator at 360×800), tap
      every interactive in the header. The hit area must be ≥ 44×44 CSS
      pixels (WCAG 2.5.5 / 2.5.8). Both Sound and Motion toggles ship with
      `min-h-[44px] min-w-[44px]`.
- [ ] Tap the Motion toggle three times. The label updates after each tap.

## 7. Color & contrast spot-check

- [ ] DevTools → Accessibility → Contrast on the hero `<h1>`. Must be ≥ 4.5:1.
- [ ] On the price tier card numbers (large text). Must be ≥ 3:1.
- [ ] On any "ghost" ink-300 link. Must be ≥ 4.5:1 against ink-950.

## 8. Reduced-data / slow-network

- [ ] DevTools → Network → Throttling → "Slow 4G". Reload `/`. The skeleton
      hero and skip link must be interactive within 2.5s LCP. Lazy-loaded
      scenes appear as the user scrolls; nothing blocks input.

## 9. Sign-off

- [ ] All boxes checked or waived.
- [ ] Playwright a11y suite passing in BOTH motion modes (CI link: ___).
- [ ] Lighthouse CI passing in BOTH motion modes (CI link: ___).
- [ ] PR description references this checklist run.

Signed: ____________________   Date: __________
