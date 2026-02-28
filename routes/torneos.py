from flask import Blueprint, jsonify, request
from database import load_db, save_db
import uuid
from datetime import datetime

# Blueprint para la gestión de torneos
torneos_bp = Blueprint('torneos', __name__)

def generar_jornadas(participantes):
    """
    Genera enfrentamientos Round Robin vinculando la imagen_url 
    definida en el perfil del usuario.
    """
    db = load_db()
    # Creamos un mapa de búsqueda: {"Nombre": "URL_Imagen"}
    # Esto asegura que siempre usemos la foto que configuraste en el perfil
    perfiles_map = {p['nombre']: p.get('imagen_url', "") for p in db.get('perfiles', [])}
    
    partidos = []
    n = len(participantes)
    
    for i in range(n):
        for j in range(i + 1, n):
            nombre_l = participantes[i]['perfil']
            nombre_v = participantes[j]['perfil']
            
            # Buscamos la imagen configurada en perfiles
            img_l = perfiles_map.get(nombre_l, "")
            img_v = perfiles_map.get(nombre_v, "")

            partidos.append({
                "local": {
                    "nombre": nombre_l,
                    "imagen": img_l,
                    "club_nombre": participantes[i]['club']['nombre']
                },
                "visita": {
                    "nombre": nombre_v,
                    "imagen": img_v,
                    "club_nombre": participantes[j]['club']['nombre']
                },
                "goles_l": None,
                "goles_v": None,
                "jugado": False,
                "id_partido": str(uuid.uuid4())[:8]
            })
    return partidos

@torneos_bp.route('/crear', methods=['POST'])
def crear_torneo():
    data = request.json
    db = load_db()
    
    if db.get("torneo_activo"):
        return jsonify({"error": "Ya hay un torneo en curso"}), 400

    nuevo_torneo = {
        "id": str(uuid.uuid4()),
        "nombre": data['nombre'],
        "modalidad": data['modalidad'],
        "estado": "grupos",
        "grupos": data['grupos'], 
        "stage": {
            "jornadas": {} 
        }
    }

    # Generar jornadas para cada grupo
    for letra, miembros in data['grupos'].items():
        nuevo_torneo['stage']['jornadas'][letra] = generar_jornadas(miembros)

    db['torneo_activo'] = nuevo_torneo
    save_db(db)
    return jsonify({"message": "Torneo creado con éxito"}), 201

@torneos_bp.route('/activo', methods=['GET'])
def get_activo():
    db = load_db()
    torneo = db.get("torneo_activo")
    
    if torneo:
        print("\n--- [DEBUG] TORNEO ACTIVO DETECTADO ---")
        jornadas = torneo.get('stage', {}).get('jornadas', {})
        for grupo, lista_partidos in jornadas.items():
            print(f"Grupo {grupo}: {len(lista_partidos)} partidos generados.")
            for p in lista_partidos:
                # Log para verificar que la URL de la imagen se está enviando
                print(f"  > {p['local']['nombre']} (Img: {p['local']['imagen'][:30]}...) VS {p['visita']['nombre']}")
        print("---------------------------------------\n")
    
    return jsonify(torneo)

@torneos_bp.route('/actualizar_marcador', methods=['POST'])
def actualizar_marcador():
    data = request.json
    db = load_db()
    torneo = db.get("torneo_activo")
    
    if not torneo:
        return jsonify({"error": "No hay torneo activo"}), 404

    try:
        grupo = data['grupo']
        idx = int(data['index'])
        partidos_grupo = torneo['stage']['jornadas'].get(grupo)
        
        if not partidos_grupo or idx >= len(partidos_grupo):
            return jsonify({"error": "Partido no encontrado"}), 404

        partido = partidos_grupo[idx]
        partido['goles_l'] = int(data['goles_l'])
        partido['goles_v'] = int(data['goles_v'])
        partido['jugado'] = True

        save_db(db)
        return jsonify({"message": "Marcador actualizado", "partido": partido}), 200
    except Exception as e:
        return jsonify({"error": f"Error: {str(e)}"}), 400

@torneos_bp.route('/finalizar', methods=['POST'])
def finalizar_torneo():
    db = load_db()
    torneo = db.get("torneo_activo")
    
    if not torneo:
        return jsonify({"error": "No hay torneo activo"}), 404
    
    # 1. VALORES POR DEFECTO (Para evitar el "Sin Ganador")
    ganador_final = {"nombre": "Desconocido", "imagen": "", "club_nombre": ""}
    subcampeon_nombre = "Desconocido"
    foto_subcampeon = ""

    try:
        # 2. BUSCAR LA FINAL EN LA ESTRUCTURA CORRECTA
        # Entramos a stage -> eliminatorias
        eliminatorias = torneo.get('stage', {}).get('eliminatorias', {})
        
        # Buscamos la llave 'Definición' (que es tu Gran Final)
        fase_final = eliminatorias.get('Definición', [])
        
        if fase_final and len(fase_final) > 0:
            partido = fase_final[0] # Es el único partido de la Definición
            
            gl = int(partido.get('goles_l', 0))
            gv = int(partido.get('goles_v', 0))
            
            # Determinamos quién ganó la final
            if gl > gv:
                ganador_final = partido['local']
                subcampeon_nombre = partido['visita']['nombre']
                foto_subcampeon = partido['visita']['imagen']
            else:
                ganador_final = partido['visita']
                subcampeon_nombre = partido['local']['nombre']
                foto_subcampeon = partido['local']['imagen']
                
    except Exception as e:
        print(f"DEBUG ERROR: No se pudo extraer el ganador: {e}")

    # 3. CALCULAR GOLES TOTALES DEL TORNEO
    goles_acumulados = 0
    # Sumar goles de grupos
    for grupo in torneo.get('grupos', {}).values():
        for p in grupo:
            goles_acumulados += (int(p.get('goles_l', 0)) + int(p.get('goles_v', 0)))
    # Sumar goles de eliminatorias
    for fase in eliminatorias.values():
        for p in fase:
            goles_acumulados += (int(p.get('goles_l', 0)) + int(p.get('goles_v', 0)))

    # 4. PREPARAR EL REGISTRO
    ahora = datetime.now()
    meses = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"]

    nuevo_registro = {
        "id": torneo['id'],
        "nombre": torneo['nombre'],
        "ganador": ganador_final['nombre'],
        "foto_1": ganador_final.get('imagen', ""),
        "equipo_1": ganador_final.get('club_nombre', ''),
        "subcampeon": subcampeon_nombre,
        "foto_2": foto_subcampeon,
        "participantes": 6, 
        "dia": ahora.strftime("%d"),
        "mes": meses[ahora.month - 1],
        "goles_totales": goles_acumulados
    }

    if "historial" not in db:
        db["historial"] = []
    
    db["historial"].append(nuevo_registro)
    db["torneo_activo"] = None # IMPORTANTE: Cerramos el torneo
    
    save_db(db)
    return jsonify({"message": "Torneo guardado", "redirect": "/historial"})