// src/js/dashboard.js
// Dashboard principal: resumen de activos y últimas actividades

import { API } from "/src/js/api.js";

// Datos que se rellenarán desde la API
let resumenGlobal = {
  totalActivos: 0,
  enUso: 0,
  mantencion: 0,
  garantiaVigente: 0,
  porVencer: 0,
  fueraGarantia: 0,
  sucursales: 0,
};

let sucursalesData = [];
let actividades = [];

// Normaliza respuestas tipo lista o paginadas
function normalizarLista(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (resp.results && Array.isArray(resp.results)) return resp.results;
  return [];
}

// =============================
//  CARGAR DATOS DESDE BACKEND
// =============================
async function cargarDatosDashboard() {
  try {
    // Pedimos productos y notificaciones en paralelo
    const [productosResp, notificacionesResp] = await Promise.all([
      // GET /api/api/productos/
      API.get("productos/").catch((err) => {
        console.error("Error obteniendo productos:", err);
        return null;
      }),
      // GET /api/api/notificaciones/
      API.get("notificaciones/").catch((err) => {
        console.error("Error obteniendo notificaciones:", err);
        return null;
      }),
    ]);

    // ----- Procesar productos -----
    if (productosResp) {
      const productos = normalizarLista(productosResp);

      const total = productos.length;
      let enUso = 0;
      let mantencion = 0;
      let garantiaVigente = 0;
      let porVencer = 0;
      let fueraGarantia = 0;

      const mapaSucursales = {};

      productos.forEach((p) => {
        const estadoTexto = (
          p.estado_nombre ||
          p.estado ||
          ""
        )
          .toString()
          .toLowerCase();

        if (estadoTexto.includes("uso")) enUso++;
        if (estadoTexto.includes("mant")) mantencion++;

        const estadoGarantia = (p.estado_garantia || "")
          .toString()
          .toLowerCase();

        if (
          estadoGarantia.includes("vigente") ||
          estadoGarantia.includes("garant")
        ) {
          // Ej: "En garantía"
          garantiaVigente++;
        } else if (estadoGarantia.includes("por vencer")) {
          porVencer++;
        } else if (estadoGarantia.includes("vencid")) {
          fueraGarantia++;
        }

        // Nombre de sucursal: intentamos varias opciones
        const sucNombre =
          p.sucursal_nombre ||
          (p.sucursal && p.sucursal.nombre) ||
          p.sucursal ||
          "Sin sucursal";

        mapaSucursales[sucNombre] =
          (mapaSucursales[sucNombre] || 0) + 1;
      });

      sucursalesData = Object.entries(mapaSucursales).map(
        ([nombre, total]) => ({
          nombre,
          total,
        })
      );

      resumenGlobal = {
        totalActivos: total,
        enUso,
        mantencion,
        garantiaVigente,
        porVencer,
        fueraGarantia,
        sucursales: sucursalesData.length,
      };
    }

    // ----- Procesar notificaciones como "últimas actividades" -----
    if (notificacionesResp) {
      const notifs = normalizarLista(notificacionesResp);

      actividades = notifs.slice(0, 5).map((n) => ({
        usuario:
          (n.usuario &&
            (n.usuario.username || n.usuario_nombre)) ||
          "Sistema",
        descripcion:
          n.mensaje || n.titulo || "Notificación",
        tiempo: n.fecha_creacion
          ? new Date(n.fecha_creacion).toLocaleString("es-CL")
          : "",
        icono: "bi-bell-fill",
        claseIcono: n.leida ? "text-secondary" : "text-danger",
      }));
    }
  } catch (error) {
    console.error("Error cargando datos del dashboard:", error);
  }

  // Finalmente pintamos con lo que tengamos (aunque sea parcial)
  cargarTarjetas();
  cargarUsoGlobal();
  cargarResumenSucursales();
  cargarActividad();
}

