// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================
const CONFIG = {
    subtituloEstado: "(Todo el contenido se puede ver en línea y descargar)",
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

// Control de Filtro Único para la Página Principal (Por defecto: recién actualizado)
let filtroSelectInicio = "reciente"; // Valores posibles: "reciente", "antiguo", "az", "za"

// Control de Filtros - Página de Actriz
let criterionFechaVideos = "estreno"; // "estreno" o "subida"

// Elementos fijos del DOM original
const contenedorPrincipal = document.getElementById("contenedor-principal");
const contenedorPaginacion = document.getElementById("contenedor-paginacion");
const zonaFiltrosBusqueda = document.getElementById("zona-filtros-busqueda");
const datalistActrices = document.getElementById("lista-actrices");
const btnInicio = document.getElementById("btn-inicio");

let textoBuscadoGuardado = "";

// ==========================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    cargarDatosDesdeSheets();

    btnInicio.addEventListener("click", () => {
        irAInicio();
    });

    window.addEventListener("popstate", (evento) => {
        if (evento && evento.state) {
            vistaActual = evento.state.vista || "inicio";
            paginaActual = evento.state.pagina || 1;
            textoBuscadoGuardado = evento.state.busqueda || "";
            
            if (vistaActual === "videos") {
                actrizSeleccionada = evento.state.actriz;
                criterionFechaVideos = evento.state.criterionFecha || "estreno";
            } else {
                actrizSeleccionada = null;
                filtroSelectInicio = evento.state.filtro || "reciente";
            }
            
            construirControlesSuperioresUI(true);
            procesarFiltrosYRenderizado(false);
        } else {
            irAInicio(false); 
        }
    });
});

function irAInicio(registrarHistorial = true) {
    vistaActual = "inicio";
    actrizSeleccionada = null;
    paginaActual = 1;
    textoBuscadoGuardado = ""; 
    filtroSelectInicio = "reciente"; // Siempre vuelve al valor por defecto al hacer clic en INICIO
    
    if (registrarHistorial) {
        history.pushState({ 
            vista: "inicio", 
            pagina: paginaActual, 
            filtro: filtroSelectInicio, 
            busqueda: textoBuscadoGuardado 
        }, "", " ");
    }
    
    construirControlesSuperioresUI(true);
    procesarFiltrosYRenderizado(false);
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
        
        // Estado inicial de la app guardado en el historial
        history.replaceState({ 
            vista: "inicio", 
            pagina: paginaActual, 
            filtro: filtroSelectInicio, 
            busqueda: textoBuscadoGuardado 
        }, "", " ");
        
        construirControlesSuperioresUI(true);
        procesarFiltrosYRenderizado(false);
    } catch (error) {
        contenedorPrincipal.innerHTML = `<p class="col-span-2 text-center text-red-500 font-bold py-8 text-sm">Error cargando los datos.</p>`;
    }
}

function csvAJson(textoCsv) {
    const lineas = textoCsv.split(/\r?\n/);
    if (lineas.length === 0) return [];
    
    const encabezados = lineas[0].split(',').map(h => 
        h.trim()
         .replace(/^"|"$/g, '')
         .normalize("NFD")
         .replace(/[\u0300-\u036f]/g, "")
         .replace(/ñ/g, "n")
    );
    
    const resultado = [];

    for (let i = 1; i < lineas.length; i++) {
        if (!lineas[i].trim()) continue;
        
        const valores = [];
        let dentroDeComillas = false;
        let valorActual = "";
        const linea = lineas[i];

        for (let j = 0; j < linea.length; j++) {
            const caracter = linea[j];
            if (caracter === '"') {
                dentroDeComillas = !dentroDeComillas;
            } else if (caracter === ',' && !dentroDeComillas) {
                valores.push(valorActual);
                valorActual = "";
            } else {
                valorActual += caracter;
            }
        }
        valores.push(valorActual);

        const filaObjeto = {};
        encabezados.forEach((encabezado, indice) => {
            let val = valores[indice] ? valores[indice].trim() : "";
            filaObjeto[encabezado] = val.replace(/^"|"$/g, '');
        });
        
        resultado.push(filaObjeto);
    }
    return resultado;
}

function actualizarDatalistSugerencias() {
    datalistActrices.innerHTML = "";
    BD_ACTRICES.forEach(actriz => {
        if (actriz.Actriz) {
            const option = document.createElement("option");
            option.value = actriz.Actriz;
            datalistActrices.appendChild(option);
        }
    });
}

