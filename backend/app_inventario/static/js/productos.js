// ============= CONFIGURACIÓN =============
const API_BASE_URL = '/api';

// ============= ELEMENTOS DEL DOM =============
const searchInput = document.getElementById('searchProduct');
const filterCategoria = document.getElementById('filterCategoria');
const filterEstado = document.getElementById('filterEstado');
const btnBuscar = document.getElementById('btnBuscar');
const btnLimpiar = document.getElementById('btnLimpiar');
const btnDisponibles = document.getElementById('btnDisponibles');
const tbody = document.getElementById('productosTableBody');
const loadingIndicator = document.getElementById('loadingIndicator');

// ============= INICIALIZACIÓN =============
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Iniciando aplicación...');
    await cargarFiltros();
    await cargarProductos();
});

// ============= CARGAR OPCIONES DE FILTROS =============
async function cargarFiltros() {
    try {
        // Cargar categorías
        const categoriasResponse = await fetch(`${API_BASE_URL}/categorias/`);
        const categoriasData = await categoriasResponse.json();
        const categorias = categoriasData.results || categoriasData;
        
        categorias.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.nombre;
            filterCategoria.appendChild(option);
        });

        // Cargar estados
        const estadosResponse = await fetch(`${API_BASE_URL}/estados/`);
        const estadosData = await estadosResponse.json();
        const estados = estadosData.results || estadosData;
        
        estados.forEach(est => {
            const option = document.createElement('option');
            option.value = est.id;
            option.textContent = est.nombre;
            filterEstado.appendChild(option);
        });

        console.log('Filtros cargados correctamente');
    } catch (error) {
        console.error('Error al cargar filtros:', error);
    }
}

// ============= FUNCIÓN PARA CARGAR PRODUCTOS =============
async function cargarProductos(filtros = {}) {
    try {
        mostrarCargando(true);
        
        // Construir URL con parámetros
        let url = `${API_BASE_URL}/productos/?`;
        
        if (filtros.search) {
            url += `search=${encodeURIComponent(filtros.search)}&`;
        }
        if (filtros.categoria) {
            url += `categoria=${filtros.categoria}&`;
        }
        if (filtros.estado) {
            url += `estado=${filtros.estado}&`;
        }

        console.log('Cargando desde:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        const productos = data.results || data;
        
        console.log(`${productos.length} productos cargados`);
        mostrarProductos(productos);
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Error al cargar productos: ${error.message}
                </td>
            </tr>
        `;
    } finally {
        mostrarCargando(false);
    }
}

// ============= FUNCIÓN PARA MOSTRAR PRODUCTOS =============
function mostrarProductos(productos) {
    if (!productos || productos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted">
                    <i class="bi bi-inbox me-2"></i>
                    No se encontraron productos
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = productos.map(producto => {
        const estadoClass = getEstadoClass(producto.estado_nombre);
        const marca = getMarcaNombre(producto.modelo_nombre);
        
        return `
            <tr data-producto-id="${producto.id}">
                <td><strong>${producto.nro_serie}</strong></td>
                <td>${producto.categoria_nombre || 'N/A'}</td>
                <td>${producto.modelo_nombre || 'N/A'}</td>
                <td>${marca}</td>
                <td>
                    <span class="badge ${estadoClass}">
                        ${producto.estado_nombre || 'Desconocido'}
                    </span>
                </td>
                <td class="font-monospace">${producto.rut_asignado || 'Sin asignar'}</td>
                <td>${formatearFecha(producto.fecha_compra)}</td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-primary" onclick="editarProducto(${producto.id})" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-info" onclick="verDetalle(${producto.id})" title="Ver detalle">
                            <i class="bi bi-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ============= PRODUCTOS DISPONIBLES =============
async function cargarProductosDisponibles() {
    try {
        mostrarCargando(true);
        const response = await fetch(`${API_BASE_URL}/productos/disponibles/`);
        const productos = await response.json();
        mostrarProductos(productos);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar productos disponibles');
    } finally {
        mostrarCargando(false);
    }
}

// ============= FUNCIONES AUXILIARES =============
function mostrarCargando(mostrar) {
    if (loadingIndicator) {
        loadingIndicator.style.display = mostrar ? 'block' : 'none';
    }
}

function getEstadoClass(estado) {
    const estados = {
        'operativo': 'bg-success',
        'activo': 'bg-success',
        'en mantención': 'bg-warning text-dark',
        'mantencion': 'bg-warning text-dark',
        'reparación': 'bg-warning text-dark',
        'dado de baja': 'bg-danger',
        'baja': 'bg-danger',
        'inactivo': 'bg-secondary'
    };
    return estados[estado?.toLowerCase()] || 'bg-secondary';
}

function getMarcaNombre(modeloNombre) {
    if (!modeloNombre) return 'N/A';
    return modeloNombre.split(' ')[0];
}

function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const año = date.getFullYear();
    return `${dia}/${mes}/${año}`;
}

// ============= FUNCIONES DE INTERACCIÓN =============
function editarProducto(id) {
    console.log('Editar producto:', id);
    // Redirigir a página de edición
    window.location.href = `/productos/editar/${id}/`;
}

async function verDetalle(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/productos/${id}/`);
        const producto = await response.json();
        
        console.log('Detalle:', producto);
        
        // Crear modal con información
        const detalle = `
Número de Serie: ${producto.nro_serie}
Categoría: ${producto.categoria.nombre}
Modelo: ${producto.modelo.nombre} ${producto.modelo.marca?.nombre || ''}
Estado: ${producto.estado.nombre}
Proveedor: ${producto.proveedor.nombre}
Fecha de Compra: ${formatearFecha(producto.fecha_compra)}
${producto.documento_factura ? 'Factura: ' + producto.documento_factura : ''}
        `;
        
        alert(detalle);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar el detalle');
    }
}

// ============= EVENT LISTENERS =============

// Botón buscar
if (btnBuscar) {
    btnBuscar.addEventListener('click', () => {
        aplicarFiltros();
    });
}

// Enter en búsqueda
if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            aplicarFiltros();
        }
    });
}

// Botón limpiar
if (btnLimpiar) {
    btnLimpiar.addEventListener('click', () => {
        searchInput.value = '';
        filterCategoria.value = '';
        filterEstado.value = '';
        cargarProductos();
    });
}

// Botón disponibles
if (btnDisponibles) {
    btnDisponibles.addEventListener('click', () => {
        cargarProductosDisponibles();
    });
}

// Función para aplicar todos los filtros
function aplicarFiltros() {
    const filtros = {
        search: searchInput.value.trim(),
        categoria: filterCategoria.value,
        estado: filterEstado.value
    };
    
    // Eliminar filtros vacíos
    Object.keys(filtros).forEach(key => {
        if (!filtros[key]) delete filtros[key];
    });
    
    console.log('Aplicando filtros:', filtros);
    cargarProductos(filtros);
}