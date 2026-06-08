#!/usr/bin/env node
// Regenerates every Khata app-icon asset from a single source-of-truth glyph.
//
// The rupee mark (₹) is baked in as a vector <path> traced from Noto Sans Bold,
// so the output is font-independent and renders identically on every machine,
// browser and CI runner. Ratios are tuned per platform so the mark stays inside
// each launcher's safe zone (Android adaptive ≈ 66%, PWA maskable ≈ 80%).
//
// Requirements: ImageMagick 7 (`magick`) built with librsvg.
// Run:  node apps/web/scripts/generate-icons.mjs   (from anywhere)

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, "..");
const tmp = mkdtempSync(join(tmpdir(), "khata-icons-"));

// ── Glyph (Noto Sans Bold ₹, U+20B9) ────────────────────────────────────────
const GLYPH =
  "M245 0 65 314V388H125Q178 388 214.0 411.5Q250 435 260 477H65V551H259Q250 589 222.0 614.5Q194 640 144 640H65V714H516V640H359Q394 602 403 551H516V477H405Q395 403 348.0 361.5Q301 320 227 305L423 0Z";
const G_MIDX = (65 + 516) / 2; // 290.5
const G_MIDY = (0 + 714) / 2; //  357
const G_HEIGHT = 714;

// Shared paint. Warm radial backdrop + vertical gold + soft amber glow.
const defs = `
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%">
      <stop offset="0%" stop-color="#3a2a0a"/>
      <stop offset="55%" stop-color="#15110a"/>
      <stop offset="100%" stop-color="#0a0a0b"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fde68a"/>
      <stop offset="45%" stop-color="#fcd34d"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="0" stdDeviation="10" flood-color="#f59e0b" flood-opacity="0.55"/>
    </filter>
  </defs>`;

// Place the glyph: scaled to `frac` of canvas height, y-flipped (font is y-up),
// centred horizontally and nudged up 1.5% for optical balance (the leg drops low).
function glyph(C, frac) {
  const s = (frac * C) / G_HEIGHT;
  const cx = C / 2;
  const cy = C * 0.485;
  return `<g filter="url(#glow)" transform="translate(${cx} ${cy}) scale(${s} ${-s}) translate(${-G_MIDX} ${-G_MIDY})"><path d="${GLYPH}" fill="url(#gold)"/></g>`;
}

// variant: rounded | square | round | fg   (fg = transparent adaptive foreground)
function svg(C, variant, frac) {
  let bg = "";
  if (variant === "rounded")
    bg = `<rect width="${C}" height="${C}" rx="${C * 0.225}" fill="url(#bg)"/>`;
  else if (variant === "square")
    bg = `<rect width="${C}" height="${C}" fill="url(#bg)"/>`;
  else if (variant === "round")
    bg = `<circle cx="${C / 2}" cy="${C / 2}" r="${C / 2}" fill="url(#bg)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${C} ${C}" width="${C}" height="${C}">${defs}${bg}${glyph(C, frac)}</svg>`;
}

function render(variant, frac, size, outPath) {
  const src = join(tmp, `${variant}-${size}.svg`);
  writeFileSync(src, svg(512, variant, frac));
  execFileSync("magick", ["-background", "none", "-density", "384", src, "-resize", `${size}x${size}`, outPath]);
  console.log("  ", outPath.replace(webRoot + "/", ""));
}

const FG_FRAC = 0.36; // adaptive foreground — extra padding for 66% safe zone
const SQUARE_FRAC = 0.44; // PWA maskable — fits 80% safe zone
const ROUNDED_FRAC = 0.46;

console.log("Generating Khata icons…");

// ── PWA / web ────────────────────────────────────────────────────────────────
render("square", SQUARE_FRAC, 192, join(webRoot, "public/icons/icon-192.png"));
render("square", SQUARE_FRAC, 512, join(webRoot, "public/icons/icon-512.png"));
render("square", ROUNDED_FRAC, 180, join(webRoot, "public/apple-touch-icon.png"));

// favicon.svg — self-contained vector source of truth
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${defs}
  <rect width="512" height="512" rx="115.2" fill="url(#bg)"/>
  ${glyph(512, ROUNDED_FRAC)}
</svg>`;
writeFileSync(join(webRoot, "public/favicon.svg"), faviconSvg + "\n");
console.log("   public/favicon.svg");

// favicon.ico — multi-resolution from the rounded mark
const icoBase = join(tmp, "favicon-base.png");
render("rounded", ROUNDED_FRAC, 256, icoBase);
execFileSync("magick", [icoBase, "-define", "icon:auto-resize=48,32,16", join(webRoot, "public/favicon.ico")]);
console.log("   public/favicon.ico");

// ── Android (Capacitor) ──────────────────────────────────────────────────────
const res = join(webRoot, "android/app/src/main/res");
const launcher = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const foreground = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

for (const [d, px] of Object.entries(launcher)) {
  render("rounded", ROUNDED_FRAC, px, join(res, `mipmap-${d}/ic_launcher.png`));
  render("round", ROUNDED_FRAC, px, join(res, `mipmap-${d}/ic_launcher_round.png`));
}
for (const [d, px] of Object.entries(foreground)) {
  render("fg", FG_FRAC, px, join(res, `mipmap-${d}/ic_launcher_foreground.png`));
}

rmSync(tmp, { recursive: true, force: true });
console.log("Done.");
