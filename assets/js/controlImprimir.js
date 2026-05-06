import { logoMiniLight, buscarCapaId, CAPAS_BASE } from './configuracion';

const btnExportarPNG = document.getElementById('btnExportarPNG');

const esLocalhost = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);

function getCapaBaseActiva() {
  for (const capa of CAPAS_BASE) {
    const layer = buscarCapaId(capa.id);
    if (layer && layer.getVisible()) return capa.id;
  }
  return null;
}

function setCapaBase(id) {
  for (const capa of CAPAS_BASE) {
    const layer = buscarCapaId(capa.id);
    if (layer) layer.setVisible(capa.id === id);
  }
}

function exportarMapaPNG() {
  const titulo = (document.getElementById('imprimirTitulo')?.value ?? '').trim();
  const conLogo = document.getElementById('imprimirConLogo')?.checked ?? true;
  const mostrarHeader = titulo !== '' || conLogo;
  const headerHeight = mostrarHeader ? 52 : 0;

  // En localhost Google Maps/ESRI no tienen CORS: cambiar a OSM temporalmente
  const capaBaseOriginal = esLocalhost ? getCapaBaseActiva() : null;
  if (esLocalhost && capaBaseOriginal !== 'osm') {
    setCapaBase('osm');
  }

  global.mapa.once('rendercomplete', function () {
    const size = global.mapa.getSize();

    const mapCanvas = document.createElement('canvas');
    mapCanvas.width = size[0];
    mapCanvas.height = size[1];
    const mapCtx = mapCanvas.getContext('2d');

    mapCtx.fillStyle = '#ffffff';
    mapCtx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);

    Array.prototype.forEach.call(
      global.mapa.getViewport().querySelectorAll('.ol-layer canvas, canvas.ol-layer'),
      function (canvas) {
        if (canvas.width === 0) return;
        // Omitir canvases tainted (cross-origin sin CORS)
        try { canvas.toDataURL(); } catch (e) { return; }

        const opacity = canvas.parentNode.style.opacity || canvas.style.opacity;
        mapCtx.globalAlpha = opacity === '' ? 1 : Number(opacity);
        const transform = canvas.style.transform;
        if (transform) {
          const match = transform.match(/^matrix\(([^)]+)\)$/);
          if (match) mapCtx.setTransform(...match[1].split(',').map(Number));
        }
        mapCtx.drawImage(canvas, 0, 0);
      }
    );
    mapCtx.globalAlpha = 1;
    mapCtx.setTransform(1, 0, 0, 1, 0, 0);

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = size[0];
    finalCanvas.height = size[1] + headerHeight;
    const ctx = finalCanvas.getContext('2d');

    if (headerHeight > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, finalCanvas.width, headerHeight);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, headerHeight);
      ctx.lineTo(finalCanvas.width, headerHeight);
      ctx.stroke();
    }

    ctx.drawImage(mapCanvas, 0, headerHeight);

    if (titulo) {
      ctx.fillStyle = '#1a1a2e';
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(titulo, finalCanvas.width / 2, headerHeight / 2);
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const nombreArchivo = `mapa_${timestamp}.png`;

    function restaurarCapaBase() {
      if (esLocalhost && capaBaseOriginal && capaBaseOriginal !== 'osm') {
        setCapaBase(capaBaseOriginal);
      }
    }

    function descargar() {
      try {
        const link = document.createElement('a');
        link.download = nombreArchivo;
        link.href = finalCanvas.toDataURL('image/png');
        link.click();
      } catch (e) {
        alert(
          'No se pudo exportar el PNG.\n' +
          'Cambie la capa base a "Open Street Map" u "Ortofoto" e intente nuevamente.'
        );
      } finally {
        restaurarCapaBase();
      }
    }

    if (conLogo && logoMiniLight) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        const logoH = Math.min(headerHeight - 10, 40);
        const logoW = (img.naturalWidth / img.naturalHeight) * logoH;
        ctx.drawImage(img, 10, Math.floor((headerHeight - logoH) / 2), logoW, logoH);
        descargar();
      };
      img.onerror = descargar;
      img.src = logoMiniLight;
    } else {
      descargar();
    }
  });

  global.mapa.renderSync();
}

if (btnExportarPNG) {
  btnExportarPNG.addEventListener('click', exportarMapaPNG);
}
