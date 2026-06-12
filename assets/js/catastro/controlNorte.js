import { rotacionVista } from '../core/configuracion';

const btnNorte = document.getElementById('btnNorte');

if (btnNorte) {
  btnNorte.addEventListener('click', () => {
    if (global.mapa) {
      // Restaura la rotación de convergencia (norte de cuadrícula UTM arriba),
      // que es la orientación base del visor; con 0 la grilla quedaría inclinada.
      global.mapa.getView().animate({ rotation: rotacionVista, duration: 300 });
    }
  });
}
