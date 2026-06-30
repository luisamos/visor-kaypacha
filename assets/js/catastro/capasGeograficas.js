import {
  direccionServicioWMS,
  formatoPNG,
  formatoJPEG,
  direccionServicioMapCache,
  ortoFotos,
} from "../core/configuracion.js";

import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import ImageLayer from "ol/layer/Image";
import ImageWMS from "ol/source/ImageWMS";
import TileWMS from "ol/source/TileWMS";

// ── Capas base ───────────────────────────────────────────────────────────────
// El visor trabaja sobre la proyección de visualización configurada por
// municipio (proyeccion_display). Por defecto la capa base es Open Street Map.
// Capas disponibles: Open Street Map, Ortofoto (WMS propio), OSM Noche y las
// capas de Google (satélite y calles).
global.osm = new TileLayer({ source: new OSM(), type: "base", visible: true });
global.ortofoto = new TileLayer({
  source: new TileWMS({
    url: direccionServicioMapCache,
    params: {
      LAYERS: ortoFotos,
      TILED: true,
      FORMAT: formatoJPEG,
    },
    serverType: "mapserver",
    transition: 0,
    crossOrigin: "anonymous",
  }),
  type: "base",
  visible: false,
});
global.esriModoNoche = new TileLayer({
  source: new XYZ({
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    crossOrigin: "anonymous",
  }),
  type: "base",
  visible: false,
});
global.googleSatelite = new TileLayer({
  source: new XYZ({
    url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    crossOrigin: "anonymous",
  }),
  type: "base",
  visible: false,
});
global.googleCalles = new TileLayer({
  source: new XYZ({
    url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    crossOrigin: "anonymous",
  }),
  type: "base",
  visible: false,
});
global.osm.set("id", "osm");
global.ortofoto.set("id", "ortofoto");
global.esriModoNoche.set("id", "esriModoNoche");
global.googleSatelite.set("id", "googleMapSatelite");
global.googleCalles.set("id", "googleMapCalle");

export let capasGeograficas = [
  global.osm,
  global.ortofoto,
  global.esriModoNoche,
  global.googleSatelite,
  global.googleCalles,
];

// Activa una única capa base por su id y desactiva el resto. Fuente única de
// verdad usada tanto por el panel "Capa base" como por los radios del sidebar.
const CAPAS_BASE_LAYERS = {
  osm: global.osm,
  ortofoto: global.ortofoto,
  esriModoNoche: global.esriModoNoche,
  googleMapSatelite: global.googleSatelite,
  googleMapCalle: global.googleCalles,
};

export function activarCapaBase(id) {
  if (!CAPAS_BASE_LAYERS[id]) return;
  Object.entries(CAPAS_BASE_LAYERS).forEach(([capaId, capa]) => {
    capa.setVisible(capaId === id);
  });
  sincronizarSeleccionCapaBase(id);
}

// Mantiene en sincronía los controles de UI (radios del sidebar y tarjetas del
// panel "Capa base") con la capa base actualmente activa.
function sincronizarSeleccionCapaBase(id) {
  document
    .querySelectorAll('input[type="radio"][name="base"]')
    .forEach((radio) => {
      radio.checked = radio.id === id;
    });
  document.querySelectorAll(".capa-base-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.capaBase === id);
  });
}

export function registrarCapaWmsDinamica({
  id,
  nombreWms,
  visible = false,
  zIndex,
}) {
  if (!id || !nombreWms) return null;

  const existente = capasGeograficas.find((layer) => layer.get("id") === id);
  if (existente) return existente;

  const capa = new ImageLayer({
    source: new ImageWMS({
      url: direccionServicioWMS,
      params: { LAYERS: nombreWms, FORMAT: formatoPNG, TRANSPARENT: true },
      ratio: 1,
      crossOrigin: "anonymous",
    }),
    visible,
  });

  capa.set("id", id);
  capa.set("nombreWms", nombreWms);
  if (typeof zIndex === "number") capa.setZIndex(zIndex);
  capasGeograficas.push(capa);
  global.mapa?.addLayer(capa);
  return capa;
}
