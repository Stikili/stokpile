import type { ReceiptModel } from '@/domain/receipt';
import { money } from '@/lib/money';

/**
 * Draws the receipt to a PNG (2× for sharp text in WhatsApp). Mirrors
 * <Receipt>: colours come from the design tokens, figures in Plex Mono.
 */
const W = 360;          // CSS px
const SCALE = 2;
const PAD = 20;
const ROW = 26;

export async function renderReceiptPng(model: ReceiptModel): Promise<Blob> {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  const c = {
    bg: token('--s-bg'), card: token('--s-card'), ink: token('--s-ink'), muted: token('--s-muted'),
    line: token('--s-line-2'), brand: token('--s-brand'),
  };
  const mono = '"IBM Plex Mono", ui-monospace, monospace';
  await Promise.all([
    document.fonts?.load(`500 12px ${mono}`),
    document.fonts?.load(`600 22px ${mono}`),
  ]).catch(() => undefined);

  const rows: Array<[string, string]> = [
    ['GROUP', model.groupName],
    ['MEMBER', model.memberName],
    ['PERIOD', model.period],
    ...(model.method ? [['METHOD', model.method] as [string, string]] : []),
    ...(model.capturedBy ? [['CAPTURED BY', model.capturedBy] as [string, string]] : []),
    ...model.lines.map((l) => [
      (l.clause ? `${l.label} ${l.clause}` : l.label).toUpperCase(),
      money(l.amount, { decimals: true }),
    ] as [string, string]),
  ];
  const H = PAD + 58 + rows.length * ROW + 64 + 48 + 34 + PAD;

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.scale(SCALE, SCALE);

  // Ground, then the card with a perforated bottom edge.
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = c.card;
  ctx.strokeStyle = c.line;
  ctx.lineWidth = 1;
  roundRect(ctx, 8.5, 8.5, W - 17, H - 17, 12);
  ctx.fill();
  ctx.stroke();

  const left = PAD + 8;
  const right = W - PAD - 8;
  let y = PAD + 22;

  // Head
  ctx.textAlign = 'center';
  ctx.fillStyle = c.ink;
  ctx.font = `600 11px ${mono}`;
  spaced(ctx, 'STOKPILE · RECEIPT', W / 2, y, 2.4);
  y += 18;
  ctx.fillStyle = c.muted;
  ctx.font = `500 10.5px ${mono}`;
  ctx.fillText(model.ref, W / 2, y);
  y += 16;
  dashed(ctx, left, right, y, c.line, [4, 3]);
  y += 22;

  // Rows with dotted leaders
  ctx.textAlign = 'left';
  for (const [k, v] of rows) {
    row(ctx, k, v, left, right, y, { key: c.muted, val: c.ink, line: c.line }, mono);
    y += ROW;
  }

  // Total
  y += 4;
  ctx.strokeStyle = c.line;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.stroke();
  y += 30;
  ctx.textAlign = 'left';
  ctx.fillStyle = c.muted;
  ctx.font = `500 10.5px ${mono}`;
  ctx.fillText('TOTAL', left, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = c.ink;
  ctx.font = `600 22px ${mono}`;
  ctx.fillText(money(model.total, { decimals: true }), right, y);

  // Stamp, in its own row
  y += 40;
  ctx.save();
  ctx.translate(right - 52, y - 6);
  ctx.rotate((-4 * Math.PI) / 180);
  ctx.strokeStyle = c.brand;
  ctx.fillStyle = c.brand;
  ctx.lineWidth = 2;
  roundRect(ctx, -52, -14, 104, 26, 6);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = `600 11px ${mono}`;
  spaced(ctx, 'RECORDED', 0, 4, 1.8);
  ctx.restore();

  // Footer
  y += 30;
  ctx.textAlign = 'left';
  ctx.fillStyle = c.muted;
  ctx.font = `500 9.5px ${mono}`;
  ctx.fillText(model.recordedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }), left, y);
  ctx.textAlign = 'right';
  ctx.fillText(`PAID ${model.paidCount}/${model.memberCount}`, right, y);

  // Perforation
  ctx.fillStyle = c.bg;
  for (let x = 14; x < W - 8; x += 12) {
    ctx.beginPath();
    ctx.arc(x, H - 8.5, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png'),
  );
}

function row(
  ctx: CanvasRenderingContext2D, k: string, v: string, left: number, right: number, y: number,
  c: { key: string; val: string; line: string }, mono: string,
) {
  ctx.textAlign = 'left';
  ctx.fillStyle = c.key;
  ctx.font = `500 10.5px ${mono}`;
  ctx.fillText(k, left, y);
  const kw = ctx.measureText(k).width;
  ctx.textAlign = 'right';
  ctx.fillStyle = c.val;
  ctx.font = `500 12.5px ${mono}`;
  const value = fit(ctx, v, right - left - kw - 24);
  ctx.fillText(value, right, y);
  const vw = ctx.measureText(value).width;
  dashed(ctx, left + kw + 6, right - vw - 6, y - 2, c.line, [1, 2.5]);
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

function dashed(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, color: string, dash: number[]) {
  if (x2 <= x1) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number) {
  // letterSpacing is ignored by browsers that don't support it; text still draws.
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  c.letterSpacing = `${tracking}px`;
  ctx.fillText(text, x, y);
  c.letterSpacing = '0px';
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
