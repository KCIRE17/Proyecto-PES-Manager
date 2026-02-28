import json
import os

DB_PATH = 'data/database.json'
CLUBS_PATH = 'data/clubes_uefa.json'

def load_db():
    """Carga la base de datos completa."""
    if not os.path.exists(DB_PATH):
        # Si no existe, crea la estructura inicial
        initial_data = {"perfiles": [], "torneo_activo": None, "historial_torneos": []}
        save_db(initial_data)
        return initial_data
        
    with open(DB_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_db(data):
    """Guarda los cambios en el JSON."""
    with open(DB_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def get_clubes():
    """Carga la lista estática de los 36 clubes UEFA."""
    with open(CLUBS_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)["clubes"]

def get_torneo_activo():
    """Devuelve el torneo si existe, o None."""
    db = load_db()
    return db.get("torneo_activo")