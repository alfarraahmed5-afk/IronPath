# Marketing audio assets -- licenses & attribution

All shipped audio assets in `marketing/public/audio/` are documented here.
Per house policy: **CC0 only**, with full source provenance recorded so
we can re-derive the bundle from scratch if needed. No AI-generated
audio without a ToS-version-locked log.

---

## Current status -- PLACEHOLDERS

> The files currently shipped are **silent Opus placeholders** generated
> locally because `ffmpeg` is unavailable in the build sandbox. They are
> structurally valid Ogg/Opus streams (Howler decodes them, sprite
> seeking works, the audio pipeline can be exercised end-to-end) but
> they emit no sound. They MUST be replaced with real CC0 sources
> before the marketing site goes to GA.
>
> Generator: `marketing/public/audio/generate-silent-opus.py` -- a
> stdlib-only Python script that emits silent Ogg/Opus pages
> (TOC byte 0xF8, CELT-only, 20 ms frames, mono, 48 kHz).

| File | Size | sha256 | Source | License | Attribution |
| --- | ---: | --- | --- | --- | --- |
| `sfx-sprite.opus` | 6 491 B | `ce5464a51ed690102fc0d643868787a8c91cbdfaa4ad185cedfc16c8aa5911aa` | Self-generated silent placeholder (`generate-silent-opus.py`) | CC0 (placeholder) | None |
| `ambient-bed.opus` | 11 711 B | `76a1b01f4eda7a165dda0ac75c621644d24e850e11a9891963af8cf23d5f12df` | Self-generated silent placeholder (`generate-silent-opus.py`) | CC0 (placeholder) | None |

---

## Sprite layout

The sprite file is a single Opus stream containing 6 SFX clips at fixed
offsets. The offsets are duplicated in `marketing/lib/audio.ts` as the
`SPRITE` constant -- keep them in sync.

| Sprite key | Offset (ms) | Duration (ms) | Intent |
| --- | ---: | ---: | --- |
| `cta-hover`   |    0 |  180 | Soft tick on primary CTA hover |
| `cta-confirm` |  200 |  280 | Confirmation chime on CTA click |
| `plate-clack` |  600 |  220 | Plate-on-plate metallic clack |
| `weight-drop` |  900 | 1400 | Loaded barbell drop (denouement scene) |
| `tick`        | 2400 |   60 | Sub-second metronome tick |
| `gym-door`    | 2600 | 1800 | Heavy door swing + close |

Total sprite duration: 4 400 ms (covers the last clip with 0 ms tail).

The ambient bed (`ambient-bed.opus`) is a separate file intended to
loop seamlessly. Placeholder duration: 8 000 ms.

---

## Replacement workflow (when ffmpeg is available)

1. Source each clip from the **Freesound CC0 filter**
   (https://freesound.org/search/?f=license:%22Creative+Commons+0%22),
   ElevenLabs free tier, or self-recording. Avoid CC-BY (we do not want
   to maintain attribution UI on the marketing site).
2. Trim each clip to its target duration in Audacity. Apply a 5 ms
   linear fade-in/out to prevent click artifacts at sprite boundaries.
3. Normalize each clip independently to **-16 LUFS** (true peak
   ≤ -3 dBTP). Per-sound trim is then applied at runtime in
   `lib/audio.ts` (see `VOLUMES`).
4. Pad each clip with leading/trailing silence so its file duration
   exactly matches the offsets in the table above (offsets must be
   contiguous so `concat` produces correct boundaries).
5. Assemble with ffmpeg:

   ```bash
   ffmpeg -i cta-hover.wav -i cta-confirm.wav -i plate-clack.wav \
          -i weight-drop.wav -i tick.wav -i gym-door.wav \
          -filter_complex "concat=n=6:v=0:a=1" \
          -ar 48000 -ac 1 -c:a libopus -b:a 64k -application audio \
          marketing/public/audio/sfx-sprite.opus

   ffmpeg -i ambient-bed-source.wav \
          -ar 48000 -ac 1 -c:a libopus -b:a 48k -application audio \
          marketing/public/audio/ambient-bed.opus
   ```

6. Verify final sizes: sprite ≤ 120 KB, ambient ≤ 80 KB.
7. Recompute sha256 and update the table above. Replace the "PLACEHOLDER"
   row with one row per source clip, including:
   - Source URL (permalink, not a search page)
   - License version (e.g. "CC0 1.0 Universal")
   - Author handle (even though attribution isn't required for CC0,
     we still log it for traceability)
   - Original file sha256 (the source WAV/MP3 you downloaded)

---

## Verification checklist before flipping the placeholder flag

- [ ] All 6 SFX have non-silent waveforms (eyeball in Audacity).
- [ ] Each SFX boundary in the sprite has ≥ 5 ms of silence on each side
      so ducking and overlap don't bleed into adjacent clips.
- [ ] Ambient bed loops without an audible seam (head and tail samples
      cross-faded).
- [ ] Total marketing audio bundle ≤ 200 KB (sprite + ambient + tags).
- [ ] Lighthouse audit -- no autoplay warning, no console errors.
- [ ] Manual smoke test on iOS Safari: silent-buffer trick unlocks
      AudioContext on first toggle-to-on.
