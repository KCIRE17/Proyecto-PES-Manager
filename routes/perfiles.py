from flask import Blueprint, request, jsonify
from database import load_db, save_db

perfiles_bp = Blueprint('perfiles', __name__)

@perfiles_bp.route('/', methods=['GET'])
def get_perfiles():
    db = load_db()
    return jsonify(db.get("perfiles", []))

@perfiles_bp.route('/crear', methods=['POST'])
def crear_perfil():
    db = load_db()
    if len(db['perfiles']) >= 16:
        return jsonify({"error": "Límite de 16 perfiles alcanzado"}), 400
    
    nuevo = request.json
    # Inicializar historial vacío para nuevos perfiles
    nuevo['historial_partidos'] = []
    db['perfiles'].append(nuevo)
    save_db(db)
    return jsonify({"message": "Creado"}), 201

@perfiles_bp.route('/editar', methods=['PUT'])
def editar_perfil():
    db = load_db()
    datos = request.json # { nombre_original, nuevo_nombre, nueva_imagen }
    
    for p in db['perfiles']:
        if p['nombre'] == datos['nombre_original']:
            p['nombre'] = datos['nuevo_nombre']
            p['imagen_url'] = datos['nueva_imagen']
            save_db(db)
            return jsonify({"message": "Perfil actualizado"}), 200
            
    return jsonify({"error": "Perfil no encontrado"}), 404

@perfiles_bp.route('/eliminar/<nombre>', methods=['DELETE'])
def eliminar_perfil(nombre):
    db = load_db()
    
    # 1. Borrar el perfil
    db['perfiles'] = [p for p in db['perfiles'] if p['nombre'] != nombre]
    
    # 2. Borrado en cascada: Eliminar torneos donde participó
    # Esto cumple tu regla de integridad
    original_count = len(db['historial_torneos'])
    db['historial_torneos'] = [
        t for t in db['historial_torneos'] 
        if not any(p['perfil_id'] == nombre for p in t['participantes'])
    ]
    
    save_db(db)
    return jsonify({
        "message": f"Perfil eliminado. Se borraron {original_count - len(db['historial_torneos'])} torneos asociados."
    }), 200