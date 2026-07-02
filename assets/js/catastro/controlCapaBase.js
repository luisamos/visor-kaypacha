/**
 * controlCapaBase.js
 * Panel "Capa base" (primer botón de la barra derecha).
 *
 * Muestra las capas base disponibles como tarjetas con miniatura — al hacer
 * clic sobre una tarjeta se activa esa capa base en el mapa. La estructura
 * sigue el diseño de referencia (rejilla de tarjetas con imagen + título).
 *
 * Las capas listadas provienen de CAPAS_BASE (configuracion.js) y la activación
 * se delega a `activarCapaBase` (capasGeograficas.js), que es la fuente única de
 * verdad para mostrar/ocultar capas base y sincronizar los controles de la UI.
 */
import { CAPAS_BASE, centroide3857 } from "../core/configuracion.js";
import { activarCapaBase } from "./capasGeograficas.js";
import {
  registrarPanel,
  togglePanel,
  ocultarPanel,
} from "../core/panelManager.js";
import feather from "feather-icons";

const EXTENT_3857 = 20037508.342789244;
const ZOOM_MINIATURA = 13;

// Calcula el índice de tesela (x, y) que contiene el centro del municipio.
function teselaDelCentro(zoom) {
  const n = 2 ** zoom;
  const [x, y] = centroide3857;
  const xTile = Math.floor(((x + EXTENT_3857) / (2 * EXTENT_3857)) * n);
  const yTile = Math.floor(((EXTENT_3857 - y) / (2 * EXTENT_3857)) * n);
  return { x: xTile, y: yTile, z: zoom, n };
}

// Devuelve la URL de la miniatura para una capa base concreta.
function miniaturaCapaBase(id) {
  const t = teselaDelCentro(ZOOM_MINIATURA);
  if (id === "osm") {
    return `https://tile.openstreetmap.org/${t.z}/${t.x}/${t.y}.png`;
  }
  if (id === "esriModoNoche") {
    return `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${t.z}/${t.y}/${t.x}`;
  }
  if (id === "ortofoto" || id === "googleMapSatelite") {
    // Miniatura satelital de Google. Para "ortofoto" es solo vista previa de la
    // tarjeta; la capa base sigue siendo la ortofoto WMS del municipio.
    return `https://mt1.google.com/vt/lyrs=s&x=${t.x}&y=${t.y}&z=${t.z}`;
  }
  if (id === "googleMapCalle") {
    return `https://mt1.google.com/vt/lyrs=m&x=${t.x}&y=${t.y}&z=${t.z}`;
  }
  return "";
}

function construirPanel() {
  const pageContent = document.querySelector(".page-content");
  if (!pageContent || document.getElementById("panelCapaBase")) return;

  const tarjetas = CAPAS_BASE.map((capa) => {
    const src = miniaturaCapaBase(capa.id);
    return `
      <button
        type="button"
        class="capa-base-card${capa.checked ? " active" : ""}"
        data-capa-base="${capa.id}"
        title="${capa.titulo}"
      >
        <span class="capa-base-thumb">
          <img src="${src}" alt="${capa.titulo}" loading="lazy" draggable="false" />
          <span class="capa-base-check"><i data-feather="check"></i></span>
        </span>
        <span class="capa-base-nombre">${capa.titulo}</span>
      </button>`;
  }).join("");

  const panel = document.createElement("section");
  panel.id = "panelCapaBase";
  panel.className = "capa-base-panel d-none";
  panel.innerHTML = `
    <div class="capa-base-head">
      <h6 class="mb-0">Mapas base</h6>
      <button
        type="button"
        id="capaBaseCerrar"
        class="btn-close btn-close-panel"
        aria-label="Cerrar"
      ></button>
    </div>
    <div class="capa-base-body">${tarjetas}</div>
  `;

  pageContent.appendChild(panel);
}

function inicializarControlCapaBase() {
  construirPanel();
  feather.replace();

  // Se registra en el panelManager como panel exclusivo y alineado con su
  // botón: al abrirlo se cierran los demás paneles (mini mapa, herramientas) y
  // viceversa, y aparece a la altura del botón "Capa base".
  registrarPanel("panelCapaBase", {
    exclusivo: true,
    botonId: "btnCapaBase",
    alinearConBoton: true,
  });

  const boton = document.getElementById("btnCapaBase");
  const panel = document.getElementById("panelCapaBase");
  if (!boton || !panel) return;

  boton.addEventListener("click", (event) => {
    event.preventDefault();
    togglePanel("panelCapaBase");
  });

  panel
    .querySelector("#capaBaseCerrar")
    ?.addEventListener("click", () => ocultarPanel("panelCapaBase"));

  panel.querySelectorAll(".capa-base-card").forEach((card) => {
    card.addEventListener("click", () => {
      activarCapaBase(card.dataset.capaBase);
    });
  });
}

inicializarControlCapaBase();
