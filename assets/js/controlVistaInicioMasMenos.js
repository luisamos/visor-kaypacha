import { centroide3857 } from "./configuracion";

const controlVistaGeneral = document.getElementById("controlVistaGeneral"),
  controlMas = document.getElementById("controlMas"),
  controlMenos = document.getElementById("controlMenos");

controlVistaGeneral.addEventListener("click", function () {
  global.vista.setCenter(centroide3857);
  if (global.mapa.getSize()[0] > 1296) global.vista.setZoom(14);
  else global.vista.setZoom(14);
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
