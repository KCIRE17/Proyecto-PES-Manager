from flask import Blueprint, jsonify
from database import get_clubes

clubes_bp = Blueprint('clubes', __name__)

@clubes_bp.route('/', methods=['GET'])
def listar_clubes():
    try:
        clubes = get_clubes()
        return jsonify(clubes)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@clubes_bp.route('/<id_club>', methods=['GET'])
def obtener_club(id_club):
    clubes = get_clubes()
    club = next((c for c in clubes if c['id'] == id_club), None)
    if club:
        return jsonify(club)
    return jsonify({"error": "Club no encontrado"}), 404