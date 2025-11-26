// src/js/productos.js
// Frontend CRUD para Productos (lista, filtro, detalle, crear, editar, eliminar)
// Requiere: /src/js/api.js que exporta { API } y JWT válido en localStorage.

import { API } from "/src/js/api.js";

// -----------------------------------------------------------
// Utilidades generales
// -----------------------------------------------------------

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function nombreProducto(prod) {
  if (!prod) return "";
  // Asumimos que el serializer expone modelo_nombre + nro_serie
  return `${prod.modelo_nombre} - ${prod.nro_serie}`;
}

let productosCache = []; // lista completa desde la API

// -----------------------------------------------------------
// DETECCIÓN DE PÁGINA
// -----------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  if (path.endsWith("listar.html")) {
    initListar();
  } else if (path.endsWith("detalle.html")) {
    initDetalle();
  } else if (path.endsWith("agregar.html")) {
    initAgregar();
  } else if (path.endsWith("editar.html")) {
    initEditar();
  } else if (path.endsWith("eliminar.html")) {
    initEliminar();
  }
});

// -----------------------------------------------------------
// LISTAR (listar.html)
// -----------------------------------------------------------

function initListar() {
  const btnTabla = document.getElementById("btnTabla");
  const btnTarjetas = document.getElementById("btnTarjetas");
  const vistaTabla = document.getElementById("vistaTabla");
  const vistaTarjetas = document.getElementById("vistaTarjetas");

  // toggle tabla/tarjetas
  if (btnTabla && btnTarjetas && vistaTabla && vistaTarjetas) {
    btnTabla.addEventListener("click", () => {
      btnTabla.classList.add("active");
      btnTarjetas.classList.remove("active");
      vistaTabla.classList.remove("d-none");
      vistaTarjetas.classList.add("d-none");
    });

    btnTarjetas.addEventListener("click", () => {
      btnTarjetas.classList.add("active");
      btnTabla.classList.remove("active");
      vistaTabla.classList.add("d-none");
      vistaTarjetas.classList.remove("d-none");
    });
  }

  const inputBuscar = document.getElementById("inputBuscar");
  const filtroCategoria = document.getElementById("filtroCategoria");
  const filtroSucursal = document.getElementById("filtroSucursal");
  const filtroEstado = document.getElementById("filtroEstado");

  const reCargar = () => aplicarFiltrosYRender();

  if (inputBuscar) inputBuscar.addEventListener("input", reCargar);
  if (filtroCategoria) filtroCategoria.addEventListener("change", reCargar);
  if (filtroSucursal) filtroSucursal.addEventListener("change", reCargar);
  if (filtroEstado) filtroEstado.addEventListener("change", reCargar);

  cargarProductosLista();
}

