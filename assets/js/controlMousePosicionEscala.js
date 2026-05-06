import proj4 from "proj4";
import { transform } from "ol/proj";
import { getDistance } from "ol/sphere";
import {
  proyeccion4326,
  proyeccion3857,
  proyeccion32717,
  proyeccion32718,
  proyeccion32719,
} from "./configuracion.js";

proj4.defs([
  ["EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs"],
  [
    "EPSG:32717",
    "+proj=utm +zone=17 +south +datum=WGS84 +units=m +no_defs +type=crs",
  ],
  [
    "EPSG:32718",
    "+proj=utm +zone=18 +south +datum=WGS84 +units=m +no_defs +type=crs",
  ],
  [
    "EPSG:32719",
    "+proj=utm +zone=19 +south +datum=WGS84 +units=m +no_defs +type=crs",
  ],
  [
    "EPSG:3857",
    "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs",
  ],
]);

const projectionDiv = document.getElementById("proyeccion");
const positionDiv = document.getElementById("posicion");
const scaleDiv = document.getElementById("escala");

export function mousePosicion(e) {
  //const coords = ol.proj.toLonLat(e.coordinate);
  const c = e.coordinate;
  //const proyeccion = document.getElementById('srid').value;
  const proyeccion = "32719";
  const proyeccionTexto = "WGS84 - Zona 19L";

  switch (proyeccion) {
    case "32717":
      const coordenadas1 = proj4(proyeccion3857, proyeccion32717, [c[0], c[1]]);
      const [x1, y1] = coordenadas1.map((c) => c.toFixed(2));
      projectionDiv.innerHTML = `<strong>Proyección:</strong>&nbsp;${proyeccionTexto}`;
      positionDiv.innerHTML = `<strong>Posición:</strong>&nbsp;X= ${x1}, Y= ${y1}`;
      break;
    case "32718":
      const coordenadas2 = proj4(proyeccion3857, proyeccion32718, [c[0], c[1]]);
      const [x2, y2] = coordenadas2.map((c) => c.toFixed(2));
      projectionDiv.innerHTML = `<strong>Proyección:</strong>&nbsp;${proyeccionTexto}`;
      positionDiv.innerHTML = `<strong>Posición:</strong>&nbsp;X= ${x2}, Y= ${y2}`;
      break;
    case "32719":
      const coordenadas3 = proj4(proyeccion3857, proyeccion32719, [c[0], c[1]]);
      const [x3, y3] = coordenadas3.map((c) => c.toFixed(2));
      projectionDiv.innerHTML = `<strong>Proyección:</strong>&nbsp;${proyeccionTexto}`;
      positionDiv.innerHTML = `<strong>Posición:</strong>&nbsp;X= ${x3}, Y= ${y3}`;
      break;
    case "4326":
      const coordenadas4 = proj4(proyeccion3857, proyeccion4326, [c[0], c[1]]);
      const [x4, y4] = coordenadas4.map((c) => c.toFixed(2));
      projectionDiv.innerHTML = `<strong>Proyección:</strong>&nbsp;${proyeccionTexto}`;
      positionDiv.innerHTML = `<strong>Posición:</strong>&nbsp;Longitud= ${x4}, Latitud= ${y4}`;
      break;
  }
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
