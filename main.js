import "./assets/css/core/tokens.css";
import "./assets/css/ui/layout.css";
import "./assets/css/catastro/mapa.css";
import "./assets/css/catastro/controles-mapa.css";
import "bootstrap";

import Map from "ol/Map";
import View from "ol/View";
import { defaults as defaultControls } from "ol/control";
import Overlay from "ol/Overlay.js";

import {
  proyeccion3857,
  centroide3857,
  zoomMapa,
  zoomMinimo,
  zoomMaximo,
  tituloMunicipalidad,
  siglasMunicipalidad,
  logoMiniLight,
  logoMiniDark,
  logoContainer,
} from "./assets/js/core/configuracion";
import { capasGeograficas } from "./assets/js/catastro/capasGeograficas";
import {
  obtenerCoordenadas,
  registrarOverlayCoordenadas,
} from "./assets/js/catastro/controlObtenerCoordenadas";

// 0. Configuración global
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
  // Bloquea el alejamiento por debajo del zoom inicial y limita el acercamiento.
  // Configurable por municipio en configuracion.js (zoom_minimo / zoom_maximo).
  minZoom: zoomMinimo,
  maxZoom: zoomMaximo,
});

const logoClaro = document.querySelector(".logo-mini-light"),
  logoOscuro = document.querySelector(".logo-mini-dark"),
  logoPrincipal = document.getElementById("logo");

if (logoClaro) logoClaro.src = logoMiniLight;
if (logoOscuro) logoOscuro.src = logoMiniDark;
if (logoPrincipal) logoPrincipal.src = logoContainer;

const metaDescripcion = document.querySelector('meta[name="description"]'),
  metaAutor = document.querySelector('meta[name="author"]'),
  subtituloCarga = document.querySelector(".loading-subtitle");

if (metaDescripcion)
  metaDescripcion.setAttribute(
    "content",
    `Visor de mapas - ${tituloMunicipalidad} - Cusco`,
  );
if (metaAutor) metaAutor.setAttribute("content", siglasMunicipalidad);
if (subtituloCarga)
  subtituloCarga.textContent = `Cargando visor catastral de la ${tituloMunicipalidad}.`;

global.mapa = new Map({
  target: "map",
  layers: capasGeograficas,
  view: global.vista,
  controls: controles,
  overlays: [global.cubrir],
});
window.addEventListener("resize", () => global.mapa.updateSize());

import "./assets/js/ui/initControlesHTML";

// 1. Barra de controles (inicializa tooltips, incluidos los nuevos botones)
import "./assets/js/ui/barraControles";

// 2. Acceso al módulo
import "./assets/js/catastro/acceso";

// 3. Control de capas
import { obtenerInformacion } from "./assets/js/catastro/controlCapasTematicas";
import { obtenerHerramientaActiva } from "./assets/js/core/herramientas";
global.mapa.on("singleclick", function (e) {
  obtenerInformacion(e);
  if (obtenerHerramientaActiva() === "coordenadas") {
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
} from "./assets/js/catastro/controlPosicionEscala";
global.mapa.on("pointermove", mousePosicion);
global.mapa.getView().on("change:resolution", actualizarEscala);

// 5. Controles de vista
import "./assets/js/catastro/controlVistaZoom";

// 5.1 Panel de capa base (barra derecha)
import "./assets/js/catastro/controlCapaBase";

// 6. Carga masiva
import "./assets/js/catastro/controlCargarDatos";
import { initDropify } from "./assets/js/catastro/controlDropify";
initDropify();

// 7. Ubicar coordenadas
import "./assets/js/catastro/controlUbicarCoordenadas";

// 8. Obtener ubicación
registrarOverlayCoordenadas();

// 9. Botón Norte
import "./assets/js/catastro/controlNorte";

// 10. Paneles arrastrables
import { initDraggablePanels } from "./assets/js/ui/draggable";
initDraggablePanels();

// 11. Configuración de backup
import { initControlBackupConfig } from "./assets/js/catastro/controlBackupConfig.js";
initControlBackupConfig();

// 12. Mini mapa
import "./assets/js/catastro/controlMiniMapa";

// 13. Cálculo de superficie y perímetro
import "./assets/js/catastro/controlCalcular";

// 14. Imprimir mapa
import "./assets/js/catastro/controlImprimir";

// 15. Grillado UTM
import "./assets/js/catastro/controlGrillado";

// 16. Recorrido guiado (ayuda interactiva del footer)
import { inicializarRecorrido } from "./assets/js/ui/recorridoGuiado";
inicializarRecorrido();

// 17. Modal de bienvenida (explica las 3 actividades principales al entrar)
import { inicializarModalBienvenida } from "./assets/js/ui/modalBienvenida";

// Control de carga inicial
const loadingScreen = document.getElementById("loading-screen");
global.mapa.once("rendercomplete", function () {
  actualizarEscala();
  if (loadingScreen) {
    setTimeout(() => {
      loadingScreen.classList.add("hidden");
      inicializarModalBienvenida();
    }, 1000);
  }
});
