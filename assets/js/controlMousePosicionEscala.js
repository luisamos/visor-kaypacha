import proj4 from "proj4";
import { transform } from "ol/proj";
import { getDistance } from "ol/sphere";
import {
  proyeccion4326,
  proyeccion3857,
  proyeccionDisplay,
  proyeccionDisplayTexto,
} from "./configuracion.js";
// Las defs de proj4 están registradas en configuracion.js; no se duplican aquí.

const projectionDiv = document.getElementById("proyeccion");
const positionDiv = document.getElementById("posicion");
const scaleDiv = document.getElementById("escala");

export function mousePosicion(e) {
  const c = e.coordinate;
  const [x, y] = proj4(proyeccion3857, proyeccionDisplay, [c[0], c[1]]).map(
    (v) => v.toFixed(2),
  );
  projectionDiv.innerHTML = `<strong>Proyección:</strong>&nbsp;${proyeccionDisplayTexto}`;
  positionDiv.innerHTML = `<strong>Posición:</strong>&nbsp;X= ${x}, Y= ${y}`;
}

export function actualizarEscala() {
  let centerOfMap = global.mapa.getSize()[1] / 2;
  let coord1 = global.mapa.getCoordinateFromPixel([0, centerOfMap]);
  let coord2 = global.mapa.getCoordinateFromPixel([100, centerOfMap]);

  if (coord1 && coord2) {
    let coord1LatLon = transform(coord1, proyeccion3857, proyeccion4326);
    let coord2LatLon = transform(coord2, proyeccion3857, proyeccion4326);

    let realWorldMetersPer100Pixels = getDistance(coord1LatLon, coord2LatLon);
    let screenMetersPer100Pixels = pixelToMm(100) / 1000;

    let scaleFactor = realWorldMetersPer100Pixels / screenMetersPer100Pixels;
    let escala = scaleFactor
      .toFixed(0)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    scaleDiv.innerHTML = `<strong>Escala:</strong>&nbsp;1:${escala}`;
  }
}

function pixelToMm(px) {
  const mmPerInch = 25.4;
  const dpi = 96;
  return (px / dpi) * mmPerInch;
}
