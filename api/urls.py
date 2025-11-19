from django.urls import path
from . import views

urlpatterns = [
    # 1.1: Visualizar el índice 623
    path('image/index/<int:index_id>/', views.get_image_by_index, name='get_image_by_index'),
    
    # 1.2: 6 imágenes aleatorias (MRI y Máscara separadas)
    path('images/random/<int:count>/', views.get_random_images, name='get_random_images'),
    
    # 1.3: 12 imágenes aleatorias CON tumor (para superponer)
    path('images/random_tumor/<int:count>/', views.get_random_tumor_images, name='get_random_tumor_images'),
]