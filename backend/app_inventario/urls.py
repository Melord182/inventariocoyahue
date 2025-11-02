from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import (
    productos,
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
    LogAccesoViewSet
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
    path('', views.productos, name='productos' ),
]