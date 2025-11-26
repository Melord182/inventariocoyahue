// src/js/main.js

// ===================== VERIFICAR SESIÓN =====================
function verificarSesion() {
  const accessToken = localStorage.getItem("accessToken");
  const estaEnLogin = window.location.pathname.includes("login.html");

  // Si NO hay sesión → redirigimos al login
  if (!accessToken && !estaEnLogin) {
    window.location.href = "/paginas/login/login.html";
  }

  // Si ya hay sesión y está en login → enviar al dashboard
  if (accessToken && estaEnLogin) {
    window.location.href = "/index.html";
  }
}

// ===================== CARGAR UI =====================
function cargarUI() {
  verificarSesion();
  cargarTopbar();
  cargarSidebar();
  marcarNavActivo();
  configurarMenuMovil();
  configurarTema();
}

// ===================== TOPBAR =====================
function cargarTopbar() {
  const topbar = document.getElementById("app-topbar");
  if (!topbar) return;

  const usuarioLog = localStorage.getItem("userLogin") || "Usuario";

  topbar.innerHTML = `
    <div class="d-flex align-items-center gap-2">
      <button class="btn btn-link text-white d-lg-none p-0 me-2 menu-toggle" type="button">
        <i class="bi bi-list fs-3"></i>
      </button>
    </div>

    <div class="flex-grow-1 d-none d-md-flex justify-content-center">
      <div class="search-bar" style="max-width:420px; width:100%;">
        <input type="text" class="form-control form-control-sm search-input"
               placeholder="Buscar activo o serial">
      </div>
    </div>

    <div class="d-flex align-items-center gap-3">

      <!-- Notificaciones -->
      <a href="/paginas/notificaciones/listar.html" class="text-white position-relative">
        <i class="bi bi-bell-fill fs-4"></i>
        <span id="badgeNoti"
          class="badge bg-danger position-absolute top-0 start-100 translate-middle p-1 rounded-circle"
          style="display:none;"></span>
      </a>

      <!-- Tema -->
      <span id="btn-dark-toggle" class="toggle-dark" role="button">
        <i class="bi bi-moon-stars-fill" id="dark-icon"></i>
      </span>

      <!-- Usuario -->
      <div class="dropdown">
        <button class="btn btn-sm btn-outline-light dropdown-toggle user-area"
                type="button" data-bs-toggle="dropdown">
          ${usuarioLog}
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><a class="dropdown-item" href="/paginas/ajustes/ajustes.html">Ajustes</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item" onclick="cerrarSesion()">Cerrar sesión</a></li>
        </ul>
      </div>

    </div>
  `;
}

// ===================== SIDEBAR =====================
function cargarSidebar() {
  const sidebar = document.getElementById("app-sidebar");
  if (!sidebar) return;

  sidebar.innerHTML = `
<img src="/src/img/logo-coyahue.png" alt="Logo Coyahue" class="logo" />
<nav>
  <a class="nav-link" href="/index.html"><i class="bi bi-grid-fill"></i> Dashboard</a>
  <a class="nav-link" href="/paginas/productos/listar.html"><i class="bi bi-box-seam"></i> Productos</a>
  <a class="nav-link" href="/paginas/categorias/listar.html"><i class="bi bi-tags"></i> Categorías</a>
  <a class="nav-link" href="/paginas/proveedores/listar.html"><i class="bi bi-truck"></i> Proveedores</a>
  <a class="nav-link" href="/paginas/sucursal/listar.html"><i class="bi bi-geo-alt"></i> Sucursales</a>
  <a class="nav-link" href="/paginas/stock/listar.html"><i class="bi bi-collection"></i> Stock</a>
  <a class="nav-link" href="/paginas/reportes/listar.html"><i class="bi bi-graph-up"></i> Reportes</a>
  <a class="nav-link" href="/paginas/notificaciones/listar.html"><i class="bi bi-bell-fill"></i> Notificaciones</a>
  <a class="nav-link" href="/paginas/ajustes/ajustes.html"><i class="bi bi-gear"></i> Ajustes</a>
</nav>
`;
}

// ===================== CERRAR SESIÓN =====================
function cerrarSesion() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userLogin");
  window.location.href = "/paginas/login/login.html";
}

// ===================== MARCAR NAV ACTIVO =====================
function marcarNavActivo() {
  const links = document.querySelectorAll(".sidebar nav a");
  const currentPath = window.location.pathname;

  links.forEach(link => {
    const href = link.getAttribute("href");
    if (!href) return;

    if (currentPath.includes(href.replace("/", ""))) {
      link.classList.add("active");
    }
  });
}

// ===================== MENU MOVIL =====================
function configurarMenuMovil() {
  const btnMenu = document.querySelector(".menu-toggle");
  const sidebar = document.querySelector(".sidebar");
  if (!btnMenu || !sidebar) return;

  btnMenu.addEventListener("click", () => sidebar.classList.toggle("open"));
}

// ===================== MODO OSCURO =====================
function configurarTema() {
  const body = document.body;
  const toggle = document.getElementById("btn-dark-toggle");
  const icon = document.getElementById("dark-icon");
  if (!toggle || !icon) return;

  const temaGuardado = localStorage.getItem("theme") || "light";
  if (temaGuardado === "dark") {
    body.classList.add("dark-mode");
    icon.classList.replace("bi-moon-stars-fill", "bi-brightness-high-fill");
  }

  toggle.addEventListener("click", () => {
    const esDark = body.classList.toggle("dark-mode");
    icon.classList.toggle("bi-moon-stars-fill", !esDark);
    icon.classList.toggle("bi-brightness-high-fill", esDark);
    localStorage.setItem("theme", esDark ? "dark" : "light");
  });
}

// ===================== INICIO =====================
document.addEventListener("DOMContentLoaded", cargarUI);
