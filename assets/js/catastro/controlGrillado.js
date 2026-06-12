import { isDarkMode, coordsToDisplay, coordsToMap } from "../core/configuracion";
import { el } from "../core/elements";
// proj4, defs y proyeccionDisplay están centralizados en configuracion.js.
// isDarkMode(), coordsToDisplay() y coordsToMap() son helpers exportados desde allí.

let activo = false;
let overlay = null;

function niceInterval(range) {
  const raw = range / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const f of [1, 2, 5, 10]) if (mag * f >= raw) return mag * f;
  return mag * 10;
}

function toUTM(c3857) {
  return coordsToDisplay(c3857);
}

function toPixel(utmCoord) {
  return global.mapa.getPixelFromCoordinate(coordsToMap(utmCoord));
}

function fmt(v) {
  return Math.round(v).toLocaleString("es-PE");
}

function drawLabel(ctx, text, x, y, align, bg, fg) {
  const tw = ctx.measureText(text).width;
  const pad = 3;
  const rx = align === "center" ? x - tw / 2 - pad : x;
  ctx.fillStyle = bg;
  ctx.fillRect(rx, y - 7, tw + pad * 2, 14);
  ctx.fillStyle = fg;
  ctx.textAlign = align;
  ctx.fillText(text, align === "center" ? x : x + pad, y);
}

function drawCornerLabel(ctx, lines, x, y, anchorX, anchorY, bg, fg) {
  const lineH = 13;
  const pad = 4;
  const maxW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const boxW = maxW + pad * 2;
  const boxH = lines.length * lineH + pad * 2;
  const bx = anchorX === "left" ? x : x - boxW;
  const by = anchorY === "top" ? y : y - boxH;
  ctx.fillStyle = bg;
  ctx.fillRect(bx, by, boxW, boxH);
  ctx.fillStyle = fg;
  ctx.textAlign = anchorX === "left" ? "left" : "right";
  lines.forEach((line, i) => {
    const tx = anchorX === "left" ? bx + pad : bx + boxW - pad;
    ctx.fillText(line, tx, by + pad + lineH * i + lineH * 0.75);
  });
}

