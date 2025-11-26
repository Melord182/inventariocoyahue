// src/js/notificaciones.js
// Manejo de notificaciones usando la API Django + JWT

import { API } from "/src/js/api.js";

let notificaciones = [];

// Normaliza respuesta (lista simple o paginada)
function normalizarLista(res) {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.results)) return res.results;
  return [];
}

// ¿Está leída?
function estaLeida(n) {
  if (typeof n.leida === "boolean") return n.leida;
  if (typeof n.nueva === "boolean") return !n.nueva; // compatibilidad
  return false;
}

// Tipo (stock/proveedor/sistema) para filtros y badge
function getTipo(n) {
  return n.tipo || n.categoria || "sistema";
}

// Texto de tiempo / fecha
function formatearTiempo(n) {
  if (n.tiempo) return n.tiempo; // compat con versión antigua

  const fechaStr = n.fecha || n.fecha_creacion || n.created_at;
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

// ---------------- Carga principal ----------------

async function fetchNotificaciones() {
  const res = await API.get("notificaciones/");
  notificaciones = normalizarLista(res);
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
          : "info";

      const fondo = estaLeida(n) ? "var(--card-bg)" : "#eaf4ff";
      const tiempo = formatearTiempo(n);

      lista.innerHTML += `
        <div class="noti-item p-3"
          style="background:${fondo};cursor:pointer;"
          data-id="${n.id}">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <span class="fw-semibold">${n.mensaje || n.titulo || "(Sin mensaje)"}</span><br>
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

  // marcar como leída en backend
  try {
    await API.post(`notificaciones/${id}/marcar_leida/`, {});
  } catch (e) {
    console.warn("No se pudo marcar como leída en API (se ignora):", e);
  }

  // refrescamos lista local
  try {
    await fetchNotificaciones();
  } catch (e) {
    console.warn("Error al refrescar notificaciones luego de marcar leída:", e);
  }

  // texto en modal
  const mensajeEl = document.getElementById("modalNotiMensaje");
  const tiempoEl = document.getElementById("modalNotiTiempo");

  if (mensajeEl) mensajeEl.innerText = noti.mensaje || noti.titulo || "(Sin mensaje)";
  if (tiempoEl) tiempoEl.innerText = `📅 ${formatearTiempo(noti)}`;

  // re-render lista con filtro actual
  const btnActivo = document.querySelector(".filtro-noti.active");
  const filtroActual = btnActivo?.dataset?.filtro || "todas";
  cargarNotificaciones(filtroActual);

  // abrir modal
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

// ---------------- Inicializar ----------------

document.addEventListener("DOMContentLoaded", () => {
  configurarFiltros();
  configurarMarcarLeidas();
  cargarNotificaciones("todas");
});
