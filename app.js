// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================
const CONFIG = {
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

let vistaActual = "inicio"; 
let actrizSeleccionada = null;
let paginaActual = 1;

let ordenAlfabeticoAsc = true; 
let ordenRecienActualizado = true;
let ordenVideosEstreno = true;

// Elementos del DOM
const contenedorPrincipal = document.getElementById("contenedor-principal");
const contenedorPaginacion = document.getElementById("contenedor-paginacion");
const zonaFiltrosBusqueda = document.getElementById("zona-filtros-busqueda");
const datalistActrices = document.getElementById("lista-actrices");
const btnInicio = document.getElementById("btn-inicio");

// ==========================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    cargarDatosDesdeSheets();
    
    btnInicio.addEventListener("click", () => {
        irAInicio();
    });

    // CONTROL DEL BOTÓN "ATRÁS" DE ANDROID (HISTORIAL)
    window.addEventListener("popstate", (evento) => {
        if (evento.state && evento.state.vista === "videos") {
            actrizSeleccionada = evento.state.actriz;
            vistaActual = "videos";
            paginaActual = evento.state.pagina || 1;
            procesarFiltrosYRenderizado();
        } else {
            irAInicio(false); // Regresa a la lista general sin cerrar la app
        }
    });
});

function irAInicio(registrarHistorial = true) {
    vistaActual = "inicio";
    actrizSeleccionada = null;
    paginaActual = 1;
    
    if (registrarHistorial) {
        history.pushState({ vista: "inicio" }, "", " ");
    }
    
    procesarFiltrosYRenderizado();
}

async function cargarDatosDesdeSheets() {
    try {
        const [respuestaActrices, respuestaVideos] = await Promise.all([
            fetch(CONFIG.urlSheetsActrices).then(res => res.text()),
            fetch(CONFIG.urlSheetsVideos).then(res => res.text())
        ]);

        BD_ACTRICES = csvAJson(respuestaActrices);
        BD_VIDEOS = csvAJson(respuestaVideos);

        actualizarDatalistSugerencias();
        
        // Inicializar historial
        history.replaceState({ vista: "inicio" }, "", " ");
        
        procesarFiltrosYRenderizado();
    } catch (error) {
        contenedorPrincipal.innerHTML = `<p class="col-span-2 text-center text-red-500 font-bold py-8 text-sm">Error cargando el catálogo.</p>`;
    }
}

// Parser CSV nativo
function csvAJson(textoCsv) {
    const lineas = textoCsv.split(/\r?\n/);
    if (lineas.length === 0) return [];
    
    const encabezados = dividirLineaCsv(lineas[0]);
    const resultado = [];

    for (let i = 1; i < lineas.length; i++) {
        if (!lineas[i].trim()) continue;
        const valores = dividirLineaCsv(lineas[i]);
        const filaObjeto = {};
        
        encabezados.forEach((encabezado, indice) => {
            filaObjeto[encabezado.trim()] = valores[indice] ? valores[indice].trim() : "";
        });
        resultado.push(filaObjeto);
    }
    return resultado;
}

function dividirLineaCsv(linea) {
    const campos = [];
    let dentroDeComillas = false;
    let campoActual = "";

    for (let i = 0; i < linea.length; i++) {
        const caracter = linea[i];
        if (caracter === '"') {
            withinQuotes = !dentroDeComillas; // corrección lógica simple interna
            dentroDeComillas = !dentroDeComillas;
        } else if (caracter === ',' && !dentroDeComillas) {
            campos.push(campoActual);
            campoActual = "";
        } else {
            campoActual += caracter;
        }
    }
    campos.push(campoActual);
    return campos.map(c => c.replace(/^"|"$/g, ''));
}

function actualizarDatalistSugerencias() {
    datalistActrices.innerHTML = "";
    BD_ACTRICES.forEach(actriz => {
        if (actriz.Nombre) {
            const option = document.createElement("option");
            option.value = actriz.Nombre;
            datalistActrices.appendChild(option);
        }
    });
}

