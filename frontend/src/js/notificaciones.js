// src/js/notificaciones.js
// Manejo de notificaciones usando la API Django + JWT

import { API } from "/src/js/api.js";

console.log("JS de notificaciones cargado correctamente");
let notificaciones = [];

// Normaliza respuesta (lista simple o paginada)
function normalizarLista(res) {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.results)) return res.results;
  return [];
}

// ¿Está leída? - CORRECCIÓN: usar 'leido' sin tilde
function estaLeida(n) {
  if (typeof n.leido === "boolean") return n.leido;
  if (typeof n.leida === "boolean") return n.leida; // compatibilidad
  if (typeof n.nueva === "boolean") return !n.nueva; // compatibilidad
  return false;
}

// Tipo (stock/proveedor/sistema) para filtros y badge
function getTipo(n) {
  return n.categoria || n.tipo || "sistema";
}

// Texto de tiempo / fecha
function formatearTiempo(n) {
  if (n.tiempo_transcurrido) return n.tiempo_transcurrido; // desde serializer
  if (n.tiempo) return n.tiempo; // compat con versión antigua

  const fechaStr = n.fecha_creacion || n.fecha || n.created_at;
  if (!fechaStr) return "";

  const fecha = new Date(fechaStr);
  if (isNaN(fecha.getTime())) {
    return fechaStr;
  }

  const diffMs = Date.now() - fecha.getTime();
  const diffMin = Math.round(diffMs / 60000);
  const diffHoras = Math.round(diffMs / 3600000);
  const diffDias = Math.round(diffMs / 86400000);

  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHoras < 24) return `Hace ${diffHoras} h`;
  return `Hace ${diffDias} días`;
}

// Obtener notificaciones no leídas
async function obtenerNotificacionesNoLeidas() {
  try {
    // Usar el endpoint del ViewSet (con guion bajo)
    const data = await API.get('notificaciones/no_leidas/');
    console.log(`Tienes ${data.count} notificaciones nuevas`);
    actualizarBadgeConConteo(data.count);
    return data;
  } catch (error) {
    console.error('Error al obtener notificaciones no leídas:', error);
    // En caso de error, actualizar badge con las notificaciones locales
    actualizarBadge();
    return { count: 0, notificaciones: [] };
  }
}

// Función auxiliar para actualizar badge con conteo específico
function actualizarBadgeConConteo(count) {
  const badge = document.getElementById("badgeNoti");
  if (!badge) return;

  badge.innerText = count;
  badge.style.display = count > 0 ? "block" : "none";
}

// ---------------- Carga principal ----------------

async function fetchNotificaciones() {
  const res = await API.get("notificaciones/");
  notificaciones = normalizarLista(res);
  
  // Actualizar badge después de cargar
  actualizarBadge();
}

async function cargarNotificaciones(filtro = "todas") {
  const lista = document.getElementById("lista-notificaciones");
  if (!lista) return;

  lista.innerHTML = `
    <div class="text-center p-4">
      <div class="spinner-border text-primary"></div>
    </div>
  `;

  try {
    await fetchNotificaciones();

    let filtradas =
      filtro === "todas"
        ? notificaciones
        : notificaciones.filter(n => getTipo(n) === filtro);

    if (!filtradas.length) {
      lista.innerHTML = `
        <div class="text-center p-4 text-muted">
          No hay notificaciones disponibles
        </div>`;
      actualizarBadge();
      return;
    }

    lista.innerHTML = "";

    filtradas.forEach(n => {
      const tipo = getTipo(n);
      const color =
        tipo === "stock"
          ? "danger"
          : tipo === "proveedor"
          ? "warning"
          : tipo === "mantenimiento"
          ? "primary"
          : "info";

      const fondo = estaLeida(n) ? "var(--card-bg)" : "#eaf4ff";
      const tiempo = formatearTiempo(n);

      lista.innerHTML += `
        <div class="noti-item p-3"
          style="background:${fondo};cursor:pointer;border-radius:8px;margin-bottom:8px;"
          data-id="${n.id}">
          <div class="d-flex justify-content-between align-items-start">
            <div style="flex:1;">
              <span class="fw-semibold">${n.titulo || n.mensaje || "(Sin mensaje)"}</span><br>
              ${n.titulo && n.mensaje ? `<small class="text-secondary">${n.mensaje}</small><br>` : ''}
              <small class="text-muted">${tiempo}</small>
            </div>
            <span class="badge bg-${color}">
              ${tipo.toUpperCase()}
            </span>
          </div>
        </div>
      `;
    });

    // Click en cada item para abrir detalle
    lista.querySelectorAll(".noti-item").forEach(item => {
      item.addEventListener("click", () => {
        const id = item.getAttribute("data-id");
        if (id) abrirDetalle(parseInt(id, 10));
      });
    });

    actualizarBadge();
  } catch (err) {
    console.error("Error al cargar notificaciones:", err);
    lista.innerHTML = `
      <div class="text-center p-4 text-danger">
        Error al cargar las notificaciones.
      </div>`;
  }
}