function dibujar() {
  if (!activo || !overlay || !global.mapa) return;

  const map = global.mapa;
  const size = map.getSize();
  if (!size) return;

  const [W, H] = size;
  overlay.width = W;
  overlay.height = H;

  const ctx = overlay.getContext("2d");
  ctx.clearRect(0, 0, W, H);

  // ── Colores ──────────────────────────────────────────────────────────────
  // Las líneas usan doble trazo: sombra oscura + línea blanca encima,
  // para que sean visibles sobre cualquier capa base (satélite, OSM, etc.)
  const LINE_SHADOW = "rgba(0,0,0,0.55)";
  const LINE_COLOR  = "rgba(255,255,255,0.80)";
  const LINE_DASH   = [5, 7];

  const textCol = "#ffffff";
  const bgCol   = isDarkMode() ? "rgba(0,0,0,0.72)" : "rgba(20,20,20,0.65)";

  // Esquinas visibles del viewport en UTM. Se usan las cuatro porque la vista
  // está rotada (convergencia de meridianos) y dos diagonales no cubren todo.
  const esquinasUTM = [
    [0, 0],
    [W, 0],
    [0, H],
    [W, H],
  ].map((p) => {
    const c = map.getCoordinateFromPixel(p);
    return c ? toUTM(c) : null;
  });
  if (esquinasUTM.some((u) => !u)) return;

  const xMin = Math.min(...esquinasUTM.map((u) => u[0]));
  const xMax = Math.max(...esquinasUTM.map((u) => u[0]));
  const yMin = Math.min(...esquinasUTM.map((u) => u[1]));
  const yMax = Math.max(...esquinasUTM.map((u) => u[1]));

  if (xMax <= xMin || yMax <= yMin) return;

  const xInt = niceInterval(xMax - xMin);
  const yInt = niceInterval(yMax - yMin);

  ctx.font = "bold 10px Roboto, Arial, sans-serif";
  ctx.textBaseline = "middle";

  function traceLine(x1, y1, x2, y2) {
    // Shadow pass
    ctx.strokeStyle = LINE_SHADOW;
    ctx.lineWidth = 2.2;
    ctx.setLineDash(LINE_DASH);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    // Bright pass
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // ── Vertical lines (X = const in UTM) ───────────────────────────────────
  const x0 = Math.ceil(xMin / xInt) * xInt;
  for (let x = x0; x <= xMax; x += xInt) {
    const pTop = toPixel([x, yMax + yInt]);
    const pBot = toPixel([x, yMin - yInt]);
    if (!pTop || !pBot) continue;

    traceLine(pTop[0], 0, pBot[0], H);

    const px = pTop[0] * 0.1 + pBot[0] * 0.9;
    if (px > 40 && px < W - 40) {
      drawLabel(ctx, `X ${fmt(x)}`, px, H - 12, "center", bgCol, textCol);
    }
  }

  // ── Horizontal lines (Y = const in UTM) ─────────────────────────────────
  const y0 = Math.ceil(yMin / yInt) * yInt;
  for (let y = y0; y <= yMax; y += yInt) {
    const pLeft = toPixel([xMin - xInt, y]);
    const pRight = toPixel([xMax + xInt, y]);
    if (!pLeft || !pRight) continue;

    traceLine(0, pLeft[1], W, pRight[1]);

    const py = pLeft[1];
    if (py > 15 && py < H - 20) {
      drawLabel(ctx, `Y ${fmt(y)}`, 4, py, "left", bgCol, textCol);
    }
  }

  // ── Corner coordinate labels ─────────────────────────────────────────────
  ctx.setLineDash([]);
  ctx.lineWidth = 1;
  ctx.font = "bold 10px Roboto, Arial, sans-serif";

  const corners = [
    { utm: esquinasUTM[0], px: [2, 2], anchorX: "left", anchorY: "top" },
    { utm: esquinasUTM[1], px: [W - 2, 2], anchorX: "right", anchorY: "top" },
    { utm: esquinasUTM[2], px: [2, H - 2], anchorX: "left", anchorY: "bottom" },
    {
      utm: esquinasUTM[3],
      px: [W - 2, H - 2],
      anchorX: "right",
      anchorY: "bottom",
    },
  ];

  corners.forEach(({ utm: u, px, anchorX, anchorY }) => {
    if (!u) return;
    drawCornerLabel(
      ctx,
      [`X ${fmt(u[0])}`, `Y ${fmt(u[1])}`],
      px[0],
      px[1],
      anchorX,
      anchorY,
      bgCol,
      textCol,
    );
  });
}

function limpiarCanvas() {
  if (!overlay) return;
  const ctx = overlay.getContext("2d");
  ctx.clearRect(0, 0, overlay.width, overlay.height);
}

// ── Wire up button ───────────────────────────────────────────────────────────
const btnGrillado = el("btnGrillado");

let eventosRegistrados = false;

function registrarEventosMapa() {
  if (eventosRegistrados || !global.mapa) return;
  global.mapa.on("moveend", dibujar);
  global.mapa.on("change:size", dibujar);
  eventosRegistrados = true;
}

btnGrillado?.addEventListener("click", () => {
  activo = !activo;
  btnGrillado.classList.toggle("btn-primary", activo);
  btnGrillado.classList.toggle("btn-secondary", !activo);

  registrarEventosMapa();

  if (activo) {
    if (!overlay) {
      overlay = document.createElement("canvas");
      overlay.style.cssText =
        "position:absolute;top:0;left:0;pointer-events:none;z-index:10;";
      document.getElementById("map").appendChild(overlay);
    }
    dibujar();
  } else {
    limpiarCanvas();
  }
});

// Redraw when theme changes
new MutationObserver(() => {
  if (activo) dibujar();
}).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-bs-theme"],
});
