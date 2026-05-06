import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Style, Circle as CircleStyle, Fill, Stroke } from 'ol/style';

const btnMiniMapa = document.getElementById('btnMiniMapa');
const minimapaPanel = document.getElementById('minimapa-panel');
const minimapaCerrar = document.getElementById('minimapa-cerrar');

let miniMapa = null;
let marcadorSource = null;
let escuchandoCambio = false;

function iniciarMiniMapa() {
  if (miniMapa) return;

  const capaOsmNoche = new TileLayer({
    source: new XYZ({
      url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      attributions: '© CartoDB'
    })
  });

  marcadorSource = new VectorSource();

  const capaUbicacion = new VectorLayer({
    source: marcadorSource,
    style: new Style({
      image: new CircleStyle({
        radius: 8,
        fill: new Fill({ color: 'rgba(220, 0, 0, 0.85)' }),
        stroke: new Stroke({ color: '#ffffff', width: 2 })
      })
    })
  });

  const centroActual = global.vista.getCenter();
  const zoomActual = global.vista.getZoom() || 14;

  miniMapa = new Map({
    target: 'minimapa-map',
    layers: [capaOsmNoche, capaUbicacion],
    view: new View({
      projection: 'EPSG:3857',
      center: centroActual,
      zoom: Math.max(zoomActual - 4, 2)
    }),
    controls: []
  });

  actualizarMarcador(centroActual);

  if (!escuchandoCambio) {
    escuchandoCambio = true;
    global.mapa.getView().on('change:center', () => {
      const centro = global.mapa.getView().getCenter();
      if (miniMapa && !minimapaPanel.classList.contains('d-none')) {
        miniMapa.getView().setCenter(centro);
        actualizarMarcador(centro);
      }
    });
  }
}

function actualizarMarcador(coord) {
  if (!marcadorSource) return;
  marcadorSource.clear();
  marcadorSource.addFeature(new Feature({ geometry: new Point(coord) }));
}

function abrirMiniMapa() {
  minimapaPanel.classList.remove('d-none');
  btnMiniMapa.classList.add('active');
  if (!miniMapa) {
    setTimeout(() => {
      iniciarMiniMapa();
    }, 50);
  } else {
    miniMapa.updateSize();
    const centro = global.mapa.getView().getCenter();
    miniMapa.getView().setCenter(centro);
    actualizarMarcador(centro);
  }
}

function cerrarMiniMapa() {
  minimapaPanel.classList.add('d-none');
  btnMiniMapa.classList.remove('active');
}

if (btnMiniMapa) {
  btnMiniMapa.addEventListener('click', () => {
    if (minimapaPanel.classList.contains('d-none')) {
      abrirMiniMapa();
    } else {
      cerrarMiniMapa();
    }
  });
}

if (minimapaCerrar) {
  minimapaCerrar.addEventListener('click', cerrarMiniMapa);
}
