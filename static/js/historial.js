document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('historial-container');
    
    // Referencias seguras a los contadores
    const totalTorneosTxt = document.querySelector('.stat-card:nth-child(1) h2');
    const maxGanadorTxt = document.querySelector('.stat-card:nth-child(2) h2');
    const totalGolesTxt = document.querySelector('.stat-card:nth-child(3) h2');

    try {
        const response = await fetch('/api/historial'); 
        
        // Si el servidor responde pero con error (404, 500, etc)
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const data = await response.json();
        console.log("Datos recibidos:", data); // Esto te ayudará a ver qué llega en la consola (F12)

        if (!data || data.length === 0) {
            container.innerHTML = `<div class="empty-state" style="color:white; text-align:center; padding:20px;">No hay torneos finalizados aún.</div>`;
            if(totalTorneosTxt) totalTorneosTxt.innerText = "0";
            if(maxGanadorTxt) maxGanadorTxt.innerText = "--";
            if(totalGolesTxt) totalGolesTxt.innerText = "0";
            return;
        }

        // --- CÁLCULOS ---
        let totalGoles = 0;
        const conteoGanadores = {};

        data.forEach(t => {
            totalGoles += (Number(t.goles_totales) || 0);
            if (t.ganador && t.ganador !== "Desconocido" && t.ganador !== "Sin Ganador") {
                conteoGanadores[t.ganador] = (conteoGanadores[t.ganador] || 0) + 1;
            }
        });

        // Actualizar UI
        if(totalTorneosTxt) totalTorneosTxt.innerText = data.length;
        if(totalGolesTxt) totalGolesTxt.innerText = totalGoles;
        
        const ganadoresArray = Object.keys(conteoGanadores);
        if (ganadoresArray.length > 0) {
            const top = ganadoresArray.reduce((a, b) => conteoGanadores[a] > conteoGanadores[b] ? a : b);
            if(maxGanadorTxt) maxGanadorTxt.innerText = top;
        }

        // --- RENDERIZADO ---
        container.innerHTML = data.map(t => {
            // Usar imagen por defecto si foto_1 o foto_2 están vacíos
            const img1 = (t.foto_1 && t.foto_1.trim() !== "") ? t.foto_1 : 'https://i.imgur.com/83p9p9X.png';
            const img2 = (t.foto_2 && t.foto_2.trim() !== "") ? t.foto_2 : 'https://i.imgur.com/83p9p9X.png';
            
            return `
            <div class="tourney-item">
                <div class="tourney-summary">
                    <div class="tourney-date">
                        <span style="display:block; font-weight:bold; color:white;">${t.dia || '--'}</span>
                        <span style="font-size:0.7rem; color:#aaa;">${t.mes || 'MES'}</span>
                    </div>
                    <div class="tourney-info">
                        <h3>${t.nombre}</h3>
                        <p style="color:#64748b; margin:0;">
                            ${t.participantes || 0} Jugadores • Ganador: <strong style="color:#fbbf24;">${t.ganador}</strong>
                        </p>
                        <small style="color:#475569;">${t.equipo_1 || ''}</small>
                    </div>
                    <div class="podium-mini">
                        <div class="medal-slot oro">
                            <img src="${img1}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
                            <i class="fas fa-medal" style="position:absolute; bottom:-5px; right:-5px; color:#fbbf24;"></i>
                        </div>
                        <div class="medal-slot plata">
                            <img src="${img2}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
                            <i class="fas fa-medal" style="position:absolute; bottom:-5px; right:-5px; color:#94a3b8;"></i>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');

    } catch (error) {
        console.error("Error detallado:", error);
        container.innerHTML = `
            <div style="color:white; text-align:center; padding:20px;">
                <p>Hubo un problema al cargar los datos.</p>
                <small style="color:#64748b;">Detalle: ${error.message}</small>
            </div>`;
    }
});