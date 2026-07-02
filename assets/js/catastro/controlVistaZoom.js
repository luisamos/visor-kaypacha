import { centroide3857, zoomMapa } from "../core/configuracion";

const controlVistaGeneral = document.getElementById("controlVistaGeneral"),
  controlMas = document.getElementById("controlMas"),
  controlMenos = document.getElementById("controlMenos");

controlVistaGeneral.addEventListener("click", function () {
  global.vista.setCenter(centroide3857);
  global.vista.setZoom(zoomMapa);
});

controlMas.addEventListener("click", function () {
  let zoomActual = global.vista.getZoom();
  zoomActual = zoomActual + 1;
  global.vista.setZoom(zoomActual);
});

controlMenos.addEventListener("click", function () {
  let zoomActual = global.vista.getZoom();
  zoomActual = zoomActual - 1;
  global.vista.setZoom(zoomActual);
});
