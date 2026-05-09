import { PDFDocument, StandardFonts, rgb, PDFImage } from 'pdf-lib';
import QRCode from 'qrcode';

/**
 * IronPath member-acquisition QR poster generator. Phase C.1.
 *
 * Plan §4.5 / §17 — the gym owner prints this and tapes it to the wall;
 * every other activation metric is downstream. We render server-side so
 * the same PDF can later feed email-blast attachments and the in-product
 * Settings/Grow download flow without duplicating layout logic.
 *
 * Design constraints:
 *   - Two paper sizes: A4 (210×297 mm) for desk printing, A3 (297×420 mm)
 *     for full-wall posting. Same layout, scaled.
 *   - Bleed-aware margins (~15 mm) so home printers don't clip the QR.
 *   - QR encodes a join URL keyed by invite_code. Even if the landing
 *     page isn't live yet, the URL is forward-compatible — phones show
 *     it as an actionable link in their camera UI.
 *   - Gym logo embedded if provided + reachable; otherwise we use a
 *     solid accent-color band so the poster still feels branded.
 *   - Helvetica for now (pdf-lib stdlib). Inter would require font
 *     embedding (~200KB) — defer until brand bake-off justifies it.
 */

export type PosterSize = 'a4' | 'a3';

export interface PosterInput {
  gymName: string;
  inviteCode: string;
  accentColor?: string | null;     // '#RRGGBB'
  logoBytes?: Uint8Array | null;   // PNG or JPEG bytes; null/undefined = use accent band
  size: PosterSize;
  joinUrlBase?: string;            // default 'https://ironpath.app/join'
}

interface RGB { r: number; g: number; b: number; }

function parseHexColor(hex: string | null | undefined, fallback: RGB): RGB {
  if (!hex) return fallback;
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return { r: ((n >> 16) & 0xff) / 255, g: ((n >> 8) & 0xff) / 255, b: (n & 0xff) / 255 };
}

const PAGE_DIMENSIONS_PT: Record<PosterSize, { w: number; h: number }> = {
  // pdf-lib uses points (72 pt = 1 inch). 1 mm ≈ 2.8346 pt.
  a4: { w: 595.28, h: 841.89 },   // 210 × 297 mm
  a3: { w: 841.89, h: 1190.55 },  // 297 × 420 mm
};