// =============================
//  RENDER DE ESTADÍSTICAS
// =============================
function cargarTarjetas() {
  document.getElementById("statActivos").textContent =
    resumenGlobal.enUso;
  document.getElementById("statMantencion").textContent =
    resumenGlobal.mantencion;
  document.getElementById("statGarantia").textContent =
    resumenGlobal.garantiaVigente;
  document.getElementById("statPorVencer").textContent =
    resumenGlobal.porVencer;
  document.getElementById("statFuera").textContent =
    resumenGlobal.fueraGarantia;
  document.getElementById("statSucursales").textContent =
    resumenGlobal.sucursales;
}

// =============================
//  BARRA DE USO GLOBAL
// =============================
function cargarUsoGlobal() {
  const usageBar = document.getElementById("usageBar");
  const labelUso = document.getElementById("labelUsoGlobal");
  const labelTotales = document.getElementById("labelTotales");

  if (!usageBar || !labelUso || !labelTotales) return;

  const total = resumenGlobal.totalActivos || 1;
  const porcentajeUso = Math.round(
    (resumenGlobal.enUso / total) * 100
  );

  usageBar.style.width = `${porcentajeUso}%`;
  usageBar.setAttribute("aria-valuenow", porcentajeUso);
  usageBar.textContent = `${porcentajeUso}%`;

  labelUso.textContent = `${porcentajeUso}% en uso`;
  labelTotales.textContent = `${resumenGlobal.enUso} en uso de ${total} activos`;
}

// =============================
//  RESUMEN POR SUCURSAL
// =============================
function cargarResumenSucursales() {
  const contenedor =
    document.getElementById("resumenSucursales");
  if (!contenedor) return;

  contenedor.innerHTML = "";

  if (sucursalesData.length === 0) {
    contenedor.innerHTML =
      `<p class="text-muted small mb-0">No hay datos de sucursales disponibles.</p>`;
    return;
  }

  const maxTotal = Math.max(
    ...sucursalesData.map((s) => s.total)
  );

  sucursalesData.forEach((suc, index) => {
    const porcentaje = Math.round(
      (suc.total / maxTotal) * 100
    );
    const colorClass =
      index === 0 ? "bg-primary" : "bg-success";

    const item = document.createElement("div");
    item.className = "mb-2";

    item.innerHTML = `
      <div class="d-flex justify-content-between small mb-1">
        <span>${suc.nombre}</span>
        <span>${suc.total} activos</span>
      </div>
      <div class="progress progress-sucursal">
        <div class="progress-bar ${colorClass}" role="progressbar"
             style="width: ${porcentaje}%;" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
    `;

    contenedor.appendChild(item);
  });
}

// =============================
//  ÚLTIMAS ACTIVIDADES
// =============================
function cargarActividad() {
  const lista = document.getElementById("activityFeed");
  if (!lista) return;

  lista.innerHTML = "";

  if (actividades.length === 0) {
    lista.innerHTML = `
      <li class="list-group-item text-muted small">
        No hay actividades recientes.
      </li>`;
    return;
  }

  actividades.forEach((act) => {
    const li = document.createElement("li");
    li.className =
      "list-group-item d-flex align-items-start gap-2";

    li.innerHTML = `
      <i class="bi ${act.icono} ${act.claseIcono} mt-1"></i>
      <div>
        <strong>${act.usuario}:</strong> ${act.descripcion}
        <small class="text-muted d-block">${act.tiempo}</small>
      </div>
    `;

    lista.appendChild(li);
  });
}

// =============================
//  INICIALIZAR DASHBOARD
// =============================

function requireAdmin() {
  const access = localStorage.getItem("access");
  if (!access) {
    // No hay sesión -> al login
    window.location.href = "/paginas/login/login.html";
    return false;
  }

  const isStaff = localStorage.getItem("is_staff") === "1";
  if (!isStaff) {
    // Logueado pero no es staff -> panel de usuario
    window.location.href = "/paginas/usuario/panel.html";
    return false;
  }

  return true;
}

document.addEventListener("DOMContentLoaded", () => {
  if (!requireAdmin()) return;
  cargarDatosDashboard();
});