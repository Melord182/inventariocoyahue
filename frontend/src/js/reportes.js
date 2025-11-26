// src/js/reportes.js
// Dashboard de reportes + Detalle de reporte
// - En listar.html: usa productos de la API para armar gráficos/tablas
// - En detalle.html: muestra detalle de un "reporte" (placeholder conectado a API)

import { API } from "/src/js/api.js";

// -----------------------------
// Helpers generales
// -----------------------------
function normalizarLista(res) {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.results)) return res.results;
  return [];
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// Datos de fallback para movimientos (por si no hay endpoint aún)
const dataMovimientosDemo = [
  {
    fecha: "2025-11-20",
    equipo: "NB-1209",
    accion: "Traslado",
    desde: "Bodega Temuco",
    hacia: "Oficina Ventas",
  },
  {
    fecha: "2025-11-18",
    equipo: "PC-0045",
    accion: "Envío a mantención",
    desde: "Oficina Soporte",
    hacia: "Servicio Técnico",
  },
  {
    fecha: "2025-11-15",
    equipo: "PROY-008",
    accion: "Retorno a bodega",
    desde: "Sala de Reuniones",
    hacia: "Bodega Villarrica",
  },
  {
    fecha: "2025-11-10",
    equipo: "IMP-055",
    accion: "Asignación",
    desde: "Bodega Temuco",
    hacia: "Recursos Humanos",
  },
];

// -----------------------------
// Referencias (se asignan al iniciar listar)
// -----------------------------
let filtroSucursal, filtroGarantia, btnAplicarFiltro;
let tbodyEquipos, tbodyMovimientos, tbodyResumenGarantias;
let ctxEquiposSucursal, ctxGarantias;
let chartEquipos = null;
let chartGarantias = null;

let dataEquiposBase = []; // datos agregados por sucursal que vienen de productos

// ============================================================
//  RENDER TABLAS
// ============================================================
function renderTablaEquipos(lista) {
  if (!tbodyEquipos) return;
  tbodyEquipos.innerHTML = "";

  if (!lista.length) {
    tbodyEquipos.innerHTML =
      `<tr><td colspan="6" class="text-center text-muted">No hay datos para mostrar</td></tr>`;
    return;
  }

  lista.forEach((eq) => {
    tbodyEquipos.innerHTML += `
      <tr>
        <td>${eq.sucursal}</td>
        <td>${eq.total}</td>
        <td>${eq.enUso}</td>
        <td>${eq.mantencion}</td>
        <td>${eq.bodega}</td>
        <td>${eq.garantiaVigente}</td>
      </tr>
    `;
  });
}

function renderTablaMovimientos(lista) {
  if (!tbodyMovimientos) return;
  tbodyMovimientos.innerHTML = "";

  if (!lista.length) {
    tbodyMovimientos.innerHTML =
      `<tr><td colspan="4" class="text-center text-muted">Sin movimientos registrados.</td></tr>`;
    return;
  }

  lista.forEach((m) => {
    tbodyMovimientos.innerHTML += `
      <tr>
        <td>${m.fecha}</td>
        <td>${m.equipo}</td>
        <td>${m.accion}</td>
        <td>${m.desde} → ${m.hacia}</td>
      </tr>
    `;
  });
}

function renderTablaResumenGarantias(lista) {
  if (!tbodyResumenGarantias) return;

  const totalVigente = lista.reduce(
    (acc, e) => acc + (e.garantiaVigente || 0),
    0
  );
  const totalPorVencer = lista.reduce(
    (acc, e) => acc + (e.garantiaPorVencer || 0),
    0
  );
  const totalVencida = lista.reduce(
    (acc, e) => acc + (e.garantiaVencida || 0),
    0
  );

  tbodyResumenGarantias.innerHTML = `
    <tr><td>Vigente</td><td>${totalVigente}</td></tr>
    <tr><td>Por vencer</td><td>${totalPorVencer}</td></tr>
    <tr><td>Vencida</td><td>${totalVencida}</td></tr>
  `;
}

