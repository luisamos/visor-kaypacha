import {
  direccionServicioWMS,
  formatoPNG,
  formatoJPEG,
  direccionServicioMapCache,
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
      LAYERS: "mpc_tramo_01,mpc_tramo_02",
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
global.googleSatelite.set("id", "googleMapSatelite");
global.googleCalles.set("id", "googleMapCalle");

//Capas geográficas
let provincia = new ImageLayer({
    source: new ImageWMS({
      url: direccionServicioWMS,
      params: { LAYERS: "provincia", FORMAT: formatoPNG, TRANSPARENT: true },
      ratio: 1,
    }),
    visible: true,
  }),
  distrito = new ImageLayer({
    source: new ImageWMS({
      url: direccionServicioWMS,
      params: { LAYERS: "distrito", FORMAT: formatoPNG, TRANSPARENT: true },
      ratio: 1,
    }),
    visible: false,
  }),
  sector = new ImageLayer({
    source: new ImageWMS({
      url: direccionServicioWMS,
      params: { LAYERS: "sector", FORMAT: formatoPNG, TRANSPARENT: true },
      ratio: 1,
    }),
    visible: true,
  }),
  manzana = new ImageLayer({
    source: new ImageWMS({
      url: direccionServicioWMS,
      params: { LAYERS: "manzana", FORMAT: formatoPNG, TRANSPARENT: true },
      ratio: 1,
    }),
    visible: false,
  }),
  lote = new ImageLayer({
    source: new ImageWMS({
      url: direccionServicioWMS,
      params: { LAYERS: "lote", FORMAT: formatoPNG, TRANSPARENT: true },
      ratio: 1,
    }),
    visible: false,
  }),
  ejeVia = new ImageLayer({
    source: new ImageWMS({
      url: direccionServicioWMS,
      params: { LAYERS: "eje_via", FORMAT: formatoPNG, TRANSPARENT: true },
      ratio: 1,
    }),
    visible: false,
  }),
  habilitacionUrbana = new ImageLayer({
    source: new ImageWMS({
      url: direccionServicioWMS,
      params: {
        LAYERS: "habilitacion_urbana",
        FORMAT: formatoPNG,
        TRANSPARENT: true,
      },
      ratio: 1,
    }),
    visible: false,
  }),
  comercio = new ImageLayer({
    source: new ImageWMS({
      url: direccionServicioWMS,
      params: {
        LAYERS: "comercio",
        FORMAT: formatoPNG,
        TRANSPARENT: true,
      },
      ratio: 1,
    }),
    visible: false,
  }),
  construccion = new ImageLayer({
    source: new ImageWMS({
      url: direccionServicioWMS,
      params: {
        LAYERS: "construccion",
        FORMAT: formatoPNG,
        TRANSPARENT: true,
      },
      ratio: 1,
    }),
    visible: false,
  }),
  parque = new ImageLayer({
    source: new ImageWMS({
      url: direccionServicioWMS,
      params: { LAYERS: "parque", FORMAT: formatoPNG, TRANSPARENT: true },
      ratio: 1,
    }),
    visible: false,
  }),
  puerta = new ImageLayer({
    source: new ImageWMS({
      url: direccionServicioWMS,
      params: { LAYERS: "puerta", FORMAT: formatoPNG, TRANSPARENT: true },
      ratio: 1,
    }),
    visible: false,
  }),
  servicioBasico = new ImageLayer({
    source: new ImageWMS({
      url: direccionServicioWMS,
      params: {
        LAYERS: "servicio_basico",
        FORMAT: formatoPNG,
        TRANSPARENT: true,
      },
      ratio: 1,
    }),
    visible: false,
  }),
  clasificacionPredio = new ImageLayer({
    source: new ImageWMS({
      url: direccionServicioWMS,
      params: {
        LAYERS: "clasificacion_predio",
        FORMAT: formatoPNG,
        TRANSPARENT: true,
      },
      ratio: 1,
    }),
    visible: false,
  }),
  tipoPersona = new ImageLayer({
    source: new ImageWMS({
      url: direccionServicioWMS,
      params: {
        LAYERS: "tipo_persona",
        FORMAT: formatoPNG,
        TRANSPARENT: true,
      },
      ratio: 1,
    }),
    visible: false,
  }),
  predio = new ImageLayer({
    source: new ImageWMS({
      url: direccionServicioWMS,
      params: { LAYERS: "predio", FORMAT: formatoPNG, TRANSPARENT: true },
      ratio: 1,
    }),
    visible: false,
  });

provincia.set("id", "provincia");
distrito.set("id", "distrito");
sector.set("id", "sector");
manzana.set("id", "manzana");
lote.set("id", "lote");
ejeVia.set("id", "ejeVia");
habilitacionUrbana.set("id", "habilitacionUrbana");
comercio.set("id", "comercio");
construccion.set("id", "construccion");
parque.set("id", "parque");
puerta.set("id", "puerta");
servicioBasico.set("id", "servicioBasico");
clasificacionPredio.set("id", "clasificacionPredio");
tipoPersona.set("id", "tipoPersona");
predio.set("id", "predio");

export let capasGeograficas = [
  global.osm,
  global.ortofoto,
  global.googleSatelite,
  global.googleCalles,
  provincia,
  distrito,
  sector,
  manzana,
  lote,
  ejeVia,
  habilitacionUrbana,
  comercio,
  construccion,
  parque,
  puerta,
  servicioBasico,
  clasificacionPredio,
  tipoPersona,
  predio,
];
