import {
  direccionServicioWMS,
  formatoPNG,
  formatoJPEG,
  direccionServicioMapCache,
  ortoFotos,
} from "./configuracion.js";

import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import ImageLayer from "ol/layer/Image";
import ImageWMS from "ol/source/ImageWMS";
import TileWMS from "ol/source/TileWMS";

//Capas base
global.osm = new TileLayer({ source: new OSM(), type: "base", visible: false });
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
  }),
  visible: false,
});
global.googleSatelite = new TileLayer({
  source: new XYZ({
    url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    crossOrigin: "anonymous",
  }),
  type: "base",
  visible: true,
});
((global.googleCalles = new TileLayer({
  source: new XYZ({
    url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    crossOrigin: "anonymous",
  }),
  type: "base",
  visible: false,
})),
  (global.esriModoNoche = new TileLayer({
    source: new XYZ({
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      crossOrigin: "anonymous",
    }),
    type: "base",
    visible: false,
  })));
global.osm.set("id", "osm");
global.ortofoto.set("id", "ortofoto");
global.googleSatelite.set("id", "googleMapSatelite");
global.googleCalles.set("id", "googleMapCalle");
global.esriModoNoche.set("id", "esriModoNoche");

export let capasGeograficas = [
  global.osm,
  global.ortofoto,
  global.googleSatelite,
  global.googleCalles,
  global.esriModoNoche,
];

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
    }),
    visible: false,
    visible,
  });

  capa.set("id", id);
  capa.set("nombreWms", nombreWms);
  if (typeof zIndex === "number") capa.setZIndex(zIndex);
  capasGeograficas.push(capa);
  global.mapa?.addLayer(capa);
  return capa;
}
