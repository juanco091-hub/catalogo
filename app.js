// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================
const CONFIG = {
    // Texto informativo que puedes cambiar cuando quieras
    subtituloEstado: "(Todo el contenido se puede ver en línea y descargar)",
    
    // ENLACES DE TU GOOGLE SHEETS EN FORMATO CSV
    urlSheetsActrices: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0YbDSS-cHA_kEaYIw8Kq0ko0nFmzgczzQm2F769-I-n9frt-FKlwalmijrUHxDcRswlfSIwGl1QPg/pub?gid=0&single=true&output=csv",
    urlSheetsVideos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0YbDSS-cHA_kEaYIw8Kq0ko0nFmzgczzQm2F769-I-n9frt-FKlwalmijrUHxDcRswlfSIwGl1QPg/pub?gid=1597144864&single=true&output=csv"
};

// ==========================================
// ESTADO INTERNO DE LA WEB
// ==========================================
let BD_ACTRICES = [];
let BD_VIDEOS = [];
let datosFiltrados = []; 

let vistaActual = "inicio"; // "inicio" o "actriz"
let actrizSeleccionada = null;
let paginaActual = 1;

// Estados de ordenamiento (Alternan entre True y False al pulsar)
let ordenAlfabeticoAsc = true; 
let ordenRecienteAsc = false; // False = Más nuevo primero (por defecto)
let ordenEstrenoAsc = false;   // False = Más nuevo primero
let ordenSubidaAsc = false;    // False = Más nuevo primero

// Elementos de la interfaz
const btnInicio = document.getElementById("btn-inicio");
const zonaFiltrosBusqueda = document.getElementById("zona-filtros-busqueda");
const contenedorPrincipal = document.getElementById("contenedor-principal");
const contenedorPaginacion = document.getElementById("paginacion");

// ==========================================
// ARRANQUE DE LA APLICACIÓN
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    btnInicio.addEventListener("click", irAInicio);
    
    // Conectarse a Google Sheets en tiempo real
    await cargarDatosDesdeSheets();
    
    // Mostrar la pantalla principal
    irAInicio();
});

// Lector en tiempo real de Google Sheets
async function cargarDatosDesdeSheets() {
    try {
        const [resActrices, resVideos] = await Promise.all([
            fetch(CONFIG.urlSheetsActrices),
            fetch(CONFIG.urlSheetsVideos)
        ]);
        
        if (!resActrices.ok || !resVideos.ok) {
            throw new Error("Uno o ambos enlaces de Google Sheets devolvieron un error.");
        }
        
        const csvActrices = await resActrices.text();
        const csvVideos = await resVideos.text();
        
        BD_ACTRICES = csvAJson(csvActrices);
        BD_VIDEOS = csvAJson(csvVideos);
        
    } catch (error) {
        console.error("Error cargando los datos reales:", error);
        alert("Error al conectar con Google Sheets. Asegúrate de haber publicado correctamente las pestañas como CSV.");
    }
}