// ==========================================
// CONTROL DE FILTROS Y PROCESAMIENTO
// ==========================================
function procesarFiltrosYRenderizado() {
    construirControlesSuperioresUI();

    if (vistaActual === "inicio") {
        contenedorPrincipal.className = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
        let auxiliares = [...BD_ACTRICES];

        const BuscadorInput = document.getElementById("buscador-actriz");
        const terminoBusqueda = BuscadorInput ? BuscadorInput.value.toLowerCase().trim() : "";

        if (terminoBusqueda) {
            auxiliares = auxiliares.filter(actriz => 
                actriz.Nombre && actriz.Nombre.toLowerCase().includes(terminoBusqueda)
            );
        }

        auxiliares.sort((a, b) => {
            const nombreA = (a.Nombre || "").toLowerCase();
            const nombreB = (b.Nombre || "").toLowerCase();
            return ordenAlfabeticoAsc ? nombreA.localeCompare(nombreB) : nombreB.localeCompare(nombreA);
        });

        if (!ordenAlfabeticoAsc) {
            auxiliares.sort((a, b) => {
                const fechaA = new Date(a.UltimaActualizacion || 0);
                const fechaB = new Date(b.UltimaActualizacion || 0);
                return ordenRecienActualizado ? fechaB - fechaA : fechaA - fechaB;
            });
        }

        datosFiltrados = auxiliares;
        mostrarContenidoUI(20);
    } else {
        contenedorPrincipal.className = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";
        let auxiliares = BD_VIDEOS.filter(video => 
            video.Actriz && video.Actriz.toLowerCase() === actrizSeleccionada.toLowerCase()
        );

        auxiliares.sort((a, b) => {
            const fechaA = new Date(a.FechaEstreno || 0);
            const fechaB = new Date(b.FechaEstreno || 0);
            return ordenVideosEstreno ? fechaB - fechaA : fechaA - fechaB;
        });

        datosFiltrados = auxiliares;
        mostrarContenidoUI(10);
    }
}

// ==========================================
// CONSTRUCCIÓN DE LA INTERFAZ DE USUARIO (UI)
// ==========================================
function construirControlesSuperioresUI() {
    zonaFiltrosBusqueda.innerHTML = "";

    if (vistaActual === "inicio") {
        // Mantiene el buscador arriba y los filtros planos en una línea limpia abajo
        zonaFiltrosBusqueda.innerHTML = `
            <div class="flex flex-col gap-2">
                <input type="text" id="buscador-actriz" placeholder="Buscar actriz..." list="lista-actrices" 
                    class="w-full bg-gray-900 border border-gray-800 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-red-600 font-medium text-gray-200">
                
                <div class="flex items-center gap-4 px-1 text-[11px] font-bold text-gray-400">
                    <button id="filtro-alfabetico" class="transition-colors hover:text-red-500">
                        <span>Ordenar ${ordenAlfabeticoAsc ? 'A-Z' : 'Z-A'}</span>
                    </button>
                    <span class="text-gray-800">|</span>
                    <button id="filtro-actualizado" class="transition-colors ${ordenRecienActualizado ? 'text-red-500' : 'hover:text-red-500'}">
                        Recién Actualizado
                    </button>
                </div>
            </div>
        `;

        const buscador = document.getElementById("buscador-actriz");
        buscador.addEventListener("input", () => {
            paginaActual = 1;
            procesarFiltrosYRenderizado();
        });

        document.getElementById("filtro-alfabetico").addEventListener("click", () => {
            ordenAlfabeticoAsc = !ordenAlfabeticoAsc;
            paginaActual = 1;
            procesarFiltrosYRenderizado();
        });

        document.getElementById("filtro-actualizado").addEventListener("click", () => {
            ordenRecienActualizado = !ordenRecienActualizado;
            ordenAlfabeticoAsc = false; 
            paginaActual = 1;
            procesarFiltrosYRenderizado();
        });
    } else {
        // Encabezado de la actriz ordenado e impecable
        zonaFiltrosBusqueda.innerHTML = `
            <div class="flex items-center justify-between px-1 py-1">
                <div class="flex flex-col">
                    <span class="text-[9px] text-red-500 font-bold uppercase tracking-wider">Actriz Seleccionada</span>
                    <h2 class="text-base font-black text-white leading-tight">${actrizSeleccionada}</h2>
                </div>
                <button id="filtro-videos-fecha" class="text-[11px] font-bold text-gray-400 hover:text-red-500 transition-colors">
                    Ordenar: ${ordenVideosEstreno ? 'Recientes' : 'Antiguos'}
                </button>
            </div>
        `;

        document.getElementById("filtro-videos-fecha").addEventListener("click", () => {
            ordenVideosEstreno = !ordenVideosEstreno;
            paginaActual = 1;
            procesarFiltrosYRenderizado();
        });
    }
}