// ============================================================
//  GRÁFICOS (Chart.js)
// ============================================================
function renderChartEquipos(lista) {
  if (!ctxEquiposSucursal || !window.Chart) return;
  if (chartEquipos) chartEquipos.destroy();

  const labels = lista.map((e) => e.sucursal);

  chartEquipos = new Chart(ctxEquiposSucursal, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Total",
          data: lista.map((e) => e.total),
          borderWidth: 1,
        },
        {
          label: "En uso",
          data: lista.map((e) => e.enUso),
          borderWidth: 1,
        },
        {
          label: "Mantención",
          data: lista.map((e) => e.mantencion),
          borderWidth: 1,
        },
        {
          label: "Bodega/Baja",
          data: lista.map((e) => e.bodega),
          borderWidth: 1,
        },
        {
          label: "Garantía vigente",
          data: lista.map((e) => e.garantiaVigente),
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

function renderChartGarantias(lista) {
  if (!ctxGarantias || !window.Chart) return;
  if (chartGarantias) chartGarantias.destroy();

  const totalVigente = lista.reduce(
    (acc, e) => acc + (e.garantiaVigente || 0),
    0
  );
  const totalPorVencer = lista.reduce(
    (acc, e) => acc + (e.garantiaPorVencer || 0),
    0
  );
  const totalVencida = lista.reduce(
    (acc, e) => acc + (e.garantiaVencida || 0),
    0
  );

  chartGarantias = new Chart(ctxGarantias, {
    type: "doughnut",
    data: {
      labels: ["Vigente", "Por vencer", "Vencida"],
      datasets: [
        {
          data: [totalVigente, totalPorVencer, totalVencida],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
      },
      cutout: "60%",
    },
  });
}

// ============================================================
//  CÁLCULO DE DATOS DESDE PRODUCTOS
// ============================================================
function agruparEquiposPorSucursal(productos) {
  const mapa = {};

  productos.forEach((p) => {
    const sucursalNombre =
      (p.sucursal && p.sucursal.nombre) ||
      p.sucursal_nombre ||
      "Sin sucursal";

    if (!mapa[sucursalNombre]) {
      mapa[sucursalNombre] = {
        sucursal: sucursalNombre,
        total: 0,
        enUso: 0,
        mantencion: 0,
        bodega: 0,
        garantiaVigente: 0,
        garantiaPorVencer: 0,
        garantiaVencida: 0,
      };
    }

    const nodo = mapa[sucursalNombre];
    nodo.total++;

    const estado = (p.estado_nombre || "").toLowerCase();
    if (estado.includes("uso")) nodo.enUso++;
    else if (estado.includes("mant")) nodo.mantencion++;
    else if (estado.includes("bodega") || estado.includes("baja"))
      nodo.bodega++;

    const estGarantia = (p.estado_garantia || "").toLowerCase();
    if (estGarantia.startsWith("vigent")) nodo.garantiaVigente++;
    else if (estGarantia.includes("vencer")) nodo.garantiaPorVencer++;
    else if (estGarantia.startsWith("vencid")) nodo.garantiaVencida++;
  });

  return Object.values(mapa);
}

// ============================================================
//  FILTROS
// ============================================================
function aplicarFiltros() {
  if (!dataEquiposBase.length) return;

  let filtrado = [...dataEquiposBase];

  const sucursal = filtroSucursal?.value || "all";
  const garantia = filtroGarantia?.value || "all";

  if (sucursal !== "all") {
    filtrado = filtrado.filter((e) => e.sucursal === sucursal);
  }

  if (garantia !== "all") {
    if (garantia === "vigente") {
      filtrado = filtrado.filter((e) => e.garantiaVigente > 0);
    } else if (garantia === "por_vencer") {
      filtrado = filtrado.filter((e) => e.garantiaPorVencer > 0);
    } else if (garantia === "vencida") {
      filtrado = filtrado.filter((e) => e.garantiaVencida > 0);
    }
  }

  renderTablaEquipos(filtrado);
  renderTablaResumenGarantias(filtrado);
  renderChartEquipos(filtrado);
  renderChartGarantias(filtrado);
}

// ============================================================
//  CARGA PRINCIPAL DE DASHBOARD (listar.html)
// ============================================================
async function initReportesListar() {
  // Si no existe la tabla, no estamos en listar.html
  const tabla = document.getElementById("tablaEquipos");
  if (!tabla) return;

  // Asignar refs
  filtroSucursal = document.getElementById("filterSucursal");
  filtroGarantia = document.getElementById("filterGarantia");
  btnAplicarFiltro = document.getElementById("btnAplicarFiltro");

  tbodyEquipos = document.getElementById("tbodyEquipos");
  tbodyMovimientos = document.getElementById("tbodyMovimientos");
  tbodyResumenGarantias = document.getElementById("tbodyResumenGarantias");

  ctxEquiposSucursal = document.getElementById("chartEquiposSucursal");
  ctxGarantias = document.getElementById("chartGarantias");

  // Loading en tablas
  if (tbodyEquipos) {
    tbodyEquipos.innerHTML =
      `<tr><td colspan="6" class="text-center">Cargando datos...</td></tr>`;
  }
  if (tbodyMovimientos) {
    tbodyMovimientos.innerHTML =
      `<tr><td colspan="4" class="text-center">Cargando movimientos...</td></tr>`;
  }

  try {
    // 1) Productos desde API para armar las métricas
    const resProd = await API.get("productos/");
    const productos = normalizarLista(resProd);

    dataEquiposBase = agruparEquiposPorSucursal(productos);

    // 2) Movimientos: intentamos desde API, si falla usamos demo
    let movimientos = [];
    try {
      const resMov = await API.get("movimientos/");
      const listaMov = normalizarLista(resMov);
      movimientos = listaMov.map((m) => ({
        fecha: m.fecha || m.fecha_movimiento || "",
        equipo:
          (m.producto && m.producto.nro_serie) ||
          m.producto_nro_serie ||
          m.nro_serie ||
          "",
        accion: m.accion || m.tipo_accion || "",
        desde: m.desde || m.origen_nombre || "",
        hacia: m.hacia || m.destino_nombre || "",
      }));
    } catch (e) {
      console.warn("No se pudo obtener movimientos desde la API, se usan datos de demo.");
      movimientos = dataMovimientosDemo;
    }

    // Render inicial sin filtros
    renderTablaEquipos(dataEquiposBase);
    renderTablaMovimientos(movimientos);
    renderTablaResumenGarantias(dataEquiposBase);
    renderChartEquipos(dataEquiposBase);
    renderChartGarantias(dataEquiposBase);

    // Filtros
    btnAplicarFiltro?.addEventListener("click", aplicarFiltros);
  } catch (err) {
    console.error("Error cargando datos de reportes:", err);
    if (tbodyEquipos) {
      tbodyEquipos.innerHTML =
        `<tr><td colspan="6" class="text-center text-danger">Error al cargar datos.</td></tr>`;
    }
    if (tbodyMovimientos) {
      tbodyMovimientos.innerHTML =
        `<tr><td colspan="4" class="text-center text-danger">Error al cargar movimientos.</td></tr>`;
    }
  }
}

// ============================================================
//  DETALLE DE REPORTE (detalle.html)
// ============================================================
async function initReporteDetalle() {
  const infoDl = document.getElementById("detalle-reporte-info");
  if (!infoDl) return; // no estamos en detalle.html

  const titulo = document.getElementById("detalle-titulo");
  const btnImprimir = document.getElementById("btn-imprimir-reporte");

  const id = getParam("id");

  if (!id) {
    infoDl.innerHTML = `
      <dt class="col-sm-3 text-danger">Error</dt>
      <dd class="col-sm-9">No se proporcionó ID de reporte.</dd>
    `;
    return;
  }

  try {
    // Endpoint sugerido: /api/api/reportes/{id}/
    const rep = await API.get(`reportes/${id}/`);

    if (titulo) {
      titulo.textContent = `Detalle del Reporte #${rep.id}`;
    }

    const tipo =
      rep.tipo ||
      rep.nombre ||
      rep.nombre_reporte ||
      "Reporte de inventario";

    const parametros =
      rep.parametros ||
      rep.filtros ||
      "—";

    const formato = rep.formato || rep.tipo_archivo || "PDF";

    const fecha =
      rep.fecha_generacion ||
      rep.fecha ||
      rep.created_at ||
      "—";

    const generadoPor =
      rep.usuario_nombre ||
      (rep.usuario && rep.usuario.username) ||
      rep.creado_por ||
      "Sistema";

    infoDl.innerHTML = `
      <dt class="col-sm-3">ID Reporte</dt>
      <dd class="col-sm-9">${rep.id}</dd>

      <dt class="col-sm-3">Tipo</dt>
      <dd class="col-sm-9">${tipo}</dd>

      <dt class="col-sm-3">Parámetros</dt>
      <dd class="col-sm-9">${parametros}</dd>

      <dt class="col-sm-3">Formato</dt>
      <dd class="col-sm-9">${formato}</dd>

      <dt class="col-sm-3">Fecha Generación</dt>
      <dd class="col-sm-9">${fecha}</dd>

      <dt class="col-sm-3">Generado por</dt>
      <dd class="col-sm-9">${generadoPor}</dd>
    `;

    if (btnImprimir) {
      btnImprimir.addEventListener("click", () => {
        // Si el backend expone una URL de archivo, podríamos abrirla aquí:
        // const url = rep.archivo_url || rep.url;
        // if (url) { window.open(url, "_blank"); return; }
        window.print();
      });
    }
  } catch (err) {
    console.error("Error al cargar detalle de reporte:", err);
    infoDl.innerHTML = `
      <dt class="col-sm-3 text-danger">Error</dt>
      <dd class="col-sm-9">No se pudo cargar el reporte.</dd>
    `;
  }
}

// ============================================================
//  INICIALIZACIÓN GLOBAL
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  initReportesListar();
  initReporteDetalle();
});
