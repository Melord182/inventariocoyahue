"""
ESTRUCTURA DE URLs DEL SISTEMA DE INVENTARIO

Este archivo define todas las rutas URL de la aplicación:
- API REST para el frontend moderno (ViewSets)
- Vistas tradicionales Django para el frontend clásico
- Endpoints AJAX para funcionalidades dinámicas
"""

"""
¿QUÉ ES UN ENDPOINT AJAX?
    - URLs que devuelven JSON (no HTML)
    - Se llaman desde JavaScript
    - Permiten actualizar partes de la página sin recargar
    
    Este endpoint en particular:
    - URL: /get-modelos-by-marca/?marca_id=1
    - Devuelve: [{"id": 1, "nombre": "Modelo A"}, ...]
    - Se usa para llenar dinámicamente el select de modelos
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import (
    ProveedoresViewSet,
    MarcasViewSet,
    CategoriasViewSet,
    ModelosViewSet,
    EstadosViewSet,
    ProductosViewSet,
    UsuariosViewSet,
    AsignacionesViewSet,
    MantencionesViewSet,
    HistorialEstadosViewSet,
    DocumentacionesViewSet,
    NotificacionesViewSet,
    LogAccesoViewSet,

    productos_list,
    productos_create
)

# Crear el router
router = DefaultRouter()

# Registrar todos los ViewSets
router.register(r'proveedores', ProveedoresViewSet, basename='proveedores')
router.register(r'marcas', MarcasViewSet, basename='marcas')
router.register(r'categorias', CategoriasViewSet, basename='categorias')
router.register(r'modelos', ModelosViewSet, basename='modelos')
router.register(r'estados', EstadosViewSet, basename='estados')
router.register(r'productos', ProductosViewSet, basename='productos')
router.register(r'usuarios', UsuariosViewSet, basename='usuarios')
router.register(r'asignaciones', AsignacionesViewSet, basename='asignaciones')
router.register(r'mantenciones', MantencionesViewSet, basename='mantenciones')
router.register(r'historial-estados', HistorialEstadosViewSet, basename='historial-estados')
router.register(r'documentaciones', DocumentacionesViewSet, basename='documentaciones')
router.register(r'notificaciones', NotificacionesViewSet, basename='notificaciones')
router.register(r'logs-acceso', LogAccesoViewSet, basename='logs-acceso')

# URLs de la app
urlpatterns = [
    path('api/', include(router.urls)),

    path('', views.productos_list, name='productos'), 
    path('productos/', views.productos_list, name='productos'),
    path('productos/agregar/', views.productos_create, name='producto_create'),
    path('productos/<int:pk>/', views.producto_detail, name='producto_detail'),
    path('productos/<int:pk>/editar/', views.productos_edit, name='producto_edit'),
    path('productos/<int:pk>/eliminar/', views.productos_delete, name='producto_delete'),
    path('productos/disponibles/', views.productos_disponibles, name='productos_disponibles'),
    

    # ============= ENDPOINTS AJAX =============
    path('get-modelos-by-marca/', views.get_modelos_by_marca, name='get_modelos_by_marca'),
]