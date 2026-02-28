let torneo = null;
let partidoSeleccionado = null; // Para partidos de grupos
let partidoEliminatoriaActual = null; // ID de la llave (C1, C2, S1, S2, F, T)

document.addEventListener('DOMContentLoaded', cargarDatosTorneo);

/**
 * 1. CARGA Y DATOS
 */
async function cargarDatosTorneo() {
    try {
        const res = await fetch('/api/torneos/activo');
        torneo = await res.json();
        
        if (!torneo) {
            window.location.href = '/nuevo-torneo';
            return;
        }

        // Inicializar objeto de playoffs en el cliente si no viene del servidor
        if (!torneo.playoffs) {
            torneo.playoffs = { resultados: {} };
        }

        document.getElementById('tourney-title').innerText = torneo.nombre;
        document.getElementById('tourney-mode').innerText = `${torneo.modalidad} JUGADORES`;
        
        renderizarGrupos();
        renderizarPichichi();
        verificarProgresoEliminatorias();

    } catch (error) {
        console.error("Error cargando el torneo:", error);
    }
}

/**
 * 2. RENDERIZADO DE GRUPOS
 */
function renderizarGrupos() {
    const layout = document.getElementById('grupos-layout');
    if (!layout) return;
    layout.innerHTML = '';

    Object.keys(torneo.grupos).forEach(letra => {
        const participantes = torneo.grupos[letra];
        const partidos = torneo.stage.jornadas[letra] || [];
        const tabla = calcularTabla(participantes, partidos);

        let html = `
            <div class="group-container">
                <div class="group-header-title"><i class="fas fa-users"></i> GRUPO ${letra}</div>
                <table class="classic-table">
                    <thead>
                        <tr>
                            <th>POS</th>
                            <th style="text-align:left;">JUGADOR</th>
                            <th>PJ</th><th>GF</th><th>GC</th><th>DG</th><th>PTS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tabla.map((p, i) => `
                            <tr>
                                <td>${i+1}</td>
                                <td style="text-align:left;">
                                    <div class="cell-perfil">
                                        ${obtenerAvatarHtml(p.perfil, p.imagen_perfil)}
                                        <div>
                                            <div style="font-weight:700; color:white;">${p.perfil}</div>
                                            <div style="font-size:0.75rem; color:var(--text-muted);">${p.club.nombre}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>${p.pj}</td><td>${p.gf}</td><td>${p.gc}</td>
                                <td style="color:${p.dg > 0 ? '#4ade80' : p.dg < 0 ? '#f87171' : 'inherit'}">${p.dg > 0 ? '+'+p.dg : p.dg}</td>
                                <td><span class="pts-badge">${p.pts}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="match-list">
                    <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:10px; font-weight:700;">CALENDARIO</p>
                    ${partidos.map((m, idx) => `
                        <div class="match-card" onclick="abrirMarcador('${letra}', ${idx})">
                            <div class="cell-perfil">
                                ${obtenerAvatarHtml(m.local.nombre, m.local.imagen)}
                                <span style="font-size:0.85rem;">${m.local.nombre}</span>
                            </div>
                            <div class="score-display">${m.jugado ? `${m.goles_l} - ${m.goles_v}` : 'VS'}</div>
                            <div class="cell-perfil" style="flex-direction:row-reverse;">
                                ${obtenerAvatarHtml(m.visita.nombre, m.visita.imagen)}
                                <span style="font-size:0.85rem;">${m.visita.nombre}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        layout.innerHTML += html;
    });
}

/**
 * 3. LÓGICA DE ELIMINATORIAS (PLAYOFFS)
 */
function generarCuadroEliminatorio() {
    const bracketLayout = document.getElementById('bracket-layout');
    if (!bracketLayout) return;

    let grupoA = obtenerRankingGrupo('A');
    let grupoB = obtenerRankingGrupo('B');
    const res = torneo.playoffs.resultados || {};

    const obtenerAvance = (matchId, tipo) => {
        const match = res[matchId];
        if (!match) return { perfil: `${tipo === 'ganador' ? 'Ganador' : 'Perdedor'} ${matchId}`, imagen_perfil: "" };
        return { 
            perfil: tipo === 'ganador' ? match.ganador : match.perdedor, 
            imagen_perfil: tipo === 'ganador' ? match.ganador_img : match.perdedor_img 
        };
    };

    const winC1 = obtenerAvance('C1', 'ganador');
    const winC2 = obtenerAvance('C2', 'ganador');
    const winS1 = obtenerAvance('S1', 'ganador');
    const winS2 = obtenerAvance('S2', 'ganador');
    const lossS1 = obtenerAvance('S1', 'perdedor');
    const lossS2 = obtenerAvance('S2', 'perdedor');

    bracketLayout.innerHTML = `
        <div class="bracket-wrapper">
            <div class="bracket-column">
                <h4 class="column-title">REPECHAJE</h4>
                ${renderMatchBracket(grupoA[1], grupoB[2], "C1", 'C1')}
                ${renderMatchBracket(grupoB[1], grupoA[2], "C2", 'C2')}
            </div>
            <div class="bracket-column">
                <h4 class="column-title">SEMIFINALES</h4>
                ${renderMatchBracket(grupoB[0], winC1, "S1", 'S1')}
                ${renderMatchBracket(grupoA[0], winC2, "S2", 'S2')}
            </div>
            <div class="bracket-column">
                <h4 class="column-title" style="color:var(--accent-gold);">DEFINICIÓN</h4>
                ${renderMatchBracket(winS1, winS2, "GRAN FINAL", 'F')}
                ${renderMatchBracket(lossS1, lossS2, "3ER PUESTO", 'T')}
            </div>
        </div>
    `;
}

function renderMatchBracket(p1, p2, label, matchId) {
    const yaJugado = torneo.playoffs?.resultados?.[matchId];
    const esPlaceholder = p1.perfil.includes("Ganador") || p1.perfil.includes("Perdedor") || 
                         p2.perfil.includes("Ganador") || p2.perfil.includes("Perdedor");

    return `
        <div class="match-bracket-card">
            <div class="bracket-label">${label}</div>
            <div class="bracket-team">
                ${obtenerAvatarHtml(p1.perfil, p1.imagen_perfil)}
                <span>${p1.perfil}</span>
                <b style="margin-left:auto;">${yaJugado ? yaJugado.goles_l : ''}</b>
            </div>
            <div class="bracket-vs">VS</div>
            <div class="bracket-team">
                ${obtenerAvatarHtml(p2.perfil, p2.imagen_perfil)}
                <span>${p2.perfil}</span>
                <b style="margin-left:auto;">${yaJugado ? yaJugado.goles_v : ''}</b>
            </div>
            <button class="btn-play-bracket" 
                ${esPlaceholder ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} 
                onclick="abrirModalEliminatoria('${matchId}', '${p1.perfil}', '${p2.perfil}', '${p1.imagen_perfil}', '${p2.imagen_perfil}')">
                ${yaJugado ? 'EDITAR' : 'JUGAR'}
            </button>
        </div>
    `;
}

/**
 * 4. GESTIÓN DEL MODAL Y GUARDADO
 */
function abrirMarcador(grupo, index) {
    const partido = torneo.stage.jornadas[grupo][index];
    partidoSeleccionado = { grupo, index };
    partidoEliminatoriaActual = null;
    
    document.getElementById('name-l').innerText = partido.local.nombre;
    document.getElementById('name-v').innerText = partido.visita.nombre;
    document.getElementById('logo-l').innerHTML = obtenerAvatarHtml(partido.local.nombre, partido.local.imagen, "foto-modal");
    document.getElementById('logo-v').innerHTML = obtenerAvatarHtml(partido.visita.nombre, partido.visita.imagen, "foto-modal");
    document.getElementById('score-l').value = partido.jugado ? partido.goles_l : "";
    document.getElementById('score-v').value = partido.jugado ? partido.goles_v : "";
    document.getElementById('modal-marcador').style.display = 'flex';
}

function abrirModalEliminatoria(matchId, nameL, nameV, imgL, imgV) {
    partidoEliminatoriaActual = matchId;
    partidoSeleccionado = null;
    
    document.getElementById('name-l').innerText = nameL;
    document.getElementById('name-v').innerText = nameV;
    document.getElementById('logo-l').innerHTML = obtenerAvatarHtml(nameL, imgL, "foto-modal");
    document.getElementById('logo-v').innerHTML = obtenerAvatarHtml(nameV, imgV, "foto-modal");
    
    const yaJugado = torneo.playoffs.resultados[matchId];
    document.getElementById('score-l').value = yaJugado ? yaJugado.goles_l : "";
    document.getElementById('score-v').value = yaJugado ? yaJugado.goles_v : "";
    
    document.getElementById('modal-marcador').style.display = 'flex';
}

async function guardarMarcador() {
    const gl = document.getElementById('score-l').value;
    const gv = document.getElementById('score-v').value;
    if(gl === "" || gv === "") return alert("Ingresa ambos marcadores");

    const golesL = parseInt(gl);
    const golesV = parseInt(gv);

    if (partidoEliminatoriaActual) {
        if (golesL === golesV) return alert("En eliminatorias debe haber un ganador.");
        
        const nameL = document.getElementById('name-l').innerText;
        const nameV = document.getElementById('name-v').innerText;
        const imgL = document.getElementById('logo-l').querySelector('img')?.src || "";
        const imgV = document.getElementById('logo-v').querySelector('img')?.src || "";

        const ganadorEsLocal = golesL > golesV;

        torneo.playoffs.resultados[partidoEliminatoriaActual] = {
            goles_l: golesL, goles_v: golesV,
            local: nameL, visita: nameV,
            local_img: imgL, visita_img: imgV,
            ganador: ganadorEsLocal ? nameL : nameV,
            ganador_img: ganadorEsLocal ? imgL : imgV,
            perdedor: ganadorEsLocal ? nameV : nameL,
            perdedor_img: ganadorEsLocal ? imgV : imgL
        };
        
        renderizarPichichi();
        
        if (partidoEliminatoriaActual === 'F') {
            mostrarCelebracionCampeon(ganadorEsLocal ? nameL : nameV);
        }

        cerrarModal();
        generarCuadroEliminatorio();
        return;
    }

    try {
        const res = await fetch('/api/torneos/actualizar_marcador', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grupo: partidoSeleccionado.grupo,
                index: partidoSeleccionado.index,
                goles_l: golesL,
                goles_v: golesV
            })
        });
        if (res.ok) { cerrarModal(); await cargarDatosTorneo(); }
    } catch (e) { alert("Error al guardar."); }
}

/**
 * 5. CÁLCULOS Y ESTADÍSTICAS
 */
function mostrarCelebracionCampeon(nombre) {
    let datosCampeon = null;
    Object.values(torneo.grupos).forEach(grupo => {
        const encontrado = grupo.find(p => p.perfil === nombre);
        if (encontrado) datosCampeon = encontrado;
    });

    if (!datosCampeon) return;

    const contenedor = document.getElementById('campeon-info');
    contenedor.innerHTML = `
        <div style="margin: 20px 0;">
            ${obtenerAvatarHtml(datosCampeon.perfil, datosCampeon.imagen_perfil, "foto-modal")}
        </div>
        <h2 style="color: white; font-size: 2.2rem; margin-bottom: 5px;">${datosCampeon.perfil}</h2>
        <p style="color: var(--accent-gold); font-size: 1.3rem; font-weight: bold; margin-bottom: 20px;">
            ${datosCampeon.club.nombre}
        </p>
        <div style="background: rgba(212, 175, 55, 0.1); padding: 20px; border-radius: 15px; border: 1px solid var(--accent-gold);">
            <p style="color: white; font-size: 1.1rem;">¡Felicidades por ganar la <b>${torneo.nombre}</b>!</p>
        </div>
    `;

    document.getElementById('modal-campeon').style.display = 'flex';
    dispararConfeti();
}

function dispararConfeti() {
    if (typeof confetti !== 'function') return;
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: 0.1, y: 0.7 } });
        confetti({ ...defaults, particleCount, origin: { x: 0.9, y: 0.7 } });
    }, 250);
}

function cerrarModalCampeon() {
    fetch('/api/torneos/finalizar', { // Ruta correcta según tu prefix
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(res => res.json())
    .then(data => {
        // Redirigir al historial para ver la placa de honor
        window.location.href = '/historial';
    })
    .catch(err => console.error("Error al finalizar:", err));
}

function renderizarPichichi() {
    const tbody = document.getElementById('pichichi-body');
    if (!tbody) return;
    let goleadores = {};

    Object.values(torneo.stage.jornadas).forEach(grupo => {
        grupo.forEach(m => {
            if (!m.jugado) return;
            goleadores[m.local.nombre] = (goleadores[m.local.nombre] || 0) + m.goles_l;
            goleadores[m.visita.nombre] = (goleadores[m.visita.nombre] || 0) + m.goles_v;
        });
    });

    Object.values(torneo.playoffs.resultados).forEach(r => {
        goleadores[r.local] = (goleadores[r.local] || 0) + r.goles_l;
        goleadores[r.visita] = (goleadores[r.visita] || 0) + r.goles_v;
    });

    const lista = Object.entries(goleadores).filter(g => g[1] > 0).sort((a, b) => b[1] - a[1]);
    tbody.innerHTML = lista.map((g, i) => `
        <tr>
            <td>${i+1}</td>
            <td style="text-align:left; color:white; font-weight:700;">${g[0]}</td>
            <td style="font-weight:900; color:var(--accent-gold);">${g[1]}</td>
        </tr>`).join('') || '<tr><td colspan="3">Sin goles</td></tr>';
}

function calcularTabla(miembros, partidos) {
    let stats = miembros.map(m => {
        const partidoConImagen = partidos.find(p => 
            (p.local.nombre === m.perfil && p.local.imagen) || 
            (p.visita.nombre === m.perfil && p.visita.imagen)
        );

        let urlImagen = "";
        if (partidoConImagen) {
            urlImagen = partidoConImagen.local.nombre === m.perfil 
                ? partidoConImagen.local.imagen : partidoConImagen.visita.imagen;
        }

        return {
            perfil: m.perfil, club: m.club,
            imagen_perfil: urlImagen, pj: 0, pts: 0, gf: 0, gc: 0, dg: 0
        };
    });

    partidos.forEach(m => {
        if (!m.jugado) return;
        let l = stats.find(s => s.perfil === m.local.nombre);
        let v = stats.find(s => s.perfil === m.visita.nombre);
        if (l && v) {
            l.pj++; v.pj++;
            l.gf += m.goles_l; l.gc += m.goles_v;
            v.gf += m.goles_v; v.gc += m.goles_l;
            if (m.goles_l > m.goles_v) l.pts += 3;
            else if (m.goles_l < m.goles_v) v.pts += 3;
            else { l.pts += 1; v.pts += 1; }
        }
    });

    stats.forEach(s => s.dg = s.gf - s.gc);
    return stats.sort((a, b) => (b.pts - a.pts) || (b.dg - a.dg) || (b.gf - a.gf));
}

function obtenerRankingGrupo(letra) {
    return calcularTabla(torneo.grupos[letra], torneo.stage.jornadas[letra] || []);
}

/**
 * 6. INTERFAZ Y NAVEGACIÓN
 */
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick');
        if (onclickAttr) btn.classList.toggle('active', onclickAttr.includes(tabId));
    });
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    const target = document.getElementById(`tab-${tabId}`);
    if (target) {
        target.style.display = 'block';
        if(tabId === 'eliminatorias') generarCuadroEliminatorio();
    }
}

function obtenerAvatarHtml(nombre, urlImagen, claseExtra = "perfil-avatar") {
    if (urlImagen && urlImagen.trim() !== "" && urlImagen !== "undefined") {
        return `<img src="${urlImagen}" class="${claseExtra}" alt="${nombre}" onerror="this.outerHTML='<div class=\\'avatar-fallback ${claseExtra}\\'>${nombre ? nombre.charAt(0).toUpperCase() : '?'}</div>'">`;
    }
    const inicial = nombre ? nombre.charAt(0).toUpperCase() : "?";
    return `<div class="avatar-fallback ${claseExtra}">${inicial}</div>`;
}

function mostrarCampeon(jugador) {
    const modal = document.getElementById('modal-campeon');
    const info = document.getElementById('campeon-info');
    
    // Inyectamos la foto y el nombre dentro del modal
    info.innerHTML = `
        <img src="${jugador.foto || '/static/img/default.png'}" alt="Campeón">
        <h2 style="color: white; font-size: 2.5rem;">${jugador.nombre}</h2>
        <p style="color: #aaa; font-size: 1.2rem;">${jugador.equipo || ''}</p>
    `;
    
    modal.style.display = 'flex'; // Usamos flex para centrar
}



function cerrarModal() { document.getElementById('modal-marcador').style.display = 'none'; }

function verificarProgresoEliminatorias() {
    const todosJugados = Object.values(torneo.stage.jornadas).every(g => g.every(p => p.jugado));
    const btn = document.getElementById('btn-tab-eliminatorias');
    if(btn && todosJugados) { btn.disabled = false; btn.style.opacity = "1"; }
}

async function finalizarTorneo() {
    if (confirm("¿Seguro que quieres finalizar el torneo? Se cerrará el registro.")) {
        const res = await fetch('/api/torneos/finalizar', { method: 'POST' });
        if (res.ok) window.location.href = '/nuevo-torneo';
    }
}