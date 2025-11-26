# signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Productos, CodigoQR

@receiver(post_save, sender=Productos)
def crear_qr_producto(sender, instance, created, **kwargs):
    if created:
        # Crear la instancia QR asociada
        qr = CodigoQR.objects.create(producto=instance)
        qr.generar_qr()
        qr.save()
