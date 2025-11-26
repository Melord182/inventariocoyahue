# signals.py
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from .models import Productos, CodigoQR, Notificaciones
from .services import NotificacionService




@receiver(post_save, sender=Productos)
def crear_qr_producto(sender, instance, created, **kwargs):
    if created:
        # Crear la instancia QR asociada
        qr = CodigoQR.objects.create(producto=instance)
        qr.generar_qr()
        qr.save()


# Señales para crear notificaciones automáticas
# Configuración de umbrales
STOCK_MINIMO = 10  # Umbral para considerar stock bajo
STOCK_CRITICO = 5  # Umbral para stock crítico


# app_inventario/signals.py
from datetime import timedelta
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Productos, Notificaciones

# Umbrales para alertas de garantía (días antes del vencimiento)
GARANTIA_ALERTAS_DIAS = [30, 7]  # puedes ajustar: 30 días y 7 días antes


@receiver(pre_save, sender=Productos)
def producto_pre_save(sender, instance, **kwargs):
    """
    Detecta cambios de estado antes de guardar y crea notificación de 'mantenimiento'.
    """
    if not instance.pk:
        return  # creación -> no comparar estados

    try:
        old = Productos.objects.get(pk=instance.pk)
    except Productos.DoesNotExist:
        return

    viejo_estado = old.estado.nombre if old.estado else None
    nuevo_estado = instance.estado.nombre if instance.estado else None

    if viejo_estado != nuevo_estado:
        # Evitar duplicados: opcionalmente puedes comprobar notificaciones similares recientes
        Notificaciones.objects.create(
            producto=instance,
            categoria='mantenimiento',
            titulo=f"Cambio de estado: {instance.nro_serie}",
            mensaje=f"El producto {instance.nro_serie} cambió de '{viejo_estado}' a '{nuevo_estado}'.",
            prioridad='media'
        )


@receiver(post_save, sender=Productos)
def producto_post_save(sender, instance, created, **kwargs):
    """
    - Si es creación, puedes crear una notificación informativa de mantenimiento.
    - Si se actualiza, revisar vencimiento de garantía y crear notificaciones 'garantia'
      cuando falten 30 o 7 días (o lo que configures).
    """
    hoy = timezone.now().date()

    # 1) Notificación al crear (opcional)
    if created:
        Notificaciones.objects.create(
            producto=instance,
            categoria='mantenimiento',
            titulo=f"Producto creado: {instance.nro_serie}",
            mensaje=f"Se ha registrado el producto {instance.nro_serie} (modelo: {instance.modelo}).",
            prioridad='baja'
        )
        # no return: también chequeamos garantía si fecha_venc_garantia ya está calculada

    # 2) Alertas de garantía (si existe fecha_venc_garantia)
    venc = getattr(instance, 'fecha_venc_garantia', None)
    if not venc:
        return

    dias_restantes = (venc - hoy).days

    # Para cada umbral configurado, crear notificación si corresponde
    for dias in GARANTIA_ALERTAS_DIAS:
        # Si está dentro del umbral y >= 0 (no crear si ya venció)
        if 0 <= dias_restantes <= dias:
            # Evitar duplicados: buscar notificación reciente con misma categoria y producto y texto parecido
            from django.utils import timezone as dj_tz
            ventana = dj_tz.now() - timedelta(days=14)  # evitar duplicados en 14 días
            existe = Notificaciones.objects.filter(
                producto=instance,
                categoria='garantia',
                titulo__icontains=f"garantía"  # criterio simple; ajustar si quieres más exactitud
            ).filter(fecha_creacion__gte=ventana).exists()

            if not existe:
                # Crear mensaje según días restantes
                if dias_restantes == 0:
                    titulo = f"Vencimiento de garantía hoy: {instance.nro_serie}"
                    mensaje = f"La garantía del equipo {instance.nro_serie} vence hoy ({venc})."
                    prioridad = 'alta'
                else:
                    titulo = f"Vencimiento de garantía en {dias_restantes} días: {instance.nro_serie}"
                    mensaje = f"La garantía del equipo {instance.nro_serie} vence el {venc} (faltan {dias_restantes} días)."
                    prioridad = 'media' if dias_restantes > 7 else 'alta'

                Notificaciones.objects.create(
                    producto=instance,
                    categoria='garantia',
                    titulo=titulo,
                    mensaje=mensaje,
                    prioridad=prioridad,
                    url_accion=f"/productos/{instance.pk}/"  # si tu app tiene esa ruta
                )
            # Si ya existe, no hacemos nada (evita spam)
            # NOTA: No hacemos break: puede haber dos umbrales (30 y 7). 
            # Si quieres crear solamente la notificación del umbral más cercano,
            # añade un break aquí.
