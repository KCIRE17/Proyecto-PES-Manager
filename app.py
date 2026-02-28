from flask import Flask, render_template, jsonify # <--- AQUÍ ESTÁ EL TRUCO
from routes.perfiles import perfiles_bp
from routes.clubes import clubes_bp
from routes.torneos import torneos_bp
from database import load_db

app = Flask(__name__)

# --- REGISTRO DE BLUEPRINTS (Módulos) ---
app.register_blueprint(perfiles_bp, url_prefix='/api/perfiles')
app.register_blueprint(clubes_bp, url_prefix='/api/clubes')
app.register_blueprint(torneos_bp, url_prefix='/api/torneos')

@app.route('/')
def index():
    db = load_db()
    # Pasamos datos básicos al dashboard
    # IMPORTANTE: Cambié 'historial_torneos' a 'historial' para que coincida con torneos.py
    stats = {
        "total_perfiles": len(db.get("perfiles", [])),
        "torneo_activo": db.get("torneo_activo") is not None,
        "total_historial": len(db.get("historial", [])) 
    }
    return render_template('index.html', stats=stats)

# --- RUTAS DE NAVEGACIÓN (Vistas HTML) ---

@app.route('/perfiles')
def vista_perfiles():
    return render_template('perfiles.html')

@app.route('/nuevo-torneo')
def vista_nuevo_torneo():
    return render_template('nuevo_torneo.html')

@app.route('/torneo-activo')
def vista_torneo_activo():
    return render_template('torneo_activo.html')

@app.route('/historial')
def vista_historial():
    return render_template('historial.html')

# --- API PARA EL HISTORIAL ---

@app.route('/api/historial')
def api_historial():
    db = load_db()
    # Devolvemos la lista 'historial'. El [::-1] pone el más reciente primero.
    historial = db.get("historial", [])
    return jsonify(historial[::-1])

if __name__ == '__main__':
    # El servidor se reinicia al guardar cambios
    app.run(debug=True, port=5000)