// js/controlObtenerCoordenadas.js
import Overlay from "ol/Overlay";
import { coordsToDisplay } from "../core/configuracion";
import {
  activarHerramienta,
  desactivarHerramienta,
  registrarDesactivador,
} from "../core/herramientas";

const botonObtenerCoordendas = document.getElementById("obtenerCoordenadas");

const popupElement = document.createElement("div");
popupElement.id = "coord-popup";
popupElement.className = "ol-popup";
popupElement.style.minWidth = "50px";
popupElement.innerHTML = `
    <a href="#" class="ol-popup-closer coord-popup-closer"></a>
    <div class="coord-popup-content"></div>`;

const coordenadasOverlay = new Overlay({
  element: popupElement,
  positioning: "bottom-center",
  stopEvent: true,
});

let overlayRegistrado = false;

export function registrarOverlayCoordenadas() {
  if (!overlayRegistrado && typeof global.mapa.addOverlay === "function") {
    global.mapa.addOverlay(coordenadasOverlay);
    overlayRegistrado = true;
  }

  popupElement.style.display = "none";
  return overlayRegistrado;
}

const contenidoPopup = popupElement.querySelector(".coord-popup-content");
const cerrarPopup = popupElement.querySelector(".coord-popup-closer");

function ocultarPopupCoordenadas() {
  popupElement.style.display = "none";
  coordenadasOverlay.setPosition(undefined);
}

function desactivarObtenerCoordenadas({ reanudarDibujo = true } = {}) {
  botonObtenerCoordendas.classList.remove("active");
  ocultarPopupCoordenadas();
  desactivarHerramienta("coordenadas");
  if (reanudarDibujo && typeof global.reanudarDibujoTemporal === "function") {
    global.reanudarDibujoTemporal();
  }
}

// Registra el desactivador para que herramientas.js lo llame automáticamente
// cuando otra herramienta tome el foco.
registrarDesactivador("coordenadas", () =>
  desactivarObtenerCoordenadas({ reanudarDibujo: false }),
);

cerrarPopup.addEventListener("click", (e) => {
  e.preventDefault();
  desactivarObtenerCoordenadas();
});

botonObtenerCoordendas.addEventListener("click", function () {
  const activar = !botonObtenerCoordendas.classList.contains("active");

  if (activar) {
    if (typeof global.desactivarObtenerInformacion === "function") {
      global.desactivarObtenerInformacion({ reanudarDibujo: false });
    }

    if (typeof global.pausarDibujoTemporal === "function") {
      global.pausarDibujoTemporal();
    }

    botonObtenerCoordendas.classList.add("active");
    activarHerramienta("coordenadas");
  } else {
    desactivarObtenerCoordenadas();
  }
});

export function obtenerCoordenadas(e) {
  if (botonObtenerCoordendas.classList.contains("active")) {
    const coordenadas = coordsToDisplay(e.coordinate);
    const [x, y] = coordenadas.map((coord) => coord.toFixed(4));
    const texto = `<tr><th>X:</th><td>${x}</td></tr><tr><th>Y:</th><td>${y}</td></tr>`;

    contenidoPopup.innerHTML = `
        <table>
            <tbody>
                ${texto}
            </tbody>
        </table>`;

    coordenadasOverlay.setPosition(e.coordinate);
    popupElement.style.display = "block";
  }
}
