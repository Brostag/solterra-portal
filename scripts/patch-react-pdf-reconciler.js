#!/usr/bin/env node
// Patches @react-pdf/reconciler so it accepts react.transitional.element
// (used by React 19 canary, which Next.js 15 uses internally on the server).
// Without this, PDF generation throws "Minified React error #31".
const fs = require("fs");
const path = require("path");

const target = path.join(
  __dirname,
  "..",
  "node_modules",
  "@react-pdf",
  "reconciler",
  "lib",
  "reconciler-23.js"
);

if (!fs.existsSync(target)) {
  console.log("[patch] reconciler-23.js not found — skipping");
  process.exit(0);
}

let content = fs.readFileSync(target, "utf8");

if (content.includes("react.transitional.element")) {
  console.log("[patch] @react-pdf/reconciler already patched — skipping");
  process.exit(0);
}

const before = content.length;

content = content.replace(
  'd=s?Symbol.for("react.element"):60103,',
  'd=s?Symbol.for("react.element"):60103,dT=s?Symbol.for("react.transitional.element"):null,'
);

content = content.replaceAll("$typeof){case d:", "$typeof){case dT:case d:");

if (content.length === before) {
  console.error("[patch] ERROR: No changes applied — pattern not found");
  process.exit(1);
}

fs.writeFileSync(target, content, "utf8");
console.log(`[patch] @react-pdf/reconciler patched (+${content.length - before} bytes)`);
