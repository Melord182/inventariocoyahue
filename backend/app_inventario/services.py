# app_inventario/services.py
from django.db.models import Count
from .models import Notificaciones, Categorias, Productos 
from django.db.models import Count, Q

class NotificacionService:
    """Servicio para gestionar notificaciones del inventario"""
    
    @staticmethod
    def crear_notificaciones_stock_inteligente(usuario):
        """
        Notificaciones basadas en campos REALES del modelo Productos
        """
        notificaciones = []
        
        # 1. Productos sin categoría
        productos_sin_categoria = Productos.objects.filter(categoria__isnull=True)
        if productos_sin_categoria.exists():
            notif = Notificaciones.objects.create(
                categoria='inventario',
                titulo='📦 Productos sin Categoría',
                mensaje=f'{productos_sin_categoria.count()} productos no tienen categoría asignada',
                usuario=usuario,
                prioridad='alta'
            )
            notificaciones.append(notif)
        
        # 2. Productos sin proveedor  
        productos_sin_proveedor = Productos.objects.filter(proveedor__isnull=True)
        if productos_sin_proveedor.exists():
            notif = Notificaciones.objects.create(
                categoria='inventario',
                titulo='🏢 Productos sin Proveedor',
                mensaje=f'{productos_sin_proveedor.count()} productos no tienen proveedor asignado',
                usuario=usuario,
                prioridad='media'
            )
            notificaciones.append(notif)
        
        return notificaciones
    
    @staticmethod
    def crear_notificacion_proveedor(mensaje, producto=None, usuario=None, prioridad='media'):
        return Notificaciones.objects.create(
            categoria='proveedor',
            titulo='Actualización de proveedor',
            mensaje=mensaje,
            producto=producto,
            usuario=usuario,
            prioridad=prioridad
        )
    
    @staticmethod
    def crear_notificacion_sistema(titulo, mensaje, usuario=None, prioridad='baja'):
        return Notificaciones.objects.create(
            categoria='sistema',
            titulo=titulo,
            mensaje=mensaje,
            usuario=usuario,
            prioridad=prioridad
        )
    
    @staticmethod
    def crear_notificacion_mantenimiento(titulo, mensaje, usuario=None):
        return Notificaciones.objects.create(
            categoria='mantenimiento',
            titulo=titulo,
            mensaje=mensaje,
            usuario=usuario,
            prioridad='media'
        )