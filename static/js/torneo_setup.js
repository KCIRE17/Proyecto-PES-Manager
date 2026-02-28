let modalidadActual = 0;
let clubesList = [];
let asignaciones = {}; // { "NombreJugador": { id, nombre, img } }
let jugadorParaClub = null;

document.addEventListener('DOMContentLoaded', async () => {
    const res = await fetch('/api/clubes/');
    clubesList = await res.json();
    cargarPerfilesDisponibles();
    
    // Cerrar modal al hacer clic fuera de él
    window.onclick = (event) => {
        const modal = document.getElementById('modal-club');
        if (event.target == modal) cerrarModal();
    }
});

// 1. CARGAR PERFILES DISPONIBLES
async function cargarPerfilesDisponibles() {
    const res = await fetch('/api/perfiles/');
    const perfiles = await res.json();
    const pool = document.getElementById('pool-perfiles');
    pool.innerHTML = '';
    
    perfiles.forEach(p => {
        const div = document.createElement('div');
        div.className = 'player-item';
        div.id = `player-${p.nombre}`;
        div.draggable = true;
        
        div.innerHTML = `
            <span><i class="fas fa-grip-vertical" style="margin-right:10px; opacity:0.5"></i> ${p.nombre}</span>
            <button class="club-btn-trigger" id="btn-club-${p.nombre}" onclick="abrirModalClub('${p.nombre}')">
                Elegir Club
            </button>
        `;

        // Eventos Drag
        div.ondragstart = (ev) => {
            ev.dataTransfer.setData("text", ev.target.id);
            ev.target.style.opacity = "0.5";
        };
        div.ondragend = (ev) => ev.target.style.opacity = "1";
        
        pool.appendChild(div);
    });
}

// 2. CONFIGURAR MODALIDAD Y GRUPOS
function setModalidad(num) {
    modalidadActual = num;
    
    // UI: Activar botón
    document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active'); // Usamos currentTarget por si hacen clic en el texto
    
    document.getElementById('step-2').style.display = 'block';
    
    const container = document.getElementById('grupos-container');
    container.innerHTML = '';
    
    // Lógica de grupos: 16 jug -> 4 grupos, resto -> 2 grupos
    const numGrupos = (num === 16) ? 4 : 2;
    const letras = ['A', 'B', 'C', 'D'];

    for(let i=0; i < numGrupos; i++) {
        container.innerHTML += `
            <div class="group-box">
                <h3>Grupo ${letras[i]}</h3>
                <div id="grupo-${letras[i]}" class="drop-zone" 
                     ondrop="drop(event)" 
                     ondragover="allowDrop(event)">
                </div>
            </div>
        `;
    }
}

// 3. LÓGICA DRAG & DROP
function allowDrop(ev) { 
    ev.preventDefault(); 
}

function drop(ev) {
    ev.preventDefault();
    const data = ev.dataTransfer.getData("text");
    const playerEl = document.getElementById(data);
    const targetZone = ev.target.closest('.drop-zone');
    
    if (targetZone) {
        // Calcular límite por grupo
        const numGrupos = (modalidadActual === 16) ? 4 : 2;
        const limite = modalidadActual / numGrupos;
        
        if (targetZone.id === 'pool-perfiles' || targetZone.children.length < limite) {
            targetZone.appendChild(playerEl);
        } else {
            alert(`El Grupo ${targetZone.id.split('-')[1]} ya está lleno (${limite} jugadores)`);
        }
    }
}

// 4. GESTIÓN DE CLUBES (MODAL)
function abrirModalClub(nombre) {
    jugadorParaClub = nombre;
    document.getElementById('player-target-name').innerText = nombre;
    document.getElementById('modal-club').style.display = 'block';
    document.getElementById('search-club').value = ''; // Limpiar búsqueda
    renderizarClubes();
}

function renderizarClubes(filtro = '') {
    const container = document.getElementById('lista-clubes');
    container.innerHTML = '';
    
    // Obtener IDs de clubes ya elegidos para deshabilitarlos
    const ocupados = Object.values(asignaciones).map(a => a.id);

    const filtrados = clubesList.filter(c => 
        c.nombre.toLowerCase().includes(filtro.toLowerCase())
    );

    filtrados.forEach(club => {
        const isSelected = ocupados.includes(club.id);
        const div = document.createElement('div');
        div.className = `club-option ${isSelected ? 'disabled' : ''}`;
        
        div.innerHTML = `
            <img src="${club.imagen}" onerror="this.src='/static/img/default-club.png'">
            <span>${club.nombre}</span>
        `;
        
        if(!isSelected) {
            div.onclick = () => asignarClub(club);
        }
        container.appendChild(div);
    });
}

