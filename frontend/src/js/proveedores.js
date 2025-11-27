// src/js/proveedores.js
// CRUD de Proveedores usando la API Django + JWT
// Funciona con:
// - paginas/proveedores/listar.html
// - paginas/proveedores/agregar.html
// - paginas/proveedores/editar.html
// - paginas/proveedores/eliminar.html
// - paginas/proveedores/detalle.html

import { API } from "/src/js/api.js";

let proveedoresCache = [];
let dataTable = null;
let grafico = null;

// ----------------------------
// Helpers generales
// ----------------------------

function getText(obj, key, fallback = "") {
  if (!obj || typeof obj !== "object") return fallback;
  const v = obj[key];
  if (v === undefined || v === null) return fallback;
  return String(v);
}

function normalizarProveedor(p) {
  if (!p || typeof p !== "object") return {};

  return {
    id: p.id,
    nombre: p.nombre || p.nombre_fantasia || "",
    nombre_legal: p.nombre_legal || p.razon_social || "",
    rut: p.rut || p.rut_empresa || "",
    telefono: p.telefono || p.fono || "",
    email: p.email || p.correo || p.correo_electronico || "",
    ubicacion: p.ubicacion || p.direccion || "",
    contacto: p.contacto || p.nombre_contacto || "",
  };
}

function normalizarLista(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.map(normalizarProveedor);
}

function alertSuccess(msg) {
  alert(msg); // luego lo puedes reemplazar por un toast bonito
}

function alertError(msg) {
  alert(msg);
}

// ----------------------------
// Detectar página
// ----------------------------

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("tablaProveedores")) {
    initListarProveedores();
  }
  if (document.getElementById("formAgregarProveedor")) {
    initAgregarProveedor();
  }
  if (document.getElementById("formEditarProveedor")) {
    initEditarProveedor();
  }
  if (document.getElementById("formEliminarProveedor")) {
    initEliminarProveedor();
  }
  if (document.getElementById("proveedor-detalle-info")) {
    initDetalleProveedor();
  }
});

// ============================================================
// LISTAR (listar.html)
// ============================================================

async function initListarProveedores() {
  await cargarProveedoresLista();
  configurarFiltrosLista();
}

async function fetchProveedores() {
  const res = await API.get("proveedores/");
  proveedoresCache = normalizarLista(res);
}

