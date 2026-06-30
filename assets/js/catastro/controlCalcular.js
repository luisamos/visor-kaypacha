import VectorSource from 'ol/source/Vector';
import { Vector as VectorLayer } from 'ol/layer';
import { Fill, Stroke, Style, Circle as CircleStyle } from 'ol/style';
import { Draw } from 'ol/interaction';
import Overlay from 'ol/Overlay';
import { getLength, getArea } from 'ol/sphere';
import { unByKey } from 'ol/Observable';

let measureTooltipElement,
  measureTooltip,
  draw,
  listener,
  vectorLayer;

const btnCalcularArea = document.getElementById('btnCalcularArea');
const btnCalcularPerimetro = document.getElementById('btnCalcularPerimetro');
const btnBorrarCalculo = document.getElementById('btnBorrarCalculo');

function actualizarEstado(html) {
  const el = document.getElementById('calcularEstado');
  if (el) el.innerHTML = html;
}

function crearVectorLayer() {
  vectorLayer = new VectorLayer({
    name: 'calculo',
    source: new VectorSource(),
    style: new Style({
      fill: new Fill({ color: 'rgba(255, 255, 255, 0.2)' }),
      stroke: new Stroke({ color: '#ffcc33', width: 2 }),
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({ color: '#ffcc33' })
      })
    })
  });
  global.mapa.addLayer(vectorLayer);
}

function crearEstiloMedicion() {
  return new Style({
    fill: new Fill({ color: 'rgba(255, 255, 255, 0.2)' }),
    stroke: new Stroke({ color: 'rgba(0, 0, 0, 0.5)', lineDash: [10, 10], width: 2 }),
    image: new CircleStyle({
      radius: 5,
      stroke: new Stroke({ color: 'rgba(0, 0, 0, 0.7)' }),
      fill: new Fill({ color: 'rgba(255, 255, 255, 0.2)' })
    })
  });
}

function crearMeasureTooltip() {
  if (measureTooltipElement) {
    measureTooltipElement.remove();
  }
  measureTooltipElement = document.createElement('div');
  measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
  measureTooltip = new Overlay({
    element: measureTooltipElement,
    offset: [0, -15],
    positioning: 'bottom-center',
    stopEvent: false,
    insertFirst: false
  });
  global.mapa.addOverlay(measureTooltip);
}

function formatearLongitud(linea) {
  const longitud = getLength(linea);
  return longitud > 1000
    ? `${(longitud / 1000).toFixed(2)} km`
    : `${longitud.toFixed(2)} m`;
}

function formatearArea(poligono) {
  const area = getArea(poligono);
  const areaKm2 = area / 1000000;
  const areaHa = area / 10000;
  return area > 10000
    ? `${areaKm2.toFixed(2)} km² / ${areaHa.toFixed(2)} ha`
    : `${area.toFixed(2)} m²`;
}

function limpiarInteraccionesDibujo() {
  global.mapa.getInteractions().getArray().slice().forEach((interaction) => {
    if (interaction instanceof Draw) {
      global.mapa.removeInteraction(interaction);
    }
  });
}

function iniciarMedicion(tipo, formatearFuncion) {
  if (!vectorLayer) {
    crearVectorLayer();
  }

  const estilo = crearEstiloMedicion();

  draw = new Draw({
    source: vectorLayer.getSource(),
    type: tipo,
    style: (feature) => {
      const tipoGeom = feature.getGeometry().getType();
      return tipoGeom === tipo || tipoGeom === 'Point' ? estilo : null;
    }
  });

  global.mapa.addInteraction(draw);
  crearMeasureTooltip();

  if (tipo === 'Polygon') {
    actualizarEstado('Midiendo <strong>área</strong>.<br>Doble clic para finalizar.');
  } else {
    actualizarEstado('Midiendo <strong>distancia</strong>.<br>Doble clic para finalizar.');
  }

  draw.on('drawstart', (evt) => {
    const sketch = evt.feature;
    listener = sketch.getGeometry().on('change', (evt) => {
      const geom = evt.target;
      const output = formatearFuncion(geom);
      const coord = tipo === 'LineString'
        ? geom.getLastCoordinate()
        : geom.getInteriorPoint().getCoordinates();
      measureTooltipElement.innerHTML = output;
      measureTooltip.setPosition(coord);
    });
  });

  draw.on('drawend', () => {
    measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
    measureTooltip.setOffset([0, -7]);
    measureTooltipElement = null;
    crearMeasureTooltip();
    unByKey(listener);
  });
}

function limpiarTodo() {
  if (btnCalcularArea) btnCalcularArea.classList.remove('active');
  if (btnCalcularPerimetro) btnCalcularPerimetro.classList.remove('active');
  limpiarInteraccionesDibujo();
  global.mapa.getOverlays().getArray().slice()
    .filter(o => o.getElement()?.classList.contains('ol-tooltip'))
    .forEach(o => global.mapa.removeOverlay(o));
  if (vectorLayer) {
    vectorLayer.getSource().clear();
  }
  actualizarEstado('&#x2014;<br>Elige un tipo de medición');
}

// Configura un botón de medición como toggle: si ya estaba activo lo apaga,
// si no inicia la medición del tipo indicado. Evita duplicar el mismo manejador.
function configurarBotonMedicion(boton, tipo, formatear) {
  if (!boton) return;
  boton.addEventListener('click', function () {
    const activo = this.classList.contains('active');
    limpiarTodo();
    if (!activo) {
      this.classList.add('active');
      iniciarMedicion(tipo, formatear);
    }
  });
}

configurarBotonMedicion(btnCalcularArea, 'Polygon', formatearArea);
configurarBotonMedicion(btnCalcularPerimetro, 'LineString', formatearLongitud);

if (btnBorrarCalculo) {
  btnBorrarCalculo.addEventListener('click', () => limpiarTodo());
}
