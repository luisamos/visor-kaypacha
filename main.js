import "./style.css";
import "bootstrap";

import Map from "ol/Map";
import View from "ol/View";
import { defaults as defaultControls } from "ol/control";
import Overlay from "ol/Overlay.js";

import {
  proyeccion3857,
  centroide3857,
  zoomMapa,
  tituloMunicipalidad,
  siglasMunicipalidad,
  logoMiniLight,
  logoMiniDark,
  logoContainer,
} from "./assets/js/configuracion";
import { capasGeograficas } from "./assets/js/capasGeograficas";
import {
  obtenerCoordenadas,
  registrarOverlayCoordenadas,
} from "./assets/js/controlObtenerCoordenadas";

// 0. Configuración global
global.herramientaActiva = null;
global.cubrir = new Overlay({
  element: document.getElementById("popup"),
  autoPan: { animation: { duration: 250 } },
});
const controles = defaultControls({
  zoom: false,
  attribution: false,
  rotate: true,
});
global.vista = new View({
  projection: proyeccion3857,
  center: centroide3857,
  zoom: zoomMapa,
});

const logoClaro = document.querySelector(".logo-mini-light"),
  logoOscuro = document.querySelector(".logo-mini-dark"),
  logoPrincipal = document.getElementById("logo");

if (logoClaro) {
  logoClaro.src = logoMiniLight;
}

if (logoOscuro) {
  logoOscuro.src = logoMiniDark;
}

if (logoPrincipal) {
  logoPrincipal.src = logoContainer;
}

const metaDescripcion = document.querySelector('meta[name="description"]'),
  metaAutor = document.querySelector('meta[name="author"]'),
  subtituloCarga = document.querySelector(".loading-subtitle");

if (metaDescripcion) {
  metaDescripcion.setAttribute(
    "content",
    `Visor de mapas - ${tituloMunicipalidad} - Cusco`,
  );
}

if (metaAutor) {
  metaAutor.setAttribute("content", siglasMunicipalidad);
}

if (subtituloCarga) {
  subtituloCarga.textContent = `Cargando visor catastral de la ${tituloMunicipalidad}.`;
}

global.mapa = new Map({
  target: "map",
  layers: capasGeograficas,
  view: global.vista,
  controls: controles,
  overlays: [cubrir],
});
window.addEventListener("resize", () => {
  global.mapa.updateSize();
});

// 1. Barra de controles
import "./assets/js/barraControles";

// 2. Acceso al módulo
import "./assets/js/acceso";

// 3. Control de las capas y control Propiedades (Gráfico, identificar, filtro, descargar)
import { obtenerInformacion } from "./assets/js/controlCapas";
global.mapa.on("singleclick", function (e) {
  obtenerInformacion(e);
  if (global.herramientaActiva === "coordenadas") {
    obtenerCoordenadas(e);
    return;
  }
});
const cerrar = document.getElementById("popup-closer");
cerrar.onclick = function () {
  global.cubrir.setPosition(undefined);
  cerrar.blur();
  return false;
};

// 4. Mouse posición y escala
import {
  mousePosicion,
  actualizarEscala,
} from "./assets/js/controlMousePosicionEscala";
global.mapa.on("pointermove", mousePosicion);
global.mapa.getView().on("change:resolution", actualizarEscala);

// 5. Controles de vista vista general, controles de mas y menos
import "./assets/js/controlVistaInicioMasMenos";

// 6. Módulo de carga masiva
import "./assets/js/controlCargarDatos";

// 7. Control de ubicar coordenadas
import "./assets/js/controlUbicarCoordenadas";

// 8. Control de  Obtener ubicación
registrarOverlayCoordenadas();

// 9. Control de carga inicial
const loadingScreen = document.getElementById("loading-screen");
global.mapa.once("rendercomplete", function () {
  actualizarEscala();
  if (loadingScreen) {
    setTimeout(() => {
      loadingScreen.classList.add("hidden");
    }, 1000);
  }
});
