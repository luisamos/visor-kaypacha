const btnNorte = document.getElementById('btnNorte');

if (btnNorte) {
  btnNorte.addEventListener('click', () => {
    if (global.mapa) {
      global.mapa.getView().animate({ rotation: 0, duration: 300 });
    }
  });
}
