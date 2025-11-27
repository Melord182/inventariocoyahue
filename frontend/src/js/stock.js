// src/js/stock.js
// Gestión de Stock (Dashboard + Entradas, Salidas, Ajustes) usando API Django + JWT

import { API } from "/src/js/api.js";

// -----------------------------
// Helpers
// -----------------------------
function normalizarLista(res) {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.results)) return res.results;
  return [];
}

function alertSuccess(msg) {
  if (window.Swal) {
    Swal.fire({
      icon: "success",
      title: "Éxito",
      text: msg,
      timer: 1600,
      showConfirmButton: false,
    });
  } else {
    alert(msg);
  }
}

function alertError(msg) {
  if (window.Swal) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: msg,
    });
  } else {
    alert(msg);
  }
}

// ============================================================
// DASHBOARD DE STOCK (listar.html)
// ============================================================

let chartSucursal = null;
let chartEstado = null;

async function initStockDashboard() {
  const dashboard = document.getElementById("stock-dashboard");
  if (!dashboard) return; // no estamos en la vista de stock

  const totalProductosEl = document.getElementById("totalProductos");
  const totalEnUsoEl = document.getElementById("totalEnUso");
  const totalBodegaEl = document.getElementById("totalBodega");
  const totalMantencionEl = document.getElementById("totalMantencion");
  const tbodyMov = document.getElementById("tbodyMovimientosStock");

  const canvasSucursal = document.getElementById("chartStockSucursal");
  const canvasEstado = document.getElementById("chartStockEstado");

  if (tbodyMov) {
    tbodyMov.innerHTML =
      '<tr><td colspan="4" class="text-center text-muted">Cargando movimientos...</td></tr>';
  }

  try {
    // 1) Productos para tarjetas y gráficos
    const resProd = await API.get("productos/");
    const productos = normalizarLista(resProd);

    const totales = {
      total: productos.length,
      enUso: 0,
      bodega: 0,
      mantencion: 0,
    };

    const porSucursal = {};
    const porEstado = {};

    productos.forEach((p) => {
      const estado = (p.estado_nombre || "").toLowerCase();
      const sucursal =
        (p.sucursal && p.sucursal.nombre) ||
        p.sucursal_nombre ||
        "Sin sucursal";

      // Totales por estado
      if (estado.includes("uso")) totales.enUso++;
      else if (estado.includes("mant")) totales.mantencion++;
      else totales.bodega++;

      // Stock por sucursal
      if (!porSucursal[sucursal]) porSucursal[sucursal] = 0;
      porSucursal[sucursal]++;

      // Conteo por etiqueta de estado
      const keyEstado = p.estado_nombre || "Sin estado";
      if (!porEstado[keyEstado]) porEstado[keyEstado] = 0;
      porEstado[keyEstado]++;
    });

    if (totalProductosEl) totalProductosEl.textContent = String(totales.total);
    if (totalEnUsoEl) totalEnUsoEl.textContent = String(totales.enUso);
    if (totalBodegaEl) totalBodegaEl.textContent = String(totales.bodega);
    if (totalMantencionEl)
      totalMantencionEl.textContent = String(totales.mantencion);

    // Gráfico por sucursal
    if (canvasSucursal && window.Chart) {
      if (chartSucursal) chartSucursal.destroy();
      const labelsSuc = Object.keys(porSucursal);
      const dataSuc = Object.values(porSucursal);

      chartSucursal = new Chart(canvasSucursal, {
        type: "bar",
        data: {
          labels: labelsSuc,
          datasets: [
            {
              label: "Equipos",
              data: dataSuc,
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true } },
          plugins: { legend: { display: false } },
        },
      });
    }

    // Gráfico por estado
    if (canvasEstado && window.Chart) {
      if (chartEstado) chartEstado.destroy();
      const labelsEst = Object.keys(porEstado);
      const dataEst = Object.values(porEstado);

      chartEstado = new Chart(canvasEstado, {
        type: "doughnut",
        data: {
          labels: labelsEst,
          datasets: [
            {
              data: dataEst,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom" } },
          cutout: "60%",
        },
      });
    }

    // 2) Movimientos recientes (usa el modelo Movimientos del backend)
    if (tbodyMov) {
      try {
        const resMov = await API.get("movimientos/");
        const movimientos = normalizarLista(resMov);

        if (!movimientos.length) {
          tbodyMov.innerHTML =
            '<tr><td colspan="4" class="text-center text-muted">Sin movimientos registrados.</td></tr>';
        } else {
          tbodyMov.innerHTML = "";
          movimientos.slice(0, 10).forEach((m) => {
            const fecha = m.fecha || m.fecha_movimiento || m.created_at || "";
            const sku = m.sku || "";
            const tipo = m.tipo || "";
            const detalle = m.comentarios || m.referencia || "";

            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td>${fecha}</td>
              <td>${sku}</td>
              <td>${tipo}</td>
              <td>${detalle}</td>
            `;
            tbodyMov.appendChild(tr);
          });
        }
      } catch (e) {
        console.warn("No se pudo cargar movimientos desde API:", e);
        tbodyMov.innerHTML =
          '<tr><td colspan="4" class="text-center text-muted">No se pudieron cargar los movimientos.</td></tr>';
      }
    }
  } catch (err) {
    console.error("Error cargando dashboard de stock:", err);
    if (totalProductosEl) totalProductosEl.textContent = "—";
    if (totalEnUsoEl) totalEnUsoEl.textContent = "—";
    if (totalBodegaEl) totalBodegaEl.textContent = "—";
    if (totalMantencionEl) totalMantencionEl.textContent = "—";
  }
}

// ============================================================
// FORMULARIOS DE ENTRADA, SALIDA, AJUSTE
// ============================================================

function initFormularioEntrada() {
  const form = document.getElementById("formEntradaStock");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const btn = form.querySelector("button[type='submit']");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = "Registrando…";
    }

    const sku = (document.getElementById("productoId")?.value || "").trim();
    const cantidad = Number(
      document.getElementById("cantidad")?.value || 0
    );
    const proveedor =
      (document.getElementById("proveedor")?.value || "").trim();
    const referencia =
      (document.getElementById("referencia")?.value || "").trim();
    const comentarios =
      (document.getElementById("comentarios")?.value || "").trim();

    if (!sku) {
      alertError("El SKU es obligatorio.");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML =
          '<i class="bi bi-plus-circle me-1"></i> Registrar Entrada';
      }
      return;
    }
    if (!cantidad || cantidad <= 0) {
      alertError("La cantidad debe ser mayor a 0.");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML =
          '<i class="bi bi-plus-circle me-1"></i> Registrar Entrada';
      }
      return;
    }

    const payload = {
      tipo: "entrada",
      sku,
      cantidad,
      proveedor,
      referencia,
      comentarios,
    };

    try {
      await API.post("movimientos/", payload);
      alertSuccess(`Entrada registrada para SKU ${sku}`);
      form.reset();
      window.location.href = "listar.html";
    } catch (err) {
      console.error("Error al registrar entrada de stock:", err);
      alertError("No se pudo registrar la entrada de stock.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML =
          '<i class="bi bi-plus-circle me-1"></i> Registrar Entrada';
      }
    }
  });
}

function initFormularioSalida() {
  const form = document.getElementById("formSalidaStock");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const btn = form.querySelector("button[type='submit']");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = "Registrando…";
    }

    const sku = (document.getElementById("productoId")?.value || "").trim();
    const cantidad = Number(
      document.getElementById("cantidad")?.value || 0
    );
    const motivo = document.getElementById("motivo")?.value || "";
    const referencia =
      (document.getElementById("referencia")?.value || "").trim();
    const comentarios =
      (document.getElementById("comentarios")?.value || "").trim();

    if (!sku) {
      alertError("El SKU es obligatorio.");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML =
          '<i class="bi bi-check-circle me-1"></i> Registrar Salida';
      }
      return;
    }
    if (!cantidad || cantidad <= 0) {
      alertError("La cantidad debe ser mayor a 0.");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML =
          '<i class="bi bi-check-circle me-1"></i> Registrar Salida';
      }
      return;
    }

    const payload = {
      tipo: "salida",
      sku,
      cantidad,
      proveedor: "", // en salida no usamos proveedor, lo dejamos vacío
      referencia: motivo || referencia,
      comentarios,
    };

    try {
      await API.post("movimientos/", payload);
      alertSuccess(`Salida registrada para SKU ${sku}`);
      form.reset();
      window.location.href = "listar.html";
    } catch (err) {
      console.error("Error al registrar salida de stock:", err);
      alertError("No se pudo registrar la salida de stock.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML =
          '<i class="bi bi-check-circle me-1"></i> Registrar Salida';
      }
    }
  });
}

function initFormularioAjuste() {
  const form = document.getElementById("formAjusteStock");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const btn = form.querySelector("button[type='submit']");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = "Guardando…";
    }

    const sku = (document.getElementById("productoId")?.value || "").trim();
    const nuevaCantidad = Number(
      document.getElementById("nuevaCantidad")?.value || 0
    );
    const tipoAjuste = document.getElementById("tipoAjuste")?.value || "";
    const comentariosBase =
      (document.getElementById("comentarios")?.value || "").trim();

    if (!sku) {
      alertError("El SKU es obligatorio.");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML =
          '<i class="bi bi-save me-1"></i> Guardar Ajuste';
      }
      return;
    }
    if (nuevaCantidad < 0) {
      alertError("La nueva cantidad no puede ser negativa.");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML =
          '<i class="bi bi-save me-1"></i> Guardar Ajuste';
      }
      return;
    }

    const comentarios =
      tipoAjuste && comentariosBase
        ? "[" + tipoAjuste + "] " + comentariosBase
        : tipoAjuste
        ? "[" + tipoAjuste + "]"
        : comentariosBase;

    const payload = {
      tipo: "ajuste",
      sku,
      cantidad: nuevaCantidad, // usamos cantidad = stock real
      proveedor: "",
      referencia: "",
      comentarios,
    };

    try {
      await API.post("movimientos/", payload);
      alertSuccess(`Ajuste aplicado a SKU ${sku}`);
      form.reset();
      window.location.href = "listar.html";
    } catch (err) {
      console.error("Error al guardar ajuste de stock:", err);
      alertError("No se pudo guardar el ajuste de stock.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML =
          '<i class="bi bi-save me-1"></i> Guardar Ajuste';
      }
    }
  });
}

// ============================================================
// INICIALIZACIÓN GLOBAL
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  initStockDashboard();
  initFormularioEntrada();
  initFormularioSalida();
  initFormularioAjuste();
});