export async function generatePoster(input: PosterInput): Promise<Uint8Array> {
  const { gymName, inviteCode, accentColor, logoBytes, size } = input;
  const joinUrlBase = (input.joinUrlBase ?? 'https://ironpath.app/join').replace(/\/+$/, '');
  const joinUrl = `${joinUrlBase}/${encodeURIComponent(inviteCode)}`;

  const { w, h } = PAGE_DIMENSIONS_PT[size];
  const accent = parseHexColor(accentColor, { r: 1, g: 0x6b / 0xff, b: 0x35 / 0xff }); // #FF6B35
  const ink = { r: 0.07, g: 0.07, b: 0.08 }; // close to plan §3.2 ink-950
  const muted = { r: 0.54, g: 0.54, b: 0.58 }; // ink-400-ish

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([w, h]);

  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);
  const monoBold = await pdf.embedFont(StandardFonts.CourierBold);

  const margin = w * 0.06;        // ~6% page width — scales with paper size
  const inner = w - margin * 2;

  // ── Header band ─────────────────────────────────────────────────────────
  // If a logo is provided, embed it on top of a thin accent strip.
  // If not, use a thicker accent band as the brand anchor.
  let cursorY = h - margin;
  const accentBandHeight = logoBytes ? w * 0.012 : w * 0.06;
  page.drawRectangle({
    x: margin, y: cursorY - accentBandHeight, width: inner, height: accentBandHeight,
    color: rgb(accent.r, accent.g, accent.b),
  });
  cursorY -= accentBandHeight + (logoBytes ? w * 0.04 : w * 0.05);

  if (logoBytes) {
    let logoImage: PDFImage | null = null;
    try {
      logoImage = await pdf.embedPng(logoBytes);
    } catch {
      try { logoImage = await pdf.embedJpg(logoBytes); } catch { logoImage = null; }
    }
    if (logoImage) {
      // Scale the logo to fit a max box; preserve aspect ratio.
      const maxLogoW = inner * 0.35;
      const maxLogoH = h * 0.10;
      const scale = Math.min(maxLogoW / logoImage.width, maxLogoH / logoImage.height, 1);
      const lw = logoImage.width * scale;
      const lh = logoImage.height * scale;
      page.drawImage(logoImage, {
        x: (w - lw) / 2,
        y: cursorY - lh,
        width: lw,
        height: lh,
      });
      cursorY -= lh + w * 0.04;
    }
  }

  // ── Headline ────────────────────────────────────────────────────────────
  const headlineSize = w * 0.052;          // ~31pt on A4, ~44pt on A3
  const headline = `Join ${gymName}`;
  const headlineWidth = helvBold.widthOfTextAtSize(headline, headlineSize);
  page.drawText(headline, {
    x: (w - headlineWidth) / 2,
    y: cursorY - headlineSize,
    size: headlineSize,
    font: helvBold,
    color: rgb(ink.r, ink.g, ink.b),
  });
  cursorY -= headlineSize + w * 0.012;

  const subSize = w * 0.025;
  const sub = 'on IronPath';
  const subWidth = helv.widthOfTextAtSize(sub, subSize);
  page.drawText(sub, {
    x: (w - subWidth) / 2,
    y: cursorY - subSize,
    size: subSize,
    font: helv,
    color: rgb(muted.r, muted.g, muted.b),
  });
  cursorY -= subSize + w * 0.05;

  // ── QR code ─────────────────────────────────────────────────────────────
  // Render the QR as a high-resolution PNG once, then embed. Generous error
  // correction so a logo overlay (future) and print smudges don't break it.
  const qrPngBytes = await QRCode.toBuffer(joinUrl, {
    errorCorrectionLevel: 'H',
    margin: 1,
    scale: 10,
    color: { dark: '#0A0A0B', light: '#FFFFFF' },
  });
  const qrImage = await pdf.embedPng(qrPngBytes);
  const qrSide = inner * 0.55;
  page.drawImage(qrImage, {
    x: (w - qrSide) / 2,
    y: cursorY - qrSide,
    width: qrSide,
    height: qrSide,
  });
  cursorY -= qrSide + w * 0.035;

  // ── Instruction line ────────────────────────────────────────────────────
  const instSize = w * 0.025;
  const inst = 'Open your phone camera and point it at the code.';
  const instWidth = helv.widthOfTextAtSize(inst, instSize);
  page.drawText(inst, {
    x: (w - instWidth) / 2,
    y: cursorY - instSize,
    size: instSize,
    font: helv,
    color: rgb(ink.r, ink.g, ink.b),
  });
  cursorY -= instSize + w * 0.025;

  // ── Manual code fallback ────────────────────────────────────────────────
  const codeLabelSize = w * 0.018;
  const codeLabel = 'or enter code';
  const codeLabelWidth = helv.widthOfTextAtSize(codeLabel, codeLabelSize);
  page.drawText(codeLabel, {
    x: (w - codeLabelWidth) / 2,
    y: cursorY - codeLabelSize,
    size: codeLabelSize,
    font: helv,
    color: rgb(muted.r, muted.g, muted.b),
  });
  cursorY -= codeLabelSize + w * 0.008;

  const codeSize = w * 0.052;
  const codeText = inviteCode.toUpperCase();
  const codeWidth = monoBold.widthOfTextAtSize(codeText, codeSize);
  page.drawText(codeText, {
    x: (w - codeWidth) / 2,
    y: cursorY - codeSize,
    size: codeSize,
    font: monoBold,
    color: rgb(ink.r, ink.g, ink.b),
  });

  // ── Footer ──────────────────────────────────────────────────────────────
  const footerSize = w * 0.014;
  const footer = 'ironpath.app';
  const footerWidth = mono.widthOfTextAtSize(footer, footerSize);
  page.drawText(footer, {
    x: (w - footerWidth) / 2,
    y: margin,
    size: footerSize,
    font: mono,
    color: rgb(muted.r, muted.g, muted.b),
  });

  return pdf.save();
}

/**
 * Slug a gym name into a filename-safe token. Lowercased, ASCII letters/digits
 * only, hyphen-joined. Empty/garbage names fall back to 'gym'.
 */
export function slugifyGymName(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 40);
  return slug || 'gym';
}