function mostrarContenidoUI(limiteElementos) {
    contenedorPrincipal.innerHTML = "";
    
    if (datosFiltrados.length === 0) {
        contenedorPrincipal.innerHTML = `<p class="col-span-full text-center text-gray-500 text-xs py-12 font-medium">No se encontraron elementos.</p>`;
        contenedorPaginacion.innerHTML = "";
        return;
    }

    const indiceInicio = (paginaActual - 1) * limiteElementos;
    const indiceFin = indiceInicio + limiteElementos;
    const elementosPagina = datosFiltrados.slice(indiceInicio, indiceFin);

    if (vistaActual === "inicio") {
        elementosPagina.forEach(actriz => {
            const tarjeta = document.createElement("div");
            tarjeta.className = "bg-gray-950 border border-gray-800/60 rounded-md p-2 flex flex-col items-center text-center cursor-pointer active:scale-95 transition-all shadow-sm";
            
            const nombreLimpio = (actriz.Nombre || "")
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/ñ/g, "n")
                .replace(/\s+/g, "_");

            tarjeta.innerHTML = `
                <div class="w-full aspect-[3/4] bg-gray-900 rounded overflow-hidden mb-2 relative border border-gray-800">
                    <img src="portadas/${nombreLimpio}.jpg" alt="${actriz.Nombre}" 
                         class="w-full h-full object-cover" loading="lazy" 
                         onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' fill=\\'none\\' viewBox=\\'0 0 24 24\\' stroke=\\'%23374151\\'><path stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'1\\' d=\\'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z\\'/></svg>';\">
                </div>
                <h3 class="text-xs font-black text-gray-200 tracking-tight line-clamp-1 w-full">${actriz.Nombre || 'Anónima'}</h3>
            `;
            
            tarjeta.addEventListener("click", () => {
                actrizSeleccionada = actriz.Nombre;
                vistaActual = "videos";
                paginaActual = 1;
                
                // Agrega estado al historial para capturar el botón atrás físico de Android
                history.pushState({ vista: "videos", actriz: actrizSeleccionada, pagina: 1 }, "", `?actriz=${nombreLimpio}`);
                
                procesarFiltrosYRenderizado();
            });
            contenedorPrincipal.appendChild(tarjeta);
        });
    } else {
        elementosPagina.forEach(video => {
            const tarjeta = document.createElement("div");
            tarjeta.className = "bg-gray-950 border border-gray-800 rounded-lg p-3 flex flex-col gap-2 shadow-md";
            
            // Renderiza la información extraída de tus columnas nuevas si existen
            const tieneDetalles = video.Formato || video.Resolucion || video.Tamano;
            const textoDetalles = tieneDetalles 
                ? ` • <span class="text-gray-400 font-bold">${video.Formato || ''} ${video.Resolucion || ''}</span> • <span class="text-gray-400 font-bold">${video.Tamano || ''}</span>` 
                : '';

            tarjeta.innerHTML = `
                <h3 class="font-mono text-red-500 font-black text-xs tracking-wide uppercase">
                    [${video.Codigo || 'SIN CÓDIGO'}]${textoDetalles}
                </h3>
                
                <a href="${video.URL || '#'}" target="_blank" class="block group w-full">
                    <div class="w-full aspect-video bg-gray-900 rounded-md overflow-hidden relative border border-gray-800 shadow-inner">
                        <img src="portadas/${video.Codigo || 'default'}.jpg" alt="Portada Video" 
                             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy"
                             onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' fill=\\'none\\' viewBox=\\'0 0 24 24\\' stroke=\\'%231f2937\\'><rect width=\\'20\\' height=\\'14\\' x=\\'2\\' y=\\'5\\' rx=\\'2\\' stroke-width=\\'1\\'/><path stroke-width=\\'1\\' d=\\'M10 11l5 3-5 3v-6z\\'/></svg>';\">
                        
                        <div class="absolute inset-0 flex items-center justify-center bg-black/20 group-active:bg-black/40 transition-colors">
                            <div class="w-12 h-12 bg-red-600/90 rounded-full flex items-center justify-center shadow-2xl transform active:scale-90 transition-transform">
                                <svg class="w-6 h-6 text-white fill-current ml-0.5" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                </svg>
                            </div>
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
    
    if (totalPaginas <= 1) return;

    for (let i = 1; i <= totalPaginas; i++) {
        const boton = document.createElement("button");
        boton.textContent = i;
        boton.className = `w-9 h-9 rounded-md text-xs font-black transition-all ${paginaActual === i ? 'bg-red-600 text-white shadow scale-105' : 'bg-gray-800 text-gray-400 border border-gray-700'}`;
        
        boton.addEventListener("click", () => {
            paginaActual = i;
            
            if (vistaActual === "videos") {
                history.replaceState({ vista: "videos", actriz: actrizSeleccionada, pagina: paginaActual }, "", `?actriz=${actrizSeleccionada.toLowerCase().replace(/\s+/g, "_")}&p=${i}`);
            }
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
            procesarFiltrosYRenderizado();
        });
        
        contenedorPaginacion.appendChild(boton);
    }
}
