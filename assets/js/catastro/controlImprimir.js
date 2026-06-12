import {
  logoMiniLight,
  tituloMunicipalidad,
  proyeccionDisplayTexto,
  coordsToDisplay,
  mostrarToast,
  fechaHoy,
} from "../core/configuracion";

const btnExportarPNG = document.getElementById("btnExportarPNG");

// Lienzo de salida: A4 apaisado a 96 dpi.
const A4_ANCHO = 1190;
const A4_ALTO = 842;
const MARGEN = 24;
const ALTO_TITULO = 56; // banda superior (título / logo)
const ALTO_PIE = 46; // banda inferior (escala / proyección / fecha)
const GUTTER = 24; // espacio para las etiquetas de la grilla alrededor del marco

// Lee la escala ya calculada en pantalla (#escala contiene
// "<strong>Escala:</strong>&nbsp;1:12,345"); s/d si aún no hay valor.
function leerEscala() {
  const el = document.getElementById("escala");
  if (!el) return "s/d";
  const texto = el.textContent
    .replace(/^\s*Escala:\s*/i, "")
    .replace(/ /g, " ")
    .trim();
  return texto || "s/d";
}

function fechaLegible() {
  return new Date().toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Etapa 1: compone los canvas de las capas en un lienzo del tamaño del
// viewport, usando la transformación matrix() de cada capa (técnica oficial
// de OpenLayers, válida también en pantallas HiDPI).
function componerMapaCanvas(size) {
  const canvas = document.createElement("canvas");
  canvas.width = size[0];
  canvas.height = size[1];
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let omitidas = 0;
  const capas = global.mapa
    .getViewport()
    .querySelectorAll(".ol-layer canvas, canvas.ol-layer");

  Array.prototype.forEach.call(capas, function (capa) {
    if (capa.width === 0) return;
    // Un canvas de origen cruzado sin CORS está "tainted": al leerlo lanza.
    // En vez de descartarlo en silencio, lo contamos y lo registramos.
    try {
      capa.toDataURL();
    } catch (e) {
      omitidas++;
      console.warn(
        "Impresión: capa omitida por restricción CORS (canvas tainted).",
        e,
      );
      return;
    }

    const opacity = capa.parentNode.style.opacity || capa.style.opacity;
    ctx.globalAlpha = opacity === "" ? 1 : Number(opacity);

    const transform = capa.style.transform;
    const match = transform && transform.match(/^matrix\(([^)]+)\)$/);
    if (match) {
      ctx.setTransform(...match[1].split(",").map(Number));
    } else {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.drawImage(capa, 0, 0);
  });

  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return { canvas, omitidas };
}

// Marco + grilla de coordenadas UTM alrededor del área de mapa dibujada.
// Se usan las esquinas visibles del viewport (no calculateExtent, que con la
// vista rotada por la convergencia devuelve un bbox inflado) y se transforman
// a la proyección de visualización (UTM) con coordsToDisplay().
function dibujarMarcoYGrilla(ctx, rect) {
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

  const size = global.mapa.getSize();
  if (!size || !size[0] || !size[1]) return;

  const cSW = global.mapa.getCoordinateFromPixel([0, size[1]]);
  const cNE = global.mapa.getCoordinateFromPixel([size[0], 0]);
  if (!cSW || !cNE) return;
  const sw = coordsToDisplay(cSW);
  const ne = coordsToDisplay(cNE);
  const utmMinX = sw[0],
    utmMaxX = ne[0],
    utmMinY = sw[1],
    utmMaxY = ne[1];

  const pasos = 4;
  const tick = 7;
  const fmt = (v) => Math.round(v).toLocaleString("es-PE");

  ctx.save();
  ctx.fillStyle = "#333";
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 1;
  ctx.font = "10px Arial, sans-serif";
  ctx.textBaseline = "middle";

  // Eje X: ticks arriba y abajo, etiquetas arriba.
  ctx.textAlign = "center";
  for (let i = 0; i <= pasos; i++) {
    const r = i / pasos;
    const px = rect.x + rect.w * r;
    ctx.beginPath();
    ctx.moveTo(px, rect.y);
    ctx.lineTo(px, rect.y - tick);
    ctx.moveTo(px, rect.y + rect.h);
    ctx.lineTo(px, rect.y + rect.h + tick);
    ctx.stroke();
    const dx = i === 0 ? 18 : i === pasos ? -18 : 0;
    ctx.fillText(fmt(utmMinX + (utmMaxX - utmMinX) * r), px + dx, rect.y - tick - 6);
  }

  // Eje Y: ticks izquierda y derecha, etiquetas rotadas a la izquierda.
  for (let i = 0; i <= pasos; i++) {
    const r = i / pasos;
    const py = rect.y + rect.h * r;
    ctx.beginPath();
    ctx.moveTo(rect.x, py);
    ctx.lineTo(rect.x - tick, py);
    ctx.moveTo(rect.x + rect.w, py);
    ctx.lineTo(rect.x + rect.w + tick, py);
    ctx.stroke();
    ctx.save();
    const dy = i === 0 ? 18 : i === pasos ? -18 : 0;
    ctx.translate(rect.x - tick - 6, py + dy);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText(fmt(utmMaxY - (utmMaxY - utmMinY) * r), 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

function dibujarTitulo(ctx) {
  const titulo =
    (document.getElementById("imprimirTitulo")?.value ?? "").trim() ||
    tituloMunicipalidad;
  ctx.fillStyle = "#1a1a2e";
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(titulo, A4_ANCHO / 2, ALTO_TITULO / 2);

  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGEN, ALTO_TITULO);
  ctx.lineTo(A4_ANCHO - MARGEN, ALTO_TITULO);
  ctx.stroke();
}

function dibujarPie(ctx) {
  const texto = `Escala ${leerEscala()}   ·   Proyección: ${proyeccionDisplayTexto}   ·   ${fechaLegible()}`;
  ctx.font = "12px Arial, sans-serif";
  const boxW = Math.min(A4_ANCHO - MARGEN * 2, ctx.measureText(texto).width + 40);
  const boxH = 26;
  const boxX = (A4_ANCHO - boxW) / 2;
  const boxY = A4_ALTO - ALTO_PIE + (ALTO_PIE - boxH) / 2;

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.strokeStyle = "#777";
  ctx.lineWidth = 1;
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.fillStyle = "#444";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(texto, A4_ANCHO / 2, boxY + boxH / 2);
}

function dibujarFlechaNorte(ctx, cx, cy, size) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.15)";
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx - size * 0.4, cy);
  ctx.lineTo(cx, cy - size * 0.2);
  ctx.closePath();
  ctx.fillStyle = "#1a1a1a";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, cy + size);
  ctx.lineTo(cx + size * 0.4, cy);
  ctx.lineTo(cx, cy - size * 0.2);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#1a1a1a";
  ctx.font = `bold ${Math.round(size * 0.6)}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("N", cx, cy - size - 4);
  ctx.restore();
}

function dibujarAvisoCapas(ctx, rect) {
  const h = 22;
  ctx.fillStyle = "rgba(255,180,0,0.9)";
  ctx.fillRect(rect.x, rect.y + rect.h - h, rect.w, h);
  ctx.fillStyle = "#333";
  ctx.font = "bold 11px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    "⚠ Algunas capas se omitieron por restricciones CORS",
    rect.x + rect.w / 2,
    rect.y + rect.h - h / 2,
  );
}

function exportarMapaPNG() {
  const conLogo = document.getElementById("imprimirConLogo")?.checked ?? true;
  mostrarToast("Generando imagen…");

  global.mapa.once("rendercomplete", function () {
    try {
      const size = global.mapa.getSize();
      const { canvas: mapCanvas, omitidas } = componerMapaCanvas(size);

      const out = document.createElement("canvas");
      out.width = A4_ANCHO;
      out.height = A4_ALTO;
      const ctx = out.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, A4_ANCHO, A4_ALTO);

      // Área disponible para el mapa (deja gutter para las etiquetas de grilla).
      const areaX = MARGEN + GUTTER;
      const areaY = ALTO_TITULO + GUTTER;
      const areaW = A4_ANCHO - MARGEN - GUTTER - areaX;
      const areaH = A4_ALTO - ALTO_PIE - GUTTER - areaY;

      // Ajuste preservando la relación de aspecto del viewport (centrado),
      // para que la grilla UTM no quede deformada.
      const aspViewport = size[0] / size[1];
      let drawW, drawH;
      if (aspViewport > areaW / areaH) {
        drawW = areaW;
        drawH = areaW / aspViewport;
      } else {
        drawH = areaH;
        drawW = areaH * aspViewport;
      }
      const rect = {
        x: areaX + (areaW - drawW) / 2,
        y: areaY + (areaH - drawH) / 2,
        w: drawW,
        h: drawH,
      };

      ctx.fillStyle = "#e8e8e8";
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.drawImage(mapCanvas, rect.x, rect.y, rect.w, rect.h);

      dibujarMarcoYGrilla(ctx, rect);
      dibujarFlechaNorte(ctx, rect.x + rect.w - 26, rect.y + 34, 16);
      if (omitidas > 0) dibujarAvisoCapas(ctx, rect);
      dibujarTitulo(ctx);
      dibujarPie(ctx);

      const descargar = () => {
        try {
          const link = document.createElement("a");
          link.download = `mapa_${fechaHoy()}.png`;
          link.href = out.toDataURL("image/png");
          link.click();
          if (omitidas > 0) {
            mostrarToast(
              "Mapa exportado; algunas capas se omitieron por CORS.",
              "warning",
            );
          } else {
            mostrarToast("Mapa exportado correctamente", "success");
          }
        } catch (e) {
          console.error("No se pudo exportar el PNG:", e);
          mostrarToast(
            "No se pudo exportar el mapa (restricción CORS del servidor).",
            "error",
          );
        }
      };

      if (conLogo && logoMiniLight) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function () {
          const logoH = Math.min(ALTO_TITULO - 14, 38);
          const logoW = (img.naturalWidth / img.naturalHeight) * logoH;
          ctx.drawImage(
            img,
            MARGEN,
            Math.floor((ALTO_TITULO - logoH) / 2),
            logoW,
            logoH,
          );
          descargar();
        };
        img.onerror = descargar;
        img.src = logoMiniLight;
      } else {
        descargar();
      }
    } catch (e) {
      console.error("Error al generar la impresión del mapa:", e);
      mostrarToast("Error al generar la impresión del mapa.", "error");
    }
  });

  global.mapa.renderSync();
}

if (btnExportarPNG) {
  btnExportarPNG.addEventListener("click", exportarMapaPNG);
}
