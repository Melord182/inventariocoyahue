# app_inventario/management/commands/check_garantias.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from app_inventario.models import Productos, Notificaciones

GARANTIA_ALERTAS_DIAS = [30, 7]

class Command(BaseCommand):
    help = "Revisa productos y crea notificaciones de garantía próximas a vencer."

    def handle(self, *args, **options):
        hoy = timezone.now().date()
        productos = Productos.objects.exclude(fecha_venc_garantia__isnull=True)
        created = 0

        for p in productos:
            dias_restantes = (p.fecha_venc_garantia - hoy).days
            if dias_restantes < 0:
                continue  # ya vencida; si quieres notificar vencidas, añade lógica
            for dias in GARANTIA_ALERTAS_DIAS:
                if dias_restantes <= dias:
                    # Chequeo duplicados similar al de signals
                    ventana = timezone.now() - timedelta(days=14)
                    existe = Notificaciones.objects.filter(
                        producto=p,
                        categoria='garantia',
                        titulo__icontains=p.nro_serie,
                        fecha_creacion__gte=ventana
                    ).exists()
                    if not existe:
                        titulo = (f"Vencimiento de garantía en {dias_restantes} días: {p.nro_serie}"
                                  if dias_restantes > 0 else f"Vencimiento de garantía hoy: {p.nro_serie}")
                        prioridad = 'alta' if dias_restantes <= 7 else 'media'
                        Notificaciones.objects.create(
                            producto=p,
                            categoria='garantia',
                            titulo=titulo,
                            mensaje=f"La garantía del equipo {p.nro_serie} vence el {p.fecha_venc_garantia} (faltan {dias_restantes} días).",
                            prioridad=prioridad,
                            url_accion=f"/productos/{p.pk}/"
                        )
                        created += 1
                    break  # si ya creó para este producto, pasar al siguiente producto

        self.stdout.write(self.style.SUCCESS(f"Comprobación finalizada. Notificaciones creadas: {created}"))