function asignarClub(club) {
    asignaciones[jugadorParaClub] = { id: club.id, nombre: club.nombre, img: club.imagen };
    const btn = document.getElementById(`btn-club-${jugadorParaClub}`);
    
    // Actualizar botón en la lista
    btn.innerHTML = `<i class="fas fa-check"></i> ${club.nombre}`;
    btn.classList.add('assigned');
    
    cerrarModal();
}

function cerrarModal() { 
    document.getElementById('modal-club').style.display = 'none'; 
}

function filtrarClubes() { 
    renderizarClubes(document.getElementById('search-club').value); 
}

async function sorteoAleatorio() {
    if (modalidadActual === 0) return alert("Primero selecciona una modalidad");
    
    // 1. Obtener todos los perfiles y mezclarlos
    const res = await fetch('/api/perfiles/');
    let perfiles = await res.json();
    perfiles = perfiles.sort(() => Math.random() - 0.5).slice(0, modalidadActual);

    // 2. Mezclar clubes disponibles
    let clubesDisponibles = [...clubesList].sort(() => Math.random() - 0.5);

    // 3. Limpiar zonas actuales
    const zonas = document.querySelectorAll('#grupos-container .drop-zone');
    zonas.forEach(z => z.innerHTML = '');
    asignaciones = {};

    // 4. Repartir
    const numGrupos = (modalidadActual === 16) ? 4 : 2;
    const tamanoGrupo = modalidadActual / numGrupos;
    const letras = ['A', 'B', 'C', 'D'];

    perfiles.forEach((p, index) => {
        const letraGrupo = letras[Math.floor(index / tamanoGrupo)];
        const zone = document.getElementById(`grupo-${letraGrupo}`);
        const club = clubesDisponibles[index];

        // Registrar asignación
        asignaciones[p.nombre] = { id: club.id, nombre: club.nombre, img: club.imagen };

        // Crear elemento visual
        const div = document.createElement('div');
        div.className = 'player-item';
        div.id = `player-${p.nombre}`;
        div.innerHTML = `<span>${p.nombre}</span><button class="club-btn-trigger assigned">${club.nombre}</button>`;
        zone.appendChild(div);
    });
}

// 5. FINALIZAR Y CREAR TORNEO
async function iniciarTorneo() {
    const nombreTorneo = document.getElementById('tournament-name').value.trim();
    if(!nombreTorneo) return alert("⚠️ Ponle un nombre a la competición");
    if(modalidadActual === 0) return alert("⚠️ Selecciona una modalidad (6, 8, 10 o 16 jugadores)");

    const grupos = {};
    const zonas = document.querySelectorAll('#grupos-container .drop-zone');
    let totalAsignados = 0;
    let errorClub = false;

    zonas.forEach(z => {
        const letra = z.id.split('-')[1];
        grupos[letra] = [];
        
        z.querySelectorAll('.player-item').forEach(p => {
            const pName = p.id.replace('player-', '');
            if(!asignaciones[pName]) {
                errorClub = pName;
                return;
            }
            grupos[letra].push({ 
                perfil: pName, 
                club: asignaciones[pName] 
            });
            totalAsignados++;
        });
    });

    if(errorClub) return alert(`⚠️ Falta asignar un club para ${errorClub}`);
    if(totalAsignados !== modalidadActual) {
        return alert(`⚠️ Faltan jugadores por asignar. Debes completar los grupos (${totalAsignados}/${modalidadActual})`);
    }

    // Enviar al servidor
    try {
        const res = await fetch('/api/torneos/crear', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                nombre: nombreTorneo, 
                modalidad: modalidadActual, 
                grupos: grupos 
            })
        });

        if(res.ok) {
            window.location.href = '/torneo-activo';
        } else {
            const data = await res.json();
            alert("Error: " + data.error);
        }
    } catch (e) {
        alert("Error de conexión con el servidor");
    }
}