// Convertidor automático mejorado: detecta comas o puntos y comas automáticamente
function csvAJson(csv) {
    const lineas = csv.split(/\r?\n/);
    if (lineas.length === 0 || !lineas[0].trim()) return [];
    
    // Detectar si el documento usa comas (,) o punto y coma (;) como separador regional
    const primeraLinea = lineas[0];
    const separador = primeraLinea.includes(";") ? ";" : ",";
    
    // Separar los encabezados limpiando espacios y comillas exteriores
    const columnas = primeraLinea.split(separador).map(c => c.trim().replace(/^["']|["']$/g, ""));
    const resultado = [];
    
    for (let i = 1; i < lineas.length; i++) {
        if (!lineas[i].trim()) continue;
        
        let valores = [];
        if (separador === ",") {
            // Regla para comas respetando textos largos con comas por dentro
            valores = lineas[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lineas[i].split(",");
        } else {
            // Regla simple para punto y coma (;)
            valores = lineas[i].split(";");
        }
        
        const fila = {};
        columnas.forEach((col, index) => {
            let valor = valores[index] ? valores[index].trim() : "";
            valor = valor.replace(/^["']|["']$/g, ""); // Quitar comillas exteriores si existen
            fila[col] = valor;
        });
        resultado.push(fila);
    }
    return resultado;
}

// ==========================================
// CONTROL DE LA PÁGINA PRINCIPAL (ACTRICES)
// ==========================================
function irAInicio() {
    vistaActual = "inicio";
    actrizSeleccionada = null;
    paginaActual = 1;
    datosFiltrados = [...BD_ACTRICES];
    
    // Orden predeterminado: Alfabético A-Z tal como se inicia
    datosFiltrados.sort((a, b) => (a.Actriz || "").localeCompare(b.Actriz || ""));

    // Dibujar buscador y filtros en el encabezado fijo
    zonaFiltrosBusqueda.innerHTML = `
        <p class="text-center text-[11px] font-bold text-yellow-400 my-1">${CONFIG.subtituloEstado}</p>
        <div class="relative my-1.5">
            <input type="text" id="buscador" list="sugerencias-actrices" placeholder="Buscar actriz..." class="w-full bg-gray-900 border border-gray-700 text-sm rounded py-2 px-3 focus:outline-none focus:border-red-500 text-white placeholder-gray-500">
            <datalist id="sugerencias-actrices">
                ${BD_ACTRICES.map(a => a.Actriz ? `<option value="${a.Actriz}">` : "").join("")}
            </datalist>
        </div>
        <div class="grid grid-cols-2 gap-2 text-[11px] font-black mt-2">
            <button id="btn-filtro-alfa" class="bg-gray-800 hover:bg-gray-700 py-2.5 px-1 rounded text-center border border-gray-700 uppercase tracking-tight text-gray-200">
                Ordenar Alfabéticamente (${ordenAlfabeticoAsc ? "A ➔ Z" : "Z ➔ A"})
            </button>
            <button id="btn-filtro-reciente" class="bg-gray-800 hover:bg-gray-700 py-2.5 px-1 rounded text-center border border-gray-700 uppercase tracking-tight text-red-400">
                ${ordenRecienteAsc ? "Ordenar por Más Antiguos" : "Recién Actualizado"}
            </button>
        </div>
    `;

    document.getElementById("buscador").addEventListener("input", filtrarActrices);
    document.getElementById("btn-filtro-alfa").addEventListener("click", alternarOrdenAlfabetico);
    document.getElementById("btn-filtro-reciente").addEventListener("click", alternarOrdenReciente);

    mostrarContenidoUI();
}

function filtrarActrices(e) {
    const termino = e.target.value.toLowerCase().trim();
    datosFiltrados = BD_ACTRICES.filter(a => a.Actriz && a.Actriz.toLowerCase().includes(termino));
    paginaActual = 1;
    mostrarContenidoUI();
}

function alternarOrdenAlfabetico() {
    ordenAlfabeticoAsc = !ordenAlfabeticoAsc;
    datosFiltrados.sort((a, b) => {
        return ordenAlfabeticoAsc ? (a.Actriz || "").localeCompare(b.Actriz || "") : (b.Actriz || "").localeCompare(a.Actriz || "");
    });
    paginaActual = 1;
    irAInicioUIActualizada();
}

function alternarOrdenReciente() {
    ordenRecienteAsc = !ordenRecienteAsc;
    datosFiltrados.sort((a, b) => {
        return ordenRecienteAsc ? new Date(a.UltimaActualizacion) - new Date(b.UltimaActualizacion) : new Date(b.UltimaActualizacion) - new Date(a.UltimaActualizacion);
    });
    paginaActual = 1;
    irAInicioUIActualizada();
}

function irAInicioUIActualizada() {
    document.getElementById("btn-filtro-alfa").textContent = `Ordenar Alfabéticamente (${ordenAlfabeticoAsc ? "A ➔ Z" : "Z ➔ A"})`;
    document.getElementById("btn-filtro-reciente").textContent = ordenRecienteAsc ? "Ordenar por Más Antiguos" : "Recién Actualizado";
    mostrarContenidoUI();
}

// ==========================================
// CONTROL DE LA PÁGINA DE LA ACTRIZ (VIDEOS)
// ==========================================
function irAPaginaActriz(nombreActriz) {
    vistaActual = "actriz";
    actrizSeleccionada = nombreActriz;
    paginaActual = 1;
    
    // FILTRADO EN MEMORIA: Extrae solo los videos vinculados a ella de forma exacta
    datosFiltrados = BD_VIDEOS.filter(v => v.Actriz && v.Actriz.toLowerCase().trim() === nombreActriz.toLowerCase().trim());
    
    // Orden por defecto de videos: Más nuevos primero (Fecha Subida Descendente)
    datosFiltrados.sort((a,b) => new Date(b.FechaSubida) - new Date(a.FechaSubida));

    // Cambiar el Encabezado Fijo (Sin buscador, muestra el nombre de la Actriz)
    zonaFiltrosBusqueda.innerHTML = `
        <p class="text-center text-[11px] font-bold text-yellow-400 my-1">${CONFIG.subtituloEstado}</p>
        <h2 class="text-center font-black text-lg tracking-wide text-white uppercase border-b border-gray-800 pb-1.5 pt-0.5">${nombreActriz}</h2>
        <div class="grid grid-cols-2 gap-2 text-[11px] font-black mt-2">
            <button id="btn-filtro-estreno" class="bg-gray-800 hover:bg-gray-700 py-2.5 px-1 rounded text-center border border-gray-700 uppercase text-gray-200">
                Fecha de Estreno ${ordenEstrenoAsc ? "▲" : "▼"}
            </button>
            <button id="btn-filtro-subida" class="bg-gray-800 hover:bg-gray-700 py-2.5 px-1 rounded text-center border border-gray-700 uppercase text-red-400">
                Fecha de Subida ${ordenSubidaAsc ? "▲" : "▼"}
            </button>
        </div>
    `;

    document.getElementById("btn-filtro-estreno").addEventListener("click", () => alternarFiltroVideos("estreno"));
    document.getElementById("btn-filtro-subida").addEventListener("click", () => alternarFiltroVideos("subida"));

    mostrarContenidoUI();
}

function alternarFiltroVideos(tipo) {
    if (tipo === "estreno") {
        ordenEstrenoAsc = !ordenEstrenoAsc;
        datosFiltrados.sort((a, b) => {
            return ordenEstrenoAsc ? new Date(a.FechaEstreno) - new Date(b.FechaEstreno) : new Date(b.FechaEstreno) - new Date(a.FechaEstreno);
        });
        document.getElementById("btn-filtro-estreno").classList.add("text-red-400");
        document.getElementById("btn-filtro-subida").classList.remove("text-red-400");
    } else {
        ordenSubidaAsc = !ordenSubidaAsc;
        datosFiltrados.sort((a, b) => {
            return ordenSubidaAsc ? new Date(a.FechaSubida) - new Date(b.FechaSubida) : new Date(b.FechaSubida) - new Date(a.FechaSubida);
        });
        document.getElementById("btn-filtro-subida").classList.add("text-red-400");
        document.getElementById("btn-filtro-estreno").classList.remove("text-red-400");
    }
    document.getElementById("btn-filtro-estreno").textContent = `Fecha de Estreno ${ordenEstrenoAsc ? "▲" : "▼"}`;
    document.getElementById("btn-filtro-subida").textContent = `Fecha de Subida ${ordenSubidaAsc ? "▲" : "▼"}`;
    
    paginaActual = 1;
    mostrarContenidoUI();
}

// ==========================================
// RENDERIZADOR RENDIMIENTO ULTRA MÓVIL
// ==========================================
function mostrarContenidoUI() {
    contenedorPrincipal.innerHTML = "";
    
    const limiteElementos = vistaActual === "inicio" ? 20 : 10;
    const indiceInicio = (paginaActual - 1) * limiteElementos;
    const indiceFin = indiceInicio + limiteElementos;
    
    const bloquePaginado = datosFiltrados.slice(indiceInicio, indiceFin);

    if (bloquePaginado.length === 0) {
        contenedorPrincipal.className = "block text-center py-12 text-gray-500 text-sm font-semibold";
        contenedorPrincipal.innerHTML = "No se encontró contenido disponible.";
        contenedorPaginacion.innerHTML = "";
        return;
    }

    if (vistaActual === "inicio") {
        contenedorPrincipal.className = "grid grid-cols-2 gap-3";
        
        bloquePaginado.forEach(actriz => {
            if (!actriz.Actriz) return;
            const nombreImagen = actriz.Actriz.toLowerCase()
                                       .replace(/[\u0300-\u036f]/g, "")
                                       .replace(/ñ/g, "n")
                                       .replace(/\s+/g, "_");
            
            const tarjeta = document.createElement("div");
            tarjeta.className = "bg-gray-950 border border-gray-800 rounded overflow-hidden flex flex-col shadow-sm";
            tarjeta.innerHTML = `
                <div class="w-full aspect-[333/500] bg-gray-900 relative">
                    <img src="portadas/${nombreImagen}.jpg" alt="${actriz.Actriz}" class="w-full h-full object-cover" loading="lazy" onerror="this.src='https://placehold.co/333x500/1f2937/9ca3af?text=SIN+PORTADA'">
                </div>
                <div class="p-2 flex flex-col flex-grow justify-between text-center bg-gray-950">
                    <h3 class="font-black text-xs uppercase tracking-tight text-gray-200 line-clamp-1">${actriz.Actriz}</h3>
                    <button class="w-full bg-red-600 font-extrabold text-[10px] py-2 rounded mt-2 text-white uppercase tracking-wider">VER CONTENIDO</button>
                </div>
            `;
            tarjeta.addEventListener("click", () => irAPaginaActriz(actriz.Actriz));
            contenedorPrincipal.appendChild(tarjeta);
        });
    } else {
        contenedorPrincipal.className = "flex flex-col gap-5";
        
        bloquePaginado.forEach(video => {
            const tarjeta = document.createElement("div");
            tarjeta.className = "bg-gray-950 border border-gray-800 rounded p-3 flex flex-col gap-2.5 shadow-sm";
            tarjeta.innerHTML = `
                <h3 class="font-mono text-red-500 font-black text-sm tracking-wide">[${video.Codigo || 'SIN CÓDIGO'}]</h3>
                
                <a href="${video.URL || '#'}" target="_blank" class="block w-full aspect-video bg-gray-900 relative rounded overflow-hidden shadow group">
                    <img src="portadas/${video.Codigo}.jpg" alt="${video.Codigo}" class="w-full h-full object-cover" loading="lazy" onerror="this.src='https://placehold.co/500x333/1f2937/9ca3af?text=PLAY+VIDEO'">
                    
                    <div class="absolute inset-0 flex items-center justify-center bg-black/20 group-active:bg-black/40 transition-colors">
                        <div class="w-14 h-14 rounded-full bg-red-600/90 flex items-center justify-center shadow-2xl transform active:scale-90 transition-transform">
                            <svg class="w-7 h-7 text-white fill-current ml-1" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </div>
                    </div>
                </a>
                
                <p class="text-xs text-gray-300 leading-relaxed pt-0.5 descripcion-video font-medium">${video.Descripcion || 'Sin descripción disponible.'}</p>
            `;
            contenedorPrincipal.appendChild(tarjeta);
        });
    }
    
    construirPaginacionUI(limiteElementos);
}

function construirPaginacionUI(limiteElementos) {
    contenedorPaginacion.innerHTML = "";
    const totalPaginas = Math.ceil(datosFiltrados.length / limiteElementos);
    
    if(totalPaginas <= 1) return;

    for(let i = 1; i <= totalPaginas; i++) {
        const boton = document.createElement("button");
        boton.textContent = i;
        boton.className = `w-9 h-9 rounded-md text-xs font-black transition-all ${paginaActual === i ? 'bg-red-600 text-white shadow scale-105' : 'bg-gray-800 text-gray-400 border border-gray-700'}`;
        
        boton.addEventListener("click", () => {
            paginaActual = i;
            mostrarContenidoUI();
            window.scrollTo({top: 0, behavior: 'smooth'}); 
        });
        contenedorPaginacion.appendChild(boton);
    }
}