async function cargarProductosLista() {
  const tbody = document.getElementById("tbodyProductos");
  const cardsCont = document.getElementById("cardsProductos");

  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="9">Cargando productos...</td></tr>`;
  }
  if (cardsCont) {
    cardsCont.innerHTML = `<p>Cargando productos...</p>`;
  }

  try {
    const res = await API.get("productos/"); // GET /api/api/productos/
    // 👇 Normalizamos: si viene paginado, usamos res.results
    productosCache = Array.isArray(res) ? res : (res.results || []);

    poblarFiltrosDesdeProductos();
    aplicarFiltrosYRender();
  } catch (err) {
    console.error("Error al cargar productos:", err);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="9">Error al cargar productos</td></tr>`;
    }
    if (cardsCont) {
      cardsCont.innerHTML = `<p>Error al cargar productos</p>`;
    }
  }
}
function poblarFiltrosDesdeProductos() {
  function getNombreCampo(campo, fallback = "—") {
  if (campo === null || campo === undefined) return fallback;
  if (typeof campo === "object") {
    if (campo.nombre) return campo.nombre;
    if (campo.nombre_categoria) return campo.nombre_categoria;
    if (campo.nombre_sucursal) return campo.nombre_sucursal;
    if (campo.nombre_estado) return campo.nombre_estado;
    if (campo.garantia_meses) return campo.garantia_meses;
    return JSON.stringify(campo);
  }
  return campo;
}

  if (!productosCache.length) return;

  const filtroCategoria = document.getElementById("filtroCategoria");
  const filtroSucursal = document.getElementById("filtroSucursal");
  const filtroEstado = document.getElementById("filtroEstado");

  const cats = [...new Set(
    productosCache.map(p =>
      p.categoria_nombre || getNombreCampo(p.categoria, null)
    ).filter(Boolean)
  )];

  const sucs = [...new Set(
    productosCache.map(p =>
      p.sucursal_nombre || getNombreCampo(p.sucursal, null)
    ).filter(Boolean)
  )];

  const ests = [...new Set(
    productosCache.map(p =>
      p.estado_nombre || getNombreCampo(p.estado, null)
    ).filter(Boolean)
  )];

  if (filtroCategoria) {
    filtroCategoria.innerHTML = `<option value="">Categoría: Todas</option>` +
      cats.map(c => `<option value="${c}">${c}</option>`).join("");
  }

  if (filtroSucursal) {
    filtroSucursal.innerHTML = `<option value="">Sucursal: Todas</option>` +
      sucs.map(s => `<option value="${s}">${s}</option>`).join("");
  }

  if (filtroEstado) {
    filtroEstado.innerHTML = `<option value="">Estado: Todos</option>` +
      ests.map(e => `<option value="${e}">${e}</option>`).join("");
  }
}
function aplicarFiltrosYRender() {
  function getNombreCampo(campo, fallback = "—") {
  if (campo === null || campo === undefined) return fallback;
  if (typeof campo === "object") {
    if (campo.nombre) return campo.nombre;
    if (campo.nombre_categoria) return campo.nombre_categoria;
    if (campo.nombre_sucursal) return campo.nombre_sucursal;
    if (campo.nombre_estado) return campo.nombre_estado;
    return JSON.stringify(campo);
  }
  return campo;
}

  const inputBuscar = document.getElementById("inputBuscar");
  const filtroCategoria = document.getElementById("filtroCategoria");
  const filtroSucursal = document.getElementById("filtroSucursal");
  const filtroEstado = document.getElementById("filtroEstado");

  const texto = (inputBuscar?.value || "").toLowerCase();
  const cat = filtroCategoria?.value || "";
  const suc = filtroSucursal?.value || "";
  const est = filtroEstado?.value || "";

  const filtrados = productosCache.filter(p => {
    const t = texto.trim();

    const categoriaTexto =
      p.categoria_nombre || getNombreCampo(p.categoria, "");
    const sucursalTexto =
      p.sucursal_nombre || getNombreCampo(p.sucursal, "");
    const estadoTexto =
      p.estado_nombre || getNombreCampo(p.estado, "");

    const coincideTexto =
      !t ||
      (p.nro_serie || "").toLowerCase().includes(t) ||
      nombreProducto(p).toLowerCase().includes(t) ||
      categoriaTexto.toLowerCase().includes(t) ||
      sucursalTexto.toLowerCase().includes(t);

    const coincideCat = !cat || categoriaTexto === cat;
    const coincideSuc = !suc || sucursalTexto === suc;
    const coincideEst = !est || estadoTexto === est;

    return coincideTexto && coincideCat && coincideSuc && coincideEst;
  });

  renderTablaProductos(filtrados);
  renderTarjetasProductos(filtrados);
}
function renderTablaProductos(lista) {
  const tbody = document.getElementById("tbodyProductos");
  if (!tbody) return;

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="9">No hay productos que coincidan con el filtro.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";

  lista.forEach(p => {
    const tr = document.createElement("tr");
    const qrUrl = p.codigo_qr?.qr_url || "/src/img/qr-placeholder.png";

    const sucursalTexto =
      p.sucursal_nombre || getNombreCampo(p.sucursal, "—");
    const estadoTexto =
      p.estado_nombre || getNombreCampo(p.estado, "—");

    const garantiaValor = p.garantia_meses ?? p.garantia ?? null;
    const garantiaTexto =
      garantiaValor === null || garantiaValor === "" ? "—" : `${garantiaValor} meses`;

    tr.innerHTML = `
      <td><input type="checkbox"></td>
      <td>${p.nro_serie}</td>
      <td>${nombreProducto(p)}</td>
      <td>${sucursalTexto}</td>
      <td>${p.documento_factura || "—"}</td>
      <td>${garantiaTexto}</td>
      <td>${estadoTexto}</td>
      <td class="d-flex gap-1">
        <a href="detalle.html?id=${p.id}" class="btn btn-sm btn-primary">
          <i class="bi bi-eye"></i>
        </a>
        <a href="editar.html?id=${p.id}" class="btn btn-sm btn-warning">
          <i class="bi bi-pencil"></i>
        </a>
        <a href="eliminar.html?id=${p.id}" class="btn btn-sm btn-danger">
          <i class="bi bi-trash"></i>
        </a>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function renderTarjetasProductos(lista) {
  function getNombreCampo(campo, fallback = "—") {
  if (campo === null || campo === undefined) return fallback;
  if (typeof campo === "object") {
    if (campo.nombre) return campo.nombre;
    if (campo.nombre_categoria) return campo.nombre_categoria;
    if (campo.nombre_sucursal) return campo.nombre_sucursal;
    if (campo.nombre_estado) return campo.nombre_estado;
    return JSON.stringify(campo);
  }
  return campo;
}

  const cont = document.getElementById("cardsProductos");
  if (!cont) return;

  if (!lista.length) {
    cont.innerHTML = `<p class="text-muted">No hay productos que coincidan con el filtro.</p>`;
    return;
  }

  cont.innerHTML = "";

  lista.forEach(p => {
    const col = document.createElement("div");
    col.className = "col-md-4 col-lg-3 mb-3";

    const qrUrl = p.codigo_qr?.qr_url || "/src/img/qr-placeholder.png";
const garantiaValor = p.garantia_meses ?? p.garantia ?? null;
const garantiaTexto =
  garantiaValor === null || garantiaValor === "" ? "—" : `${garantiaValor} meses`;
    const categoriaTexto =
      p.categoria_nombre || getNombreCampo(p.categoria, "—");
    const sucursalTexto =
      p.sucursal_nombre || getNombreCampo(p.sucursal, "Sin sucursal");
    const estadoTexto =
      p.estado_nombre || getNombreCampo(p.estado, "—");

    col.innerHTML = `
      <div class="card p-3 h-100 text-center">
        <h6 class="fw-bold mb-1">${nombreProducto(p)}</h6>
        <small class="text-muted d-block mb-1">${categoriaTexto}</small>
        <span class="badge bg-light text-dark mb-1">${sucursalTexto}</span>
        <p class="small mb-1"><strong>Estado:</strong> ${estadoTexto}</p>
        <p class="small mb-1"><strong>Garantía:</strong> ${p.garantia_meses} meses</p>

     
          <a href="detalle.html?id=${p.id}" class="btn btn-sm btn-primary">
            <i class="bi bi-eye"></i>
          </a>
          <a href="editar.html?id=${p.id}" class="btn btn-sm btn-warning">
            <i class="bi bi-pencil"></i>
          <a href="eliminar.html?id=${p.id}" class="btn btn-sm btn-danger">
            <i class="bi bi-trash"></i>
          </a>
        </div>
      </div>
    `;

    cont.appendChild(col);
  });
}

// -----------------------------------------------------------
// DETALLE (detalle.html)
// -----------------------------------------------------------

function initDetalle() {
  const id = getParam("id");
  if (!id) return;
  cargarDetalleProducto(id);
  const btnImprimir = document.getElementById("btn-imprimir-qr");
  if (btnImprimir) {
    btnImprimir.addEventListener("click", imprimirQRProducto);
  }
}
// Helpers para leer nombres de campos que pueden venir como string u objeto
function getNombreCampo(campo, fallback = "—") {
  if (campo === null || campo === undefined) return fallback;
  if (typeof campo === "object") {
    // Si viene como { id: X, nombre: "Texto" }
    if (campo.nombre) return campo.nombre;
    if (campo.nombre_categoria) return campo.nombre_categoria;
    if (campo.nombre_sucursal) return campo.nombre_sucursal;
    if (campo.nombre_estado) return campo.nombre_estado;
    // Si no hay nada más útil, devolvemos JSON serializado
    return JSON.stringify(campo);
  }
  // Si es string o número directo
  return campo;
}

   function imprimirQRProducto() {
  const qrImg = document.getElementById("qr-img");
  if (!qrImg || !qrImg.src) {
    alert("No hay código QR disponible para este producto.");
    return;
  }

  const nombre = document.getElementById("nombreProd")?.textContent || "";
  const codigo = document.getElementById("codigoProd")?.textContent || "";

  // Abrimos una ventana nueva solo con el QR y datos básicos
  const win = window.open("", "_blank", "width=400,height=600");
  if (!win) {
    alert("No se pudo abrir la ventana de impresión (revisa el bloqueador de pop-ups).");
    return;
  }

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>QR ${codigo}</title>
      <style>
        body {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          text-align: center;
          margin: 0;
          padding: 20px;
        }
        h1 {
          font-size: 18px;
          margin: 0 0 4px 0;
        }
        h2 {
          font-size: 14px;
          margin: 0 0 16px 0;
        }
        img {
          max-width: 100%;
          height: auto;
        }
      </style>
    </head>
    <body>
      <h1>${nombre}</h1>
      <h2>${codigo}</h2>
      <img src="${qrImg.src}" alt="QR ${codigo}">
      <script>
        window.onload = function() {
          window.print();
        };
      <\/script>
    </body>
    </html>
  `);
  win.document.close();
}

async function cargarDetalleProducto(id) {
  try {
    const p = await API.get(`productos/${id}/`); // GET /api/api/productos/<id>/

    const elNombre = document.getElementById("nombreProd");
    const elCodigo = document.getElementById("codigoProd");
    const elCategoria = document.getElementById("categoriaProd");
    const elSucursal = document.getElementById("sucursalProd");
    const elEstado = document.getElementById("estadoProd");
    const elPrecio = document.getElementById("precioProd");
    const elFecha = document.getElementById("fechaProd");
    const elGarantia = document.getElementById("garantiaProd");
    const elFactura = document.getElementById("facturaProd");
    const elComponentes = document.getElementById("componentesProd");
    const elHistorial = document.getElementById("historialProd");
    const elBtnEditar = document.getElementById("btnEditar");

    // Nombre principal (modelo + nro_serie si existen, si no, cae en nro_serie)
    const nombreVisible =
      (p.modelo_nombre ? `${p.modelo_nombre} - ${p.nro_serie}` : null) ||
      `${p.nro_serie}`;

    if (elNombre) elNombre.textContent = nombreVisible;
    if (elCodigo) elCodigo.textContent = p.nro_serie || "—";

    // Campos que ahora estaban quedando en blanco:
    const categoriaTexto =
      p.categoria_nombre || getNombreCampo(p.categoria) || "—";
    const sucursalTexto =
      p.sucursal_nombre || getNombreCampo(p.sucursal) || "—";
    const estadoTexto =
      p.estado_nombre || getNombreCampo(p.estado) || "—";

    if (elCategoria) elCategoria.textContent = categoriaTexto;
    if (elSucursal) elSucursal.textContent = sucursalTexto;
    if (elEstado) elEstado.textContent = estadoTexto;

    // Estos ya se te veían:
    if (elFactura) elFactura.textContent = p.documento_factura || "—";
    if (elPrecio) elPrecio.textContent = p.documento_factura || "—";
    if (elFecha) elFecha.textContent = p.fecha_compra || "—";
    if (elGarantia) elGarantia.textContent =
      (p.garantia_meses ?? "") !== "" ? `${p.garantia_meses} meses` : "—";

    // Componentes: el backend no tiene ese campo, ponemos mensaje
    if (elComponentes) {
      elComponentes.innerHTML =
        `<li class="text-muted">Sin detalle de componentes en la API.</li>`;
    }

    // Historial de estados (nombre de campo puede variar)
    if (elHistorial) {
      elHistorial.innerHTML = "";
      const historial =
        p.historial_estados || p.historial || p.historialEstados || [];
      if (Array.isArray(historial) && historial.length) {
        historial.forEach(h => {
          const li = document.createElement("li");
          li.className = "list-group-item";
          const estadoH = h.estado_nombre || getNombreCampo(h.estado) || "";
          const fechaH = h.fecha_cambio || h.fecha || "";
          li.innerHTML = `<strong>${estadoH}</strong> — ${fechaH}`;
          elHistorial.appendChild(li);
        });
      } else {
        elHistorial.innerHTML =
          `<li class="list-group-item text-muted">Sin historial registrado.</li>`;
      }
    }

    // Mostrar QR generado por Django
    const qrImg = document.getElementById("qr-img");
    if (qrImg && p.codigo_qr) {
    // Intenta primero imagen_qr_url, luego imagen_qr
    const qrUrl = p.codigo_qr.imagen_qr_url || p.codigo_qr.imagen_qr;
    
    if (qrUrl) {
        // Si la URL es relativa, agregar el backend base URL
        if (qrUrl.startsWith('/media/')) {
            qrImg.src = `http://127.0.0.1:8000${qrUrl}`;
        } else {
            qrImg.src = qrUrl;
        }
        
        // Debug
        console.log('URL del QR:', qrImg.src);
    } else {
        console.log('No hay imagen QR disponible para este producto');
    }
}
  } catch (err) {
    console.error("Error al cargar detalle:", err);
    alert("No se pudo cargar el producto.");
  }
}

// -----------------------------------------------------------
// AGREGAR (agregar.html)
// -----------------------------------------------------------

function initAgregar() {
  const form = document.getElementById("formProducto");
  if (!form) return;

  // Carga de selects desde la API
  cargarSelectsProducto().then(() => {
    // Si viene un código desde escáner QR
    const codigoParam = getParam("codigo");
    if (codigoParam) {
      const inputCodigo = document.getElementById("codigo");
      if (inputCodigo) inputCodigo.value = codigoParam;
    }
  });

  form.addEventListener("submit", onSubmitNuevoProducto);
}

async function onSubmitNuevoProducto(e) {
  e.preventDefault();

  const codigo = document.getElementById("codigo")?.value?.trim();
  const proveedor = document.getElementById("proveedor")?.value;
  const modelo = document.getElementById("modelo")?.value;
  const categoria = document.getElementById("categoria")?.value;
  const sucursal = document.getElementById("sucursal")?.value;
  const estado = document.getElementById("estado")?.value;
  const fechaCompra = document.getElementById("fechaCompra")?.value;
  const mesesGarantia = document.getElementById("mesesGarantia")?.value;
  const factura = document.getElementById("factura")?.value;

  if (!codigo || !proveedor || !modelo || !categoria || !estado || !fechaCompra || !mesesGarantia || !factura) {
    alert("Completa todos los campos obligatorios.");
    return;
  }

  const payload = {
    nro_serie: codigo,
    proveedor: parseInt(proveedor),
    modelo: parseInt(modelo),
    categoria: parseInt(categoria),
    sucursal: sucursal ? parseInt(sucursal) : null,
    estado: parseInt(estado),
    fecha_compra: fechaCompra,
    garantia_meses: parseInt(mesesGarantia),
    documento_factura: factura,
  };

  try {
    await API.post("productos/", payload);
    alert("Producto creado correctamente.");
    window.location.href = "listar.html";
  } catch (err) {
    console.error("Error al crear producto:", err);
    alert("No se pudo crear el producto. Revisa los datos.");
  }
}

// -----------------------------------------------------------
// EDITAR (editar.html)
// -----------------------------------------------------------

function initEditar() {
  const form = document.getElementById("formEditarProducto");
  if (!form) return;

  const id = getParam("id");
  if (!id) {
    alert("Falta el ID del producto");
    window.location.href = "listar.html";
    return;
  }

  cargarSelectsProducto().then(() => {
    cargarDatosEdicion(id);
  });

  form.addEventListener("submit", e => onSubmitEditarProducto(e, id));
}
// Helper para obtener el ID desde un campo que puede ser número u objeto
function getId(field) {
  if (field === null || field === undefined) return "";
  if (typeof field === "object") {
    return field.id ?? "";
  }
  return field; // ya es un número o string
}

async function cargarDatosEdicion(id) {
  try {
    const p = await API.get(`productos/${id}/`);

    const cod = document.getElementById("codigo");
    const proveedor = document.getElementById("proveedor");
    const modelo = document.getElementById("modelo");
    const categoria = document.getElementById("categoria");
    const sucursal = document.getElementById("sucursal");
    const estado = document.getElementById("estado");
    const fechaCompra = document.getElementById("fechaCompra");
    const mesesGarantia = document.getElementById("mesesGarantia");
    const factura = document.getElementById("factura");

    if (cod) cod.value = p.nro_serie;

    if (proveedor) proveedor.value = getId(p.proveedor);
    if (modelo) modelo.value = getId(p.modelo);
    if (categoria) categoria.value = getId(p.categoria);
    if (sucursal) sucursal.value = getId(p.sucursal);
    if (estado) estado.value = getId(p.estado);

    if (fechaCompra) fechaCompra.value = p.fecha_compra;
    if (mesesGarantia) mesesGarantia.value = p.garantia_meses;
    if (factura) factura.value = p.documento_factura;

  } catch (err) {
    console.error("Error al cargar producto para editar:", err);
    alert("No se pudo cargar el producto.");
  }
}

async function onSubmitEditarProducto(e, id) {
  e.preventDefault();

  const codigo = document.getElementById("codigo")?.value?.trim();
  const proveedor = document.getElementById("proveedor")?.value;
  const modelo = document.getElementById("modelo")?.value;
  const categoria = document.getElementById("categoria")?.value;
  const sucursal = document.getElementById("sucursal")?.value;
  const estado = document.getElementById("estado")?.value;
  const fechaCompra = document.getElementById("fechaCompra")?.value;
  const mesesGarantia = document.getElementById("mesesGarantia")?.value;
  const factura = document.getElementById("factura")?.value;

  if (!codigo || !proveedor || !modelo || !categoria || !estado || !fechaCompra || !mesesGarantia || !factura) {
    alert("Completa todos los campos obligatorios.");
    return;
  }

  const payload = {
    nro_serie: codigo,
    proveedor: parseInt(proveedor),
    modelo: parseInt(modelo),
    categoria: parseInt(categoria),
    sucursal: sucursal ? parseInt(sucursal) : null,
    estado: parseInt(estado),
    fecha_compra: fechaCompra,
    garantia_meses: parseInt(mesesGarantia),
    documento_factura: factura,
  };

  try {
    await API.put(`productos/${id}/`, payload);
    alert("Producto actualizado correctamente.");
    window.location.href = "listar.html";
  } catch (err) {
    console.error("Error al actualizar producto:", err);
    alert("No se pudo actualizar el producto.");
  }
}

// -----------------------------------------------------------
// ELIMINAR (eliminar.html)
// -----------------------------------------------------------
// Helper para leer nombres de campos que pueden venir como string u objeto

function initEliminar() {
  function getNombreCampo(campo, fallback = "—") {
  if (campo === null || campo === undefined) return fallback;
  if (typeof campo === "object") {
    if (campo.nombre) return campo.nombre;
    if (campo.nombre_categoria) return campo.nombre_categoria;
    if (campo.nombre_sucursal) return campo.nombre_sucursal;
    if (campo.nombre_estado) return campo.nombre_estado;
    return JSON.stringify(campo);
  }
  return campo; // string o número
}
  const id = getParam("id");
  if (!id) {
    alert("Falta el ID del producto");
    window.location.href = "listar.html";
    return;
  }

  const form = document.getElementById("formEliminarProducto");
  const infoDiv = document.getElementById("producto-eliminar-info");

  // Mostrar resumen del producto
  API.get(`productos/${id}/`)
    .then(p => {
      if (infoDiv) {
        const categoriaTexto =
          p.categoria_nombre || getNombreCampo(p.categoria) || "—";
        const sucursalTexto =
          p.sucursal_nombre || getNombreCampo(p.sucursal) || "—";
        const estadoTexto =
          p.estado_nombre || getNombreCampo(p.estado) || "—";

        infoDiv.innerHTML = `
          <p><strong>${nombreProducto(p)}</strong></p>
          <p>Categoría: ${categoriaTexto}</p>
          <p>Sucursal: ${sucursalTexto}</p>
          <p>Estado: ${estadoTexto}</p>
        `;
      }
    })
    .catch(err => {
      console.error("Error al cargar producto a eliminar:", err);
      if (infoDiv) {
        infoDiv.textContent = "No se pudo cargar el producto.";
      }
    });

  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();
      if (!confirm("¿Seguro que quieres eliminar este producto?")) return;

      try {
        await API.delete(`productos/${id}/`);
        alert("Producto eliminado correctamente.");
        window.location.href = "listar.html";
      } catch (err) {
        console.error("Error al eliminar producto:", err);
        alert("No se pudo eliminar el producto.");
      }
    });
  }
}

