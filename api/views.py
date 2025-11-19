from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import pymongo
import certifi  # <--- IMPORTANTE: Agregado para evitar errores SSL en Render

# --- Conexión a MongoDB Atlas ---
# Se ejecuta una sola vez al iniciar el servidor (fuera de las funciones)
try:
    # Usamos certifi para asegurar que encuentre los certificados SSL correctos
    client = pymongo.MongoClient(settings.MONGO_URI, tlsCAFile=certifi.where())
    db = client[settings.MONGO_DBNAME]
    collection = db[settings.COLLECTION_NAME]
    print("✅ Conexión a MongoDB Atlas exitosa desde Django.")
except Exception as e:
    print(f"❌ Error fatal al conectar a MongoDB: {e}")
    collection = None

# --- Helper ---
def mongo_document_to_json(doc):
    """Convierte ObjectId a string para que sea JSON serializable"""
    if doc and '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc

# --- Endpoints ---

@api_view(['GET'])
def get_image_by_index(request, index_id):
    """
    Endpoint 1.1: Obtiene datos por índice (ej: 623).
    Devuelve MRI, Máscara y las predicciones pre-calculadas.
    """
    if collection is None:
        return Response({"error": "Error de conexión con la base de datos"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    try:
        # Buscamos por 'original_index' que guardamos como entero
        document = collection.find_one({"original_index": int(index_id)})
        
        if document:
            return Response(mongo_document_to_json(document))
        else:
            return Response({"error": f"No se encontró ningún documento con el índice {index_id}"}, status=status.HTTP_404_NOT_FOUND)
            
    except ValueError:
         return Response({"error": "El índice debe ser un número entero"}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_random_images(request, count):
    """
    Endpoint 1.2: Obtiene 'count' imágenes aleatorias.
    """
    if collection is None:
        return Response({"error": "Error de conexión con la base de datos"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    try:
        pipeline = [
            { "$sample": { "size": int(count) } }
        ]
        documents = list(collection.aggregate(pipeline))
        
        if documents:
            return Response([mongo_document_to_json(doc) for doc in documents])
        else:
            return Response({"error": "No se encontraron documentos"}, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_random_tumor_images(request, count):
    """
    Endpoint 1.3: Obtiene 'count' imágenes aleatorias CON tumor.
    """
    if collection is None:
        return Response({"error": "Error de conexión con la base de datos"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    try:
        pipeline = [
            { "$match": { "has_mask": 1 } }, # Solo las que tienen tumor
            { "$sample": { "size": int(count) } }
        ]
        documents = list(collection.aggregate(pipeline))
        
        if documents:
            return Response([mongo_document_to_json(doc) for doc in documents])
        else:
            return Response({"error": "No se encontraron documentos con tumores"}, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)