// ---------------- Modal de detalle ----------------

async function abrirDetalle(id) {
  const noti = notificaciones.find(n => n.id === id);
  if (!noti) return;

  // Marcar como leída usando el ViewSet
  try {
    await API.post(`notificaciones/${id}/marcar_leida/`, {});
    console.log(`Notificación ${id} marcada como leída`);
  } catch (e) {
    console.warn("Error al marcar como leída:", e);
  }

  // Refrescar lista local
  try {
    await fetchNotificaciones();
  } catch (e) {
    console.warn("Error al refrescar notificaciones:", e);
  }

  // Texto en modal
  const mensajeEl = document.getElementById("modalNotiMensaje");
  const tiempoEl = document.getElementById("modalNotiTiempo");

  if (mensajeEl) {
    const titulo = noti.titulo ? `<strong>${noti.titulo}</strong><br>` : '';
    mensajeEl.innerHTML = titulo + (noti.mensaje || "(Sin mensaje)");
  }
  if (tiempoEl) tiempoEl.innerText = `📅 ${formatearTiempo(noti)}`;

  // Re-render lista con filtro actual
  const btnActivo = document.querySelector(".filtro-noti.active");
  const filtroActual = btnActivo?.dataset?.filtro || "todas";
  cargarNotificaciones(filtroActual);

  // Abrir modal
  const modalEl = document.getElementById("modalNotificacion");
  if (modalEl && window.bootstrap) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }

  actualizarBadge();
}

// ---------------- Badge en topbar ----------------

function actualizarBadge() {
  const badge = document.getElementById("badgeNoti");
  if (!badge) return;

  const nuevas = notificaciones.filter(n => !estaLeida(n)).length;

  badge.innerText = nuevas;
  badge.style.display = nuevas > 0 ? "block" : "none";
}

// ---------------- Filtros (botones) ----------------

function configurarFiltros() {
  const botones = document.querySelectorAll(".filtro-noti");
  if (!botones.length) return;

  botones.forEach(btn => {
    btn.addEventListener("click", () => {
      botones.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const filtro = btn.dataset.filtro || "todas";
      cargarNotificaciones(filtro);
    });
  });
}

// ---------------- Marcar todas como leídas ----------------

function configurarMarcarLeidas() {
  const btn = document.getElementById("marcarLeidas");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    try {
      await API.post("notificaciones/marcar_todas_leidas/", {});
      await fetchNotificaciones();
      const btnActivo = document.querySelector(".filtro-noti.active");
      const filtroActual = btnActivo?.dataset?.filtro || "todas";
      cargarNotificaciones(filtroActual);
      alert("Todas las notificaciones han sido marcadas como leídas.");
    } catch (err) {
      console.error("Error al marcar todas como leídas:", err);
      alert("No se pudo marcar las notificaciones como leídas.");
    }
  });
}

// ---------------- Función para obtener conteo rápido de no leídas ----------------
async function obtenerConteoRapidoNoLeidas() {
  try {
    const data = await API.get('notificaciones/no_leidas/');
    console.log(`Tienes ${data.count} notificaciones nuevas`);
    actualizarBadgeConConteo(data.count);
    return data.count;
  } catch (error) {
    console.error('Error al obtener conteo de no leídas:', error);
    return 0;
  }
}

// ---------------- Inicializar ----------------

document.addEventListener("DOMContentLoaded", () => {
  configurarFiltros();
  configurarMarcarLeidas();
  cargarNotificaciones("todas");
  
  // Opcional: Obtener notificaciones no leídas periódicamente
  setInterval(obtenerConteoRapidoNoLeidas, 30000); // Cada 30 segundos
});

// Exportar funciones para uso externo
export {
  obtenerNotificacionesNoLeidas,
  obtenerConteoRapidoNoLeidas,
  cargarNotificaciones,
  actualizarBadge
};