// ==========================================
// CONSTRUCCIÓN CONTROLADA DE LOS FILTROS SUPERIORES
// ==========================================
function construirControlesSuperioresUI(forzarReconstruccionCompleta = false) {
    if (vistaActual === "videos") {
        zonaFiltrosBusqueda.innerHTML = `
            <div class="flex items-center justify-between px-1 py-1">
                <div class="flex flex-col">
                    <h2 class="text-xl font-black text-white leading-tight tracking-tight">${actrizSeleccionada}</h2>
                </div>
                <button id="filtro-videos-fecha" class="text-[11px] font-black text-red-500 transition-colors">
                    <span>Ordenar: ${criterionFechaVideos === 'estreno' ? 'Fecha de estreno' : 'Fecha de Subida'}</span>
                </button>
            </div>
        `;

        document.getElementById("filtro-videos-fecha").addEventListener("click", () => {
            criterionFechaVideos = criterionFechaVideos === "estreno" ? "subida" : "estreno";
            
            // Actualizar el historial al cambiar filtro de videos
            const nombreLimpio = actrizSeleccionada.toLowerCase().replace(/\s+/g, "_");
            history.replaceState({ 
                vista: "videos", 
                actriz: actrizSeleccionada, 
                pagina: paginaActual, 
                criterionFecha: criterionFechaVideos 
            }, "", `?actriz=${nombreLimpio}&p=${paginaActual}`);
            
            construirControlesSuperioresUI();
            procesarFiltrosYRenderizado(false);
        });
        return;
    }

    // VISTA DE INICIO (Con la lista desplegable solicitada)
    const buscadorExiste = document.getElementById("buscador-actriz");
    
    if (buscadorExiste && !forzarReconstruccionCompleta) {
        const selectFiltro = document.getElementById("select-filtro-inicio");
        if (selectFiltro) {
            selectFiltro.value = filtroSelectInicio;
        }
        return;
    }

    zonaFiltrosBusqueda.innerHTML = `
        <div id="contenedor-input-buscador" class="mb-2">
            <input type="text" id="buscador-actriz" placeholder="Buscar actriz..." list="lista-actrices" 
                class="w-full bg-gray-900 border border-gray-800 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-red-600 font-medium text-gray-200"
                value="${textoBuscadoGuardado}">
        </div>
        <div class="flex items-center gap-2 px-1 text-[11px] tracking-wide pt-1 text-gray-400">
            <label for="select-filtro-inicio" class="font-bold shrink-0">Ordenar por:</label>
            <select id="select-filtro-inicio" class="bg-gray-950 border border-gray-800 rounded px-2 py-1 text-white font-black text-[11px] focus:outline-none focus:border-red-600 cursor-pointer">
                <option value="reciente">▼ Recién Actualizado</option>
                <option value="antiguo">▲ Más Antiguos</option>
                <option value="az">▲ Ordenar A-Z</option>
                <option value="za">▼ Ordenar Z-A</option>
            </select>
        </div>
    `;

    const inputBuscador = document.getElementById("buscador-actriz");
    inputBuscador.addEventListener("input", (e) => {
        textoBuscadoGuardado = e.target.value;
        paginaActual = 1;
        procesarFiltrosYRenderizado(true); // Guarda en el historial el cambio de búsqueda
    });

    const selectFiltro = document.getElementById("select-filtro-inicio");
    selectFiltro.value = filtroSelectInicio;
    
    selectFiltro.addEventListener("change", (e) => {
        filtroSelectInicio = e.target.value;
        paginaActual = 1;
        procesarFiltrosYRenderizado(true); // Guarda en el historial el cambio de filtro
    });
}

// ==========================================
// PROCESAMIENTO LÓGICO Y FILTRADO DE DATOS
// ==========================================
function procesarFiltrosYRenderizado(guardarEnHistorial = false) {
    if (vistaActual === "inicio") {
        contenedorPrincipal.className = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
        
        let auxiliares = [...BD_ACTRICES];
        const terminoBusqueda = textoBuscadoGuardado.toLowerCase().trim();

        if (terminoBusqueda) {
            auxiliares = auxiliares.filter(actriz => 
                actriz.Actriz && actriz.Actriz.toLowerCase().includes(terminoBusqueda)
            );
        }

        // Procesamiento según la opción seleccionada en el menú desplegable
        if (filtroSelectInicio === "reciente") {
            auxiliares.sort((a, b) => new Date(b.UltimaActualizacion || 0) - new Date(a.UltimaActualizacion || 0));
        } else if (filtroSelectInicio === "antiguo") {
            auxiliares.sort((a, b) => new Date(a.UltimaActualizacion || 0) - new Date(b.UltimaActualizacion || 0));
        } else if (filtroSelectInicio === "az") {
            auxiliares.sort((a, b) => (a.Actriz || "").toLowerCase().localeCompare((b.Actriz || "").toLowerCase()));
        } else if (filtroSelectInicio === "za") {
            auxiliares.sort((a, b) => (b.Actriz || "").toLowerCase().localeCompare((a.Actriz || "").toLowerCase()));
        }

        datosFiltrados = auxiliares;
        
        if (guardarEnHistorial) {
            history.replaceState({ 
                vista: "inicio", 
                pagina: paginaActual, 
                filtro: filtroSelectInicio, 
                busqueda: textoBuscadoGuardado 
            }, "", " ");
        }
        
        mostrarContenidoUI(20);
    } else {
        contenedorPrincipal.className = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";
        
        let auxiliares = BD_VIDEOS.filter(video => 
            video.Actriz && video.Actriz.toLowerCase() === actrizSeleccionada.toLowerCase()
        );

        auxiliares.sort((a, b) => {
            const campoFechaA = criterionFechaVideos === "estreno" ? (a.FechaEstreno || 0) : (a.FechaSubida || 0);
            const campoFechaB = criterionFechaVideos === "estreno" ? (b.FechaEstreno || 0) : (b.FechaSubida || 0);
            return new Date(campoFechaB) - new Date(campoFechaA);
        });

        datosFiltrados = auxiliares;
        mostrarContenidoUI(10);
    }
}

