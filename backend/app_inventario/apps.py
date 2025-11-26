from django.apps import AppConfig


class InventarioConfig(AppConfig):  
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'app_inventario'
    verbose_name = 'Inventario'

    def ready(self):
        # importa las señales una sola vez
        import app_inventario.signals
