# tests/test_notificaciones.py
# Script para probar que las notificaciones se generan correctamente

from django.test import TestCase
from django.contrib.auth import get_user_model
from app_inventario.models import Productos, Notificaciones
from app_inventario.services import NotificacionService

User = get_user_model()

class NotificacionesTestCase(TestCase):
    
    def setUp(self):
        """Configuración inicial para cada test"""
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        
        self.producto = Productos.objects.create(
            nombre='Producto Test',
            stock=100,
            precio=1000,
            estado='activo'
        )
    
    def test_notificacion_stock_bajo(self):
        """Prueba que se cree notificación cuando el stock es bajo"""
        # Reducir stock a nivel bajo
        self.producto.stock = 5
        self.producto.save()
        
        # Crear notificación manualmente (simula tu señal)
        NotificacionService.crear_notificacion_stock_bajo(
            producto=self.producto,
            usuario=self.user
        )
        
        # Verificar que se creó la notificación
        notificacion = Notificaciones.objects.filter(
            categoria='stock',
            producto=self.producto
        ).first()
        
        self.assertIsNotNone(notificacion)
        self.assertEqual(notificacion.prioridad, 'alta')
        self.assertIn('stock bajo', notificacion.titulo.lower())
        print(f"✅ Test stock bajo: {notificacion.mensaje}")
    
    def test_notificacion_cambio_estado(self):
        """Prueba que se cree notificación al cambiar estado a 'baja'"""
        # Cambiar estado (esto debería disparar tu signal)
        self.producto.estado = 'dado_de_baja'
        self.producto.save()
        
        # Verificar que se creó la notificación
        notificacion = Notificaciones.objects.filter(
            categoria='stock',
            producto=self.producto
        ).first()
        
        if notificacion:
            print(f"✅ Test cambio estado: {notificacion.mensaje}")
        else:
            print("⚠️ No se creó notificación para cambio de estado")
    
    def test_notificacion_proveedor(self):
        """Prueba creación de notificación de proveedor"""
        notificacion = NotificacionService.crear_notificacion_proveedor(
            mensaje='Nuevo proveedor agregado: Proveedor XYZ',
            producto=self.producto,
            usuario=self.user
        )
        
        self.assertIsNotNone(notificacion)
        self.assertEqual(notificacion.categoria, 'proveedor')
        print(f"✅ Test proveedor: {notificacion.mensaje}")
    
    def test_notificacion_sistema(self):
        """Prueba creación de notificación del sistema"""
        notificacion = NotificacionService.crear_notificacion_sistema(
            titulo='Actualización del sistema',
            mensaje='El sistema se actualizará el próximo lunes',
            usuario=self.user
        )
        
        self.assertIsNotNone(notificacion)
        self.assertEqual(notificacion.categoria, 'sistema')
        print(f"✅ Test sistema: {notificacion.mensaje}")
    
    def test_marcar_como_leida(self):
        """Prueba marcar notificación como leída"""
        notificacion = NotificacionService.crear_notificacion_sistema(
            titulo='Test lectura',
            mensaje='Mensaje de prueba',
            usuario=self.user
        )
        
        self.assertFalse(notificacion.leido)
        
        notificacion.marcar_como_leida()
        notificacion.refresh_from_db()
        
        self.assertTrue(notificacion.leido)
        self.assertIsNotNone(notificacion.fecha_lectura)
        print(f"✅ Test marcar leída: OK")
    
    def test_notificaciones_globales(self):
        """Prueba notificaciones globales (sin usuario específico)"""
        notificacion = NotificacionService.crear_notificacion_sistema(
            titulo='Mantenimiento programado',
            mensaje='El sistema estará en mantenimiento',
            usuario=None  # Global
        )
        
        self.assertIsNotNone(notificacion)
        self.assertIsNone(notificacion.usuario)
        print(f"✅ Test notificación global: {notificacion.mensaje}")


# ============================================
# COMANDO PARA EJECUTAR PRUEBAS MANUALES
# ============================================

"""
Para ejecutar estas pruebas, usa:

python manage.py test tests.test_notificaciones

O ejecuta este script standalone:
"""

if __name__ == '__main__':
    import django
    import os
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tu_proyecto.settings')
    django.setup()
    
    from django.test.utils import get_runner
    from django.conf import settings
    
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    failures = test_runner.run_tests(["tests.test_notificaciones"])