// -----------------------------------------------------------
// Carga de selects (proveedor, modelo, categoria, sucursal, estado)
// para agregar/editar
// -----------------------------------------------------------

async function cargarSelectsProducto() {
  try {
    await Promise.all([
      cargarSelect("proveedor", "proveedores/"),
      cargarSelect("modelo", "modelos/"),
      cargarSelect("categoria", "categorias/"),
      cargarSelect("sucursal", "sucursales/", true), // opcional
      cargarSelect("estado", "estados/"),
    ]);
  } catch (err) {
    console.error("Error al cargar selects de producto:", err);
    alert("No se pudieron cargar los datos de soporte (sucursales, categorías, etc.).");
  }
}
async function cargarSelect(elementId, endpoint, allowEmpty = false) {
  const select = document.getElementById(elementId);
  if (!select) return;

  let data = await API.get(endpoint); // p.ej. "categorias/"

  // 👇 Igual, por si viene paginado
  data = Array.isArray(data) ? data : (data.results || []);

  select.innerHTML = allowEmpty
    ? `<option value="">(Ninguna)</option>`
    : `<option value="">Seleccione...</option>`;

  data.forEach(item => {
    // Asumimos que cada item tiene id y nombre
    select.innerHTML += `<option value="${item.id}">${item.nombre}</option>`;
  });
}