// ==========================================
// RENDERIZADO DE LAS PORTADAS Y TARJETAS EN EL GRID
// ==========================================
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
            
            const nombreLimpio = (actriz.Actriz || "")
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/ñ/g, "n")
                .replace(/\s+/g, "_");

            tarjeta.innerHTML = `
                <div class="w-full aspect-[3/4] bg-gray-900 rounded overflow-hidden mb-2 relative border border-gray-800">
                    <img src="portadas/${nombreLimpio}.jpg" alt="${actriz.Actriz}" 
                         class="w-full h-full object-cover" loading="lazy" 
                         onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' fill=\\'none\\' viewBox=\\'0 0 24 24\\' stroke=\\'%23374151\\'><path stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'1\\' d=\\'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z\\'/></svg>';">
                </div>
                <h3 class="text-xs font-black text-gray-200 tracking-tight line-clamp-1 w-full">${actriz.Actriz || 'Anónima'}</h3>
            `;
            
            tarjeta.addEventListener("click", () => {
                actrizSeleccionada = actriz.Actriz;
                vistaActual = "videos";
                paginaActual = 1;
                
                // Al entrar a los videos de una actriz, guardamos este estado en el historial
                history.pushState({ 
                    vista: "videos", 
                    actriz: actrizSeleccionada, 
                    pagina: 1, 
                    criterionFecha: criterionFechaVideos 
                }, "", `?actriz=${nombreLimpio}`);
                
                construirControlesSuperioresUI(true);
                procesarFiltrosYRenderizado(false);
            });
            contenedorPrincipal.appendChild(tarjeta);
        });
    } else {
        elementosPagina.forEach(video => {
            const tarjeta = document.createElement("div");
            tarjeta.className = "bg-gray-950 border border-gray-800 rounded-lg p-3 flex flex-col gap-2 shadow-md";
            
            const tieneDetalles = video.Formato || video.Resolucion || video.Tamano;
            const textoDetalles = tieneDetalles 
                ? ` • <span class="text-gray-400 font-bold">${video.Formato || ''} ${video.Resolucion || ''}</span> • <span class="text-gray-400 font-bold">${video.Tamano || ''}</span>` 
                : '';

            tarjeta.innerHTML = `
                <h3 class="font-mono text-red-500 font-black text-xs tracking-wide">
                    <span class="uppercase">[${video.Codigo || 'SIN CÓDIGO'}]</span>${textoDetalles}
                </h3>
                
                <a href="${video.URL || '#'}" target="_blank" class="block group w-full">
                    <div class="w-full aspect-video bg-gray-900 rounded-md overflow-hidden relative border border-gray-800 shadow-inner">
                        <img src="portadas/${video.Codigo || 'default'}.jpg" alt="Portada Video" 
                             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy"
                             onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' fill=\\'none\\' viewBox=\\'0 0 24 24\\' stroke=\\'%231f2937\\'><rect width=\\'20\\' height=\\'14\\' x=\\'2\\' y=\\'5\\' rx=\\'2\\' stroke-width=\\'1\\'/><path stroke-width=\\'1\\' d=\\'M10 11l5 3-5 3v-6z\\'/></svg>';">
                        
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
                const nombreLimpio = actrizSeleccionada.toLowerCase().replace(/\s+/g, "_");
                history.pushState({ 
                    vista: "videos", 
                    actriz: actrizSeleccionada, 
                    pagina: paginaActual, 
                    criterionFecha: criterionFechaVideos 
                }, "", `?actriz=${nombreLimpio}&p=${i}`);
            } else {
                // Al cambiar de página en el inicio, actualizamos el historial para que recuerde en qué página se quedó
                history.pushState({ 
                    vista: "inicio", 
                    pagina: paginaActual, 
                    filtro: filtroSelectInicio, 
                    busqueda: textoBuscadoGuardado 
                }, "", " ");
            }
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
            procesarFiltrosYRenderizado(false);
        });
        
        contenedorPaginacion.appendChild(boton);
    }
}