async function cargarProveedoresLista() {
  const tbody = document.getElementById("tbodyProveedores");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center">Cargando proveedores...</td></tr>`;
  }

  try {
    await fetchProveedores();
    actualizarContador(proveedoresCache.length);
    renderTabla(proveedoresCache);
    renderGrafico(proveedoresCache);
  } catch (err) {
    console.error("Error al cargar proveedores:", err);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error al cargar proveedores</td></tr>`;
    }
  }
}

function actualizarContador(total) {
  const el = document.getElementById("totalProveedores");
  if (el) el.innerText = total;
}

// Tabla + DataTable
function renderTabla(lista) {
  const tbody = document.getElementById("tbodyProveedores");
  if (!tbody) return;

  // Si ya hay DataTable, destruirlo antes de volver a armar la tabla
  if (dataTable) {
    dataTable.destroy();
    dataTable = null;
  }

  // Limpiar filas
  tbody.innerHTML = "";

  // Si hay datos, agregamos filas normales (sin colspan)
  if (lista.length) {
    lista.forEach((p) => {
      const nombre = getText(p, "nombre", "Sin nombre");
      const telefono = getText(p, "telefono", "");
      const email = getText(p, "email", "");
      const id = p.id;

      tbody.innerHTML += `
        <tr>
          <td>${id}</td>
          <td>${nombre}</td>
          <td>${telefono}</td>
          <td>${email}</td>
          <td class="text-center">
            <a class="btn btn-outline-info btn-icon me-1" href="detalle.html?id=${id}" title="Ver">
              <i class="bi bi-eye"></i>
            </a>
            <a class="btn btn-outline-primary btn-icon me-1" href="editar.html?id=${id}" title="Editar">
              <i class="bi bi-pencil"></i>
            </a>
            <a class="btn btn-outline-danger btn-icon" href="eliminar.html?id=${id}" title="Eliminar">
              <i class="bi bi-trash"></i>
            </a>
          </td>
        </tr>
      `;
    });
  }

  // Inicializar DataTable si la librería está disponible
  if (window.DataTable) {
    dataTable = new DataTable("#tablaProveedores", {
      layout: {
        topStart: { buttons: ["excel", "pdf"] },
      },
      language: {
        url: "https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json",
        emptyTable: "No hay proveedores",
      },
    });
  }
}


// Filtros
function configurarFiltrosLista() {
  const filtroNombre = document.getElementById("filtroNombre");
  const filtroEmail = document.getElementById("filtroEmail");
  const filtroTelefono = document.getElementById("filtroTelefono");
  const btnLimpiar = document.getElementById("btnLimpiarFiltros");

  const aplicar = () => aplicarFiltrosLista();

  if (filtroNombre) filtroNombre.addEventListener("input", aplicar);
  if (filtroEmail) filtroEmail.addEventListener("input", aplicar);
  if (filtroTelefono) filtroTelefono.addEventListener("input", aplicar);
  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", () => {
      if (filtroNombre) filtroNombre.value = "";
      if (filtroEmail) filtroEmail.value = "";
      if (filtroTelefono) filtroTelefono.value = "";
      aplicarFiltrosLista();
    });
  }
}

function aplicarFiltrosLista() {
  const filtroNombre = document.getElementById("filtroNombre");
  const filtroEmail = document.getElementById("filtroEmail");
  const filtroTelefono = document.getElementById("filtroTelefono");

  const nom = (filtroNombre?.value || "").toLowerCase();
  const mail = (filtroEmail?.value || "").toLowerCase();
  const tel = (filtroTelefono?.value || "").toLowerCase();

  const filtrados = proveedoresCache.filter(p => {
    const nombre = (p.nombre || "").toLowerCase();
    const email = (p.email || "").toLowerCase();
    const telefono = (p.telefono || "").toLowerCase();

    return (
      nombre.includes(nom) &&
      email.includes(mail) &&
      telefono.includes(tel)
    );
  });

  actualizarContador(filtrados.length);
  renderTabla(filtrados);
  renderGrafico(filtrados);
}

// Gráfico
function renderGrafico(lista) {
  const canvas = document.getElementById("graficoProveedores");
  if (!canvas || !window.Chart) return;

  const iniciales = {};
  lista.forEach(p => {
    const nombre = p.nombre || "";
    const ini = nombre.charAt(0).toUpperCase() || "?";
    iniciales[ini] = (iniciales[ini] || 0) + 1;
  });

  const labels = Object.keys(iniciales);
  const values = Object.values(iniciales);

  if (grafico) {
    grafico.destroy();
  }

  grafico = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data: values,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

// ============================================================
// AGREGAR (agregar.html)
// ============================================================

function initAgregarProveedor() {
  const form = document.getElementById("formAgregarProveedor");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const nombre = (document.getElementById("nombre")?.value || "").trim();
    const rut = (document.getElementById("rut")?.value || "").trim();
    const nombreLegal = (document.getElementById("nombre_legal")?.value || "").trim();
    const ubicacion = (document.getElementById("ubicacion")?.value || "").trim();

    // 👇 Intentamos varios IDs posibles
    const contactoInput =
      document.getElementById("contacto") ||
      document.getElementById("nombreContacto") ||
      document.getElementById("contacto_nombre");

    const telefonoInput =
      document.getElementById("telefono") ||
      document.getElementById("fono") ||
      document.getElementById("telefono_contacto");

    const correoInput =
      document.getElementById("correo") ||
      document.getElementById("email") ||
      document.getElementById("correo_electronico");

    const contacto = (contactoInput?.value || "").trim();
    const telefono = (telefonoInput?.value || "").trim();
    const correo = (correoInput?.value || "").trim();

    if (!nombre) {
      alertError("El nombre es obligatorio.");
      return;
    }

    const payload = {
      nombre,
      rut,
      nombre_legal: nombreLegal,
      ubicacion,
      contacto,
      telefono,
      correo,
    };

    try {
      await API.post("proveedores/", payload);
      alertSuccess("Proveedor creado correctamente.");
      window.location.href = "listar.html";
    } catch (err) {
      console.error("Error al crear proveedor:", err);
      alertError("No se pudo crear el proveedor. " + (err.message || ""));
    }
  });
}

// ============================================================
// EDITAR (editar.html)
// ============================================================

function initEditarProveedor() {
  const form = document.getElementById("formEditarProveedor");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) {
    alertError("No se recibió ID de proveedor.");
    return;
  }

  cargarProveedorEnFormulario(id);

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const nombre = (document.getElementById("nombre")?.value || "").trim();
    const rut = (document.getElementById("rut")?.value || "").trim();
    const nombreLegal = (document.getElementById("nombre_legal")?.value || "").trim();
    const ubicacion = (document.getElementById("ubicacion")?.value || "").trim();

    const contactoInput =
      document.getElementById("contacto") ||
      document.getElementById("nombreContacto") ||
      document.getElementById("contacto_nombre");

    const telefonoInput =
      document.getElementById("telefono") ||
      document.getElementById("fono") ||
      document.getElementById("telefono_contacto");

    const correoInput =
      document.getElementById("correo") ||
      document.getElementById("email") ||
      document.getElementById("correo_electronico");

    const contacto = (contactoInput?.value || "").trim();
    const telefono = (telefonoInput?.value || "").trim();
    const correo = (correoInput?.value || "").trim();

    if (!nombre) {
      alertError("El nombre es obligatorio.");
      return;
    }

    const payload = {
      nombre,
      rut,
      nombre_legal: nombreLegal,
      ubicacion,
      contacto,
      telefono,
      correo,
    };

    try {
      await API.put(`proveedores/${id}/`, payload);
      alertSuccess("Proveedor actualizado correctamente.");
      window.location.href = "listar.html";
    } catch (err) {
      console.error("Error al actualizar proveedor:", err);
      alertError("No se pudo actualizar el proveedor. " + (err.message || ""));
    }
  });
}

async function cargarProveedorEnFormulario(id) {
  try {
    const pRaw = await API.get(`proveedores/${id}/`);
    const p = normalizarProveedor(pRaw);

    const inputId = document.getElementById("proveedorId");
    const nombre = document.getElementById("nombre");
    const rut = document.getElementById("rut");
    const nombreLegal = document.getElementById("nombre_legal");
    const ubicacion = document.getElementById("ubicacion");

    const contactoInput =
      document.getElementById("contacto") ||
      document.getElementById("nombreContacto") ||
      document.getElementById("contacto_nombre");

    const telefonoInput =
      document.getElementById("telefono") ||
      document.getElementById("fono") ||
      document.getElementById("telefono_contacto");

    const correoInput =
      document.getElementById("correo") ||
      document.getElementById("email") ||
      document.getElementById("correo_electronico");

    if (inputId) inputId.value = p.id;
    if (nombre) nombre.value = p.nombre || "";
    if (rut) rut.value = p.rut || "";
    if (nombreLegal) nombreLegal.value = p.nombre_legal || "";
    if (ubicacion) ubicacion.value = p.ubicacion || "";

    if (contactoInput) contactoInput.value = p.contacto || "";
    if (telefonoInput) telefonoInput.value = p.telefono || "";
    if (correoInput) correoInput.value = p.correo || "";
  } catch (err) {
    console.error("Error al cargar proveedor para editar:", err);
    alertError("No se pudo cargar el proveedor para editar.");
  }
}

// ============================================================
// ELIMINAR (eliminar.html)
// ============================================================

function initEliminarProveedor() {
  const form = document.getElementById("formEliminarProveedor");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) {
    alertError("No se recibió ID de proveedor.");
    return;
  }

  const spanId = document.getElementById("proveedorIdEliminar");
  if (spanId) spanId.innerText = id;

  form.addEventListener("submit", async e => {
    e.preventDefault();
    try {
      await API.delete(`proveedores/${id}/`);
      alertSuccess("Proveedor eliminado correctamente.");
      window.location.href = "listar.html";
    } catch (err) {
      console.error("Error al eliminar proveedor:", err);
      alertError("No se pudo eliminar el proveedor. " + (err.message || ""));
    }
  });
}

// ============================================================
// DETALLE (detalle.html)
// ============================================================

function initDetalleProveedor() {
  const contenedor = document.getElementById("proveedor-detalle-info");
  if (!contenedor) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) {
    contenedor.innerHTML = `<p class="text-danger">No se recibió ID de proveedor.</p>`;
    return;
  }

  cargarDetalleProveedor(id);
}

async function cargarDetalleProveedor(id) {
  const dl = document.getElementById("proveedor-detalle-info");
  if (!dl) return;

  dl.innerHTML = `<p>Cargando...</p>`;

  try {
    const pRaw = await API.get(`proveedores/${id}/`);
    const p = normalizarProveedor(pRaw);

    dl.innerHTML = `
      <dt class="col-sm-4">ID</dt>
      <dd class="col-sm-8">${p.id}</dd>

      <dt class="col-sm-4">Nombre</dt>
      <dd class="col-sm-8">${p.nombre}</dd>

      <dt class="col-sm-4">Nombre Legal</dt>
      <dd class="col-sm-8">${p.nombre_legal}</dd>

      <dt class="col-sm-4">RUT</dt>
      <dd class="col-sm-8">${p.rut}</dd>

      <dt class="col-sm-4">Ubicación</dt>
      <dd class="col-sm-8">${p.ubicacion}</dd>

      <dt class="col-sm-4">Contacto</dt>
      <dd class="col-sm-8">${p.contacto}</dd>

      <dt class="col-sm-4">Teléfono</dt>
      <dd class="col-sm-8">${p.telefono}</dd>

      <dt class="col-sm-4">Email</dt>
      <dd class="col-sm-8">${p.email}</dd>
    `;

    const btnEditar = document.getElementById("btnEditarProveedor");
    if (btnEditar) {
      btnEditar.href = `editar.html?id=${p.id}`;
    }
  } catch (err) {
    console.error("Error al cargar detalle de proveedor:", err);
    dl.innerHTML = `<dt class="col-sm-4 text-danger">Error</dt><dd class="col-sm-8">No se pudo cargar el proveedor.</dd>`;
  }
}
