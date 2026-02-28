let editandoNombre = null; 

document.addEventListener('DOMContentLoaded', () => {
    cargarPerfiles();
    verificarEstadoTorneo();
});

// 1. CARGAR Y MOSTRAR PERFILES
async function cargarPerfiles() {
    const res = await fetch('/api/perfiles/');
    const perfiles = await res.json();
    
    const grid = document.getElementById('perfiles-grid');
    const countLabel = document.getElementById('player-count');
    
    grid.innerHTML = '';
    countLabel.innerText = perfiles.length;

    perfiles.forEach(p => {
        // Generador de avatar con iniciales si no hay foto
        const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nombre)}&background=0D8ABC&color=fff`;
        const foto = p.imagen_url && p.imagen_url.trim() !== '' ? p.imagen_url : fallbackAvatar;

        grid.innerHTML += `
            <div class="player-card">
                <div class="profile-circle">
                    <img src="${foto}" 
                         class="avatar-img" 
                         referrerpolicy="no-referrer" 
                         onerror="this.onerror=null; this.src='${fallbackAvatar}';">
                </div>
                <h3>${p.nombre}</h3>
                <div class="card-actions">
                    <button class="btn-edit" onclick="prepararEdicion('${p.nombre}', '${p.imagen_url || ''}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="eliminarPerfil('${p.nombre}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
}

// 2. CREAR PERFIL
async function crearPerfil() {
    const nombre = document.getElementById('nombre').value.trim();
    const imagen_url = document.getElementById('imagen_url').value.trim();

    if (!nombre) return alert("El nombre es obligatorio");

    const res = await fetch('/api/perfiles/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, imagen_url })
    });

    if (res.ok) {
        limpiarFormulario();
        cargarPerfiles();
    } else {
        const error = await res.json();
        alert(error.error);
    }
}

// 3. PREPARAR EDICIÓN
function prepararEdicion(nombre, imagen) {
    editandoNombre = nombre;
    document.getElementById('nombre').value = nombre;
    document.getElementById('imagen_url').value = imagen;
    
    const btn = document.getElementById('btn-save');
    btn.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar Perfil';
    btn.classList.add('btn-warning'); 
    btn.onclick = guardarEdicion;
    
    document.getElementById('form-container').scrollIntoView({ behavior: 'smooth' });
}

// 4. GUARDAR CAMBIOS DE EDICIÓN
async function guardarEdicion() {
    const nuevoNombre = document.getElementById('nombre').value.trim();
    const nuevaImagen = document.getElementById('imagen_url').value.trim();

    if (!nuevoNombre) return alert("El nombre no puede estar vacío");

    const res = await fetch('/api/perfiles/editar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nombre_original: editandoNombre,
            nuevo_nombre: nuevoNombre,
            nueva_imagen: nuevaImagen
        })
    });

    if (res.ok) {
        limpiarFormulario();
        cargarPerfiles();
    } else {
        const error = await res.json();
        alert(error.error);
    }
}

// 5. ELIMINAR PERFIL
async function eliminarPerfil(nombre) {
    const confirmacion = confirm(
        `⚠️ ADVERTENCIA CRÍTICA:\n\n` +
        `Estás a punto de eliminar a "${nombre}".\n` +
        `Esto borrará permanentemente sus estadísticas y TODOS los torneos pasados.\n\n` +
        `¿Deseas continuar?`
    );

    if (confirmacion) {
        const res = await fetch(`/api/perfiles/eliminar/${nombre}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            cargarPerfiles();
        }
    }
}

// 6. VERIFICAR ESTADO DEL TORNEO
async function verificarEstadoTorneo() {
    const res = await fetch('/api/torneos/activo');
    const torneo = await res.json();

    if (torneo) {
        document.getElementById('nombre').disabled = true;
        document.getElementById('imagen_url').disabled = true;
        document.getElementById('btn-save').disabled = true;
        
        const msg = document.getElementById('msg-bloqueo');
        if (msg) msg.style.display = 'block';
        
        const style = document.createElement('style');
        style.innerHTML = '.card-actions { display: none !important; }';
        document.head.appendChild(style);
    }
}

// 7. LIMPIAR FORMULARIO
function limpiarFormulario() {
    editandoNombre = null;
    document.getElementById('nombre').value = '';
    document.getElementById('imagen_url').value = '';
    
    const btn = document.getElementById('btn-save');
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Guardar Perfil';
    btn.classList.remove('btn-warning');
    btn.onclick = crearPerfil;
}