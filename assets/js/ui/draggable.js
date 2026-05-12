/**
 * Makes a panel element draggable by its handle element.
 * When dragging begins the panel is switched to absolute positioning
 * based on its current on-screen location so it can be moved freely.
 */
export function makeDraggable(panel, handle) {
  if (!panel || !handle) return;

  handle.style.cursor = "grab";

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  function getAbsolutePosition() {
    const rect = panel.getBoundingClientRect();
    const parentRect = panel.offsetParent
      ? panel.offsetParent.getBoundingClientRect()
      : { left: 0, top: 0 };
    return {
      left: rect.left - parentRect.left,
      top: rect.top - parentRect.top,
    };
  }

  function onStart(clientX, clientY) {
    isDragging = true;
    handle.style.cursor = "grabbing";

    // Remove transforms and convert to absolute left/top positioning
    const pos = getAbsolutePosition();
    panel.style.transform = "none";
    panel.style.left = pos.left + "px";
    panel.style.top = pos.top + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";

    startX = clientX;
    startY = clientY;
    startLeft = pos.left;
    startTop = pos.top;
  }

  function onMove(clientX, clientY) {
    if (!isDragging) return;
    const dx = clientX - startX;
    const dy = clientY - startY;

    const parentW = panel.offsetParent ? panel.offsetParent.clientWidth : window.innerWidth;
    const parentH = panel.offsetParent ? panel.offsetParent.clientHeight : window.innerHeight;

    const newLeft = Math.max(0, Math.min(startLeft + dx, parentW - panel.offsetWidth));
    const newTop = Math.max(0, Math.min(startTop + dy, parentH - panel.offsetHeight));

    panel.style.left = newLeft + "px";
    panel.style.top = newTop + "px";
  }

  function onEnd() {
    if (!isDragging) return;
    isDragging = false;
    handle.style.cursor = "grab";
  }

  // Mouse events
  handle.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    onStart(e.clientX, e.clientY);
  });

  document.addEventListener("mousemove", (e) => {
    if (isDragging) onMove(e.clientX, e.clientY);
  });

  document.addEventListener("mouseup", onEnd);

  // Touch events
  handle.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    onStart(touch.clientX, touch.clientY);
  }, { passive: true });

  document.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    onMove(touch.clientX, touch.clientY);
  }, { passive: true });

  document.addEventListener("touchend", onEnd);
}

/**
 * Initializes drag support for all floating panels.
 * Each panel is identified by its element and its header element.
 */
export function initDraggablePanels() {
  const panelConfigs = [
    {
      panel: document.getElementById("reporte-servicios-panel"),
      handle: document.querySelector("#reporte-servicios-panel .reporte-servicios-head"),
    },
    {
      panel: document.getElementById("panel1"),
      handle: document.querySelector("#panel1 .panel-header"),
    },
    {
      panel: document.getElementById("panel2"),
      handle: document.querySelector("#panel2 .panel-header"),
    },
    {
      panel: document.getElementById("panel3"),
      handle: document.querySelector("#panel3 .panel-header"),
    },
    {
      panel: document.getElementById("foto-lote-panel"),
      handle: document.querySelector("#foto-lote-panel .foto-lote-head"),
    },
    {
      panel: document.getElementById("detalle-lote-panel"),
      handle: document.querySelector("#detalle-lote-panel .detalle-lote-head"),
    },
    {
      panel: document.getElementById("listado-lote-panel"),
      handle: document.querySelector("#listado-lote-panel .detalle-lote-head"),
    },
    {
      panel: document.getElementById("listado-vias-panel"),
      handle: document.querySelector("#listado-vias-panel .detalle-lote-head"),
    },
  ];

  panelConfigs.forEach(({ panel, handle }) => makeDraggable(panel, handle));
}
