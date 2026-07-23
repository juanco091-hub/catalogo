/**
 * CONFIGURACIÓN GLOBAL Y TEMAS (EQUIVALENTE A ENV / CONFIG)
 */
const APP_CONFIG = {
    sheets: {
        urlActrices: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0YbDSS-cHA_kEaYIw8Kq0ko0nFmzgczzQm2F769-I-n9frt-FKlwalmijrUHxDcRswlfSIwGl1QPg/pub?gid=0&single=true&output=csv",
        urlVideos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0YbDSS-cHA_kEaYIw8Kq0ko0nFmzgczzQm2F769-I-n9frt-FKlwalmijrUHxDcRswlfSIwGl1QPg/pub?gid=1597144864&single=true&output=csv"
    },
    // Estilos y Temas Centralizados
    theme: {
        textAccent: "text-yellow-500",
        textAccentHover: "hover:text-yellow-400",
        bgAccent: "bg-yellow-600",
        bgAccentHover: "hover:bg-yellow-500",
        borderAccent: "border-yellow-600/40",
        borderAccentFocus: "focus:border-yellow-500",
        badgeAccentBg: "bg-yellow-500/10",
        badgeAccentText: "text-yellow-400",
        badgeAccentBorder: "border-yellow-500/20"
    },
    paginationLimit: 20
};

// ESTADO GLOBAL DE LA APLICACIÓN
let BD_ACTRICES = []; 
let BD_VIDEOS = [];
let LISTA_ACTRICES_UNICAS = []; 
let datosFiltrados = []; 

let pestañaActiva = "todos"; 
let actrizSeleccionada = null; // Guardará el ID de la actriz (ej: "1")
let filtroRolActriz = "todos";  // Sub-filtro en perfil: "todos", "individual", "colaboracion"
let paginaActual = 1;
let criterioOrden = "reciente"; 
let ultimoCriterioSeleccionado = "reciente";
let direccionOrden = "desc";

// ELEMENTOS DOM
const contenedorPrincipal = document.getElementById("contenedor-principal");
const contenedorPaginacion = document.getElementById("contenedor-paginacion");
const searchBarContainer = document.getElementById("search-bar-container");
const inputBuscar = document.getElementById("input-buscar");
const selectOrdenar = document.getElementById("select-ordenar");
const mainTitle = document.getElementById("main-title");
const contenedorPestanasNav = document.getElementById("contenedor-pestanas-nav");
const vistaActrizCabecera = document.getElementById("vista-actriz-cabecera");
const nombreActrizTitulo = document.getElementById("nombre-actriz-titulo");
const btnVolverActrices = document.getElementById("btn-volver-actrices");
const btnCatCen = document.getElementById("btn-cat-cen");
const btnFooterWhatsapp = document.getElementById("btn-footer-whatsapp");
const btnFooterSearch = document.getElementById("btn-footer-search");
const modalWhatsapp = document.getElementById("modal-whatsapp");
const btnCerrarModal = document.getElementById("btn-cerrar-modal");

const modalAyuda = document.getElementById("modal-ayuda");
const btnCerrarAyuda = document.getElementById("btn-cerrar-ayuda");
const btnEntendidoAyuda = document.getElementById("btn-entendido-ayuda");

const vistaGeneralCabecera = document.getElementById("vista-general-cabecera");
const btnCabeceraActrices = document.getElementById("btn-cabecera-actrices");
const btnNombresAntiguos = document.getElementById("btn-nombres-antiguos");

// UTILIDADES Y NORMALIZACIÓN DE ENCABEZADOS
function normalizarEncabezado(titulo) {
    return titulo
        .trim()
        .toLowerCase()
        .normalize("NFD")                  
        .replace(/[\u0300-\u036f]/g, "")   
        .replace(/ñ/g, "n")                
        .replace(/\s+/g, "");              
}

function parsearCSV(textoCsv) {
    const lineas = textoCsv.split(/\r?\n/);
    if (lineas.length === 0) return [];
    
    const encabezados = lineas[0].split(',').map(h => normalizarEncabezado(h));
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

// BÚSQUEDA Y MAPEO RELACIONAL DE ACTRICES (ID -> OBJETO)
function obtenerActrizPorId(id) {
    if (!id) return null;
    const strId = String(id).trim();
    return BD_ACTRICES.find(a => {
        const cod = a.codigoactriz || a.codigo || a.id;
        return String(cod).trim() === strId;
    }) || null;
}

function obtenerListaActricesDeVideo(cadenaCodigos) {
    if (!cadenaCodigos || cadenaCodigos.trim() === "" || cadenaCodigos.toLowerCase() === "desconocida") {
        return [];
    }
    const codigos = cadenaCodigos.split(",").map(c => c.trim()).filter(c => c !== "");
    const lista = [];
    
    codigos.forEach(cod => {
        const actrizObj = obtenerActrizPorId(cod);
        if (actrizObj) {
            lista.push({
                id: cod,
                actriz: actrizObj.nombreactriz || actrizObj.actriz || `Actriz ${cod}`,
                slug: actrizObj.nombreenportadas || ""
            });
        } else {
            lista.push({ id: cod, actriz: cod, slug: "" });
        }
    });
    return lista;
}

// SANITIZACIÓN DE FECHAS
function parsearFechaMs(strFecha) {
    if (!strFecha || strFecha.trim() === "" || strFecha.trim() === "---" || strFecha.toLowerCase().includes("no registrado")) {
        return 0; 
    }
    const limpia = strFecha.trim().replace(/-/g, "/");
    const partes = limpia.split("/");
    
    if (partes.length === 3 && partes[0].length === 4) {
        return new Date(partes[0], partes[1] - 1, partes[2]).getTime();
    }
    if (partes.length === 3 && partes[2].length === 4) {
        return new Date(partes[2], partes[1] - 1, partes[0]).getTime();
    }
    
    const timestamp = Date.parse(limpia);
    return isNaN(timestamp) ? 0 : timestamp;
}

// GESTIÓN DE ESTADO Y HISTORIAL NAVEGADOR
function obtenerEstadoActual() {
    return {
        pestana: pestañaActiva,
        actriz: actrizSeleccionada,
        filtroRolActriz: filtroRolActriz,
        pagina: paginaActual,
        criterioOrden: criterioOrden,
        ultimoCriterioSeleccionado: ultimoCriterioSeleccionado,
        direccionOrden: direccionOrden,
        textoBusqueda: inputBuscar.value,
        scrollY: window.scrollY
    };
}

function restaurarEstado(state) {
    if (!state) return;
    
    pestañaActiva = state.pestana || "todos";
    actrizSeleccionada = state.actriz || null;
    filtroRolActriz = state.filtroRolActriz || "todos";
    paginaActual = state.pagina || 1;
    criterioOrden = state.criterioOrden || "reciente";
    ultimoCriterioSeleccionado = state.ultimoCriterioSeleccionado || "reciente";
    direccionOrden = state.direccionOrden || "desc";
    
    if (inputBuscar) {
        inputBuscar.value = state.textoBusqueda || "";
    }

    if (state.textoBusqueda && state.textoBusqueda.trim() !== "") {
        searchBarContainer.classList.remove("hidden");
    } else {
        searchBarContainer.classList.add("hidden");
    }

    actualizarUIHeadernavigation();
    actualizarOpcionesSelectOrdenar();
    selectOrdenar.value = criterioOrden;
    aplicarFiltrosYRenderizar();

    const scrollDestino = state.scrollY || 0;
    requestAnimationFrame(() => {
        window.scrollTo(0, scrollDestino);
    });
}

function actualizarEstadoActualSinNavegar() {
    history.replaceState(obtenerEstadoActual(), "", window.location.href);
}

// INICIALIZACIÓN DE LA APLICACIÓN
async function inicializarApp() {
    try {
        contenedorPrincipal.innerHTML = `
            <div class="flex flex-col items-center justify-center py-24 text-center gap-3">
                <div class="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-xs font-bold text-gray-400 tracking-wide">Cargando base de datos...</p>
            </div>
        `;
        
        const [resActrices, resVideos] = await Promise.all([
            fetch(APP_CONFIG.sheets.urlActrices).then(r => r.text()),
            fetch(APP_CONFIG.sheets.urlVideos).then(r => r.text())
        ]);

        BD_ACTRICES = parsearCSV(resActrices);
        BD_VIDEOS = parsearCSV(resVideos);

        generarListaActricesUnicas();
        configurarEventos();
        
        history.replaceState(obtenerEstadoActual(), "", window.location.href);

        actualizarOpcionesSelectOrdenar();
        aplicarFiltrosYRenderizar();

    } catch (error) {
        console.error("Error al inicializar:", error);
        contenedorPrincipal.innerHTML = `
            <div class="text-center py-20 px-4">
                <p class="text-red-500 font-black text-xs">❌ ERROR DE CONEXIÓN</p>
            </div>
        `;
    }
}

function generarListaActricesUnicas() {
    LISTA_ACTRICES_UNICAS = BD_ACTRICES.map(a => {
        const id = a.codigoactriz || a.codigo || a.id || "";
        const nombre = a.nombreactriz || a.actriz || "";
        const slug = a.nombreenportadas || "";
        const ultimaAct = a.ultimaactualizacion || "---";

        return {
            id: String(id).trim(),
            actriz: String(nombre).trim(),
            slug: String(slug).trim(),
            ultimaactualizacion: ultimaAct
        };
    }).filter(a => a.id !== "" && a.actriz !== "");

    LISTA_ACTRICES_UNICAS.sort((a, b) => a.actriz.localeCompare(b.actriz));
}

// FILTRADO Y RENDERIZADO
function aplicarFiltrosYRenderizar() {
    const textoBusqueda = inputBuscar.value.toLowerCase().trim();

    if (pestañaActiva === "actrices") {
        let actricesFiltradas = [...LISTA_ACTRICES_UNICAS];

        if (textoBusqueda !== "") {
            actricesFiltradas = actricesFiltradas.filter(a => a.actriz.toLowerCase().includes(textoBusqueda));
        }

        if (criterioOrden === "reciente") {
            actricesFiltradas.sort((a, b) => parsearFechaMs(b.ultimaactualizacion) - parsearFechaMs(a.ultimaactualizacion));
        } else if (criterioOrden === "antiguo") {
            actricesFiltradas.sort((a, b) => parsearFechaMs(a.ultimaactualizacion) - parsearFechaMs(b.ultimaactualizacion));
        } else if (criterioOrden === "az") {
            actricesFiltradas.sort((a, b) => a.actriz.localeCompare(b.actriz));
        } else if (criterioOrden === "za") {
            actricesFiltradas.sort((a, b) => b.actriz.localeCompare(a.actriz));
        }

        datosFiltrados = actricesFiltradas;
        renderizarListaActrices();
        renderizarPaginacion(datosFiltrados.length);
        return;
    }

    let videosFiltrados = [...BD_VIDEOS];

    // Perfil Individual de Actriz
    if (pestañaActiva === "actriz_individual" && actrizSeleccionada) {
        videosFiltrados = videosFiltrados.filter(v => {
            const rawActriz = v.codigoactriz || v.actriz || "";
            const codigos = rawActriz.split(",").map(c => c.trim());
            
            const participa = codigos.includes(String(actrizSeleccionada).trim());
            if (!participa) return false;

            if (filtroRolActriz === "individual") {
                return codigos.length === 1;
            } else if (filtroRolActriz === "colaboracion") {
                return codigos.length > 1;
            }
            return true;
        });
    } else if (pestañaActiva === "amateur") {
        videosFiltrados = videosFiltrados.filter(v => v.produccion && v.produccion.toLowerCase().trim() === "amateur");
    } else if (pestañaActiva === "subesp") { 
        videosFiltrados = videosFiltrados.filter(v => v.subtitulos && v.subtitulos.toLowerCase().trim() === "sub español");
    } else if (pestañaActiva === "mr") {
        videosFiltrados = videosFiltrados.filter(v => v.mr && (v.mr.toLowerCase().trim() === "si" || v.mr.toLowerCase().trim() === "sí"));
    } else if (pestañaActiva === "fsc") {
        videosFiltrados = videosFiltrados.filter(v => v.fsc && (v.fsc.toLowerCase().trim() === "si" || v.fsc.toLowerCase().trim() === "sí"));
    } else if (pestañaActiva === "prodprof") {
        videosFiltrados = videosFiltrados.filter(v => v.produccion && v.produccion.toLowerCase().trim() === "profesional");
    } else if (pestañaActiva === "prodext") {
        videosFiltrados = videosFiltrados.filter(v => v.produccionextranjera && (v.produccionextranjera.toLowerCase().trim() === "si" || v.produccionextranjera.toLowerCase().trim() === "sí"));
    }

    // Buscador General
    if (textoBusqueda !== "") {
        videosFiltrados = videosFiltrados.filter(v => {
            const codigoVid = v.codigovideo || v.codigo || "";
            const matchCodigo = codigoVid.toLowerCase().includes(textoBusqueda);
            const matchDesc = v.descripcion && v.descripcion.toLowerCase().includes(textoBusqueda);
            
            const actricesVid = obtenerListaActricesDeVideo(v.codigoactriz || v.actriz || "");
            const matchActriz = actricesVid.some(a => a.actriz.toLowerCase().includes(textoBusqueda));

            return matchCodigo || matchDesc || matchActriz;
        });
    }

    // Criterio de Ordenamiento
    const ordenarPorFecha = (lista, campoFecha) => {
        return lista.sort((a, b) => {
            const msA = parsearFechaMs(a[campoFecha]);
            const msB = parsearFechaMs(b[campoFecha]);
            return direccionOrden === "desc" ? msB - msA : msA - msB;
        });
    };

    if (criterioOrden === "subesp") {
        videosFiltrados = videosFiltrados.filter(v => v.subtitulos && v.subtitulos.toLowerCase().trim() === "sub español");
    } else if (criterioOrden === "mr") {
        videosFiltrados = videosFiltrados.filter(v => v.mr && (v.mr.toLowerCase().trim() === "si" || v.mr.toLowerCase().trim() === "sí"));
    } else if (criterioOrden === "fsc") {
        videosFiltrados = videosFiltrados.filter(v => v.fsc && (v.fsc.toLowerCase().trim() === "si" || v.fsc.toLowerCase().trim() === "sí"));
    } else if (criterioOrden === "amateur") {
        videosFiltrados = videosFiltrados.filter(v => v.produccion && v.produccion.toLowerCase().trim() === "amateur");
    } else if (criterioOrden === "prodprof") {
        videosFiltrados = videosFiltrados.filter(v => v.produccion && v.produccion.toLowerCase().trim() === "profesional");
    } else if (criterioOrden === "prodext") {
        videosFiltrados = videosFiltrados.filter(v => v.produccionextranjera && (v.produccionextranjera.toLowerCase().trim() === "si" || v.produccionextranjera.toLowerCase().trim() === "sí"));
    }

    if (criterioOrden === "reciente") {
        ordenarPorFecha(videosFiltrados, "fechadesubida");
    } else {
        ordenarPorFecha(videosFiltrados, "fechadeestreno");
    }

    datosFiltrados = videosFiltrados;
    renderizarCuadrículaVideos();
    renderizarPaginacion(datosFiltrados.length);
}

// NAVEGACIÓN Y PERFIL INDIVIDUAL
function irAPerfilActriz(idActriz) {
    const actrizObj = obtenerActrizPorId(idActriz);
    if (!actrizObj) return;
    
    actualizarEstadoActualSinNavegar();

    actrizSeleccionada = String(idActriz).trim();
    pestañaActiva = "actriz_individual";
    filtroRolActriz = "todos";
    paginaActual = 1;
    criterioOrden = "reciente";
    ultimoCriterioSeleccionado = "reciente";
    direccionOrden = "desc";
    inputBuscar.value = "";
    searchBarContainer.classList.add("hidden");
    actualizarPlaceholderBuscador();
    
    actualizarUIHeadernavigation();
    actualizarOpcionesSelectOrdenar();

    const nombreNorm = (actrizObj.nombreactriz || actrizObj.actriz || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/ñ/g, "n")
          .replace(/\s+/g, "_");

    history.pushState(obtenerEstadoActual(), "", `?actriz=${nombreNorm}`);

    aplicarFiltrosYRenderizar();
    window.scrollTo(0, 0);
}

// COMPONENTES DE INTERFAZ Y RENDERIZADO
function renderizarCuadrículaVideos() {
    contenedorPrincipal.innerHTML = "";

    // Sub-filtros en perfil de actriz
    if (pestañaActiva === "actriz_individual") {
        const contenedorSubFiltros = document.createElement("div");
        contenedorSubFiltros.className = "flex gap-2 mb-2 pb-1 overflow-x-auto scrollbar-none justify-center";
        
        const opciones = [
            { id: "todos", label: "Todos los Videos" },
            { id: "individual", label: "Solo Protagonista" },
            { id: "colaboracion", label: "Colaboraciones" }
        ];

        opciones.forEach(op => {
            const btn = document.createElement("button");
            const esActivo = filtroRolActriz === op.id;
            btn.className = `px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                esActivo 
                    ? `${APP_CONFIG.theme.bgAccent} text-gray-950 shadow-md` 
                    : 'bg-gray-900 text-gray-400 border border-gray-800'
            }`;
            btn.textContent = op.label;
            btn.addEventListener("click", () => {
                filtroRolActriz = op.id;
                paginaActual = 1;
                aplicarFiltrosYRenderizar();
                actualizarEstadoActualSinNavegar();
            });
            contenedorSubFiltros.appendChild(btn);
        });

        contenedorPrincipal.appendChild(contenedorSubFiltros);
    }
    
    if (datosFiltrados.length === 0) {
        const mensajeVacio = document.createElement("div");
        mensajeVacio.className = "text-center text-gray-500 py-20 text-xs font-bold tracking-wide";
        mensajeVacio.textContent = "No se encontraron videos.";
        contenedorPrincipal.appendChild(mensajeVacio);
        return;
    }

    const indiceInicio = (paginaActual - 1) * APP_CONFIG.paginationLimit;
    const indiceFin = paginaActual * APP_CONFIG.paginationLimit;
    const videosPagina = datosFiltrados.slice(indiceInicio, indiceFin);

    videosPagina.forEach(video => {
        const tarjeta = document.createElement("div");
        tarjeta.className = "bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl flex flex-col p-3 gap-2 transition-all duration-300";
        
        const codigoLimpio = video.codigovideo || video.codigo || "SIN CÓDIGO";
        const formato = video.formato || "MP4";
        const resolucion = video.resolucion || "1080p";
        const tamano = video.tamano || "GB";
        const descripcionOriginal = video.descripcion || 'Sin descripción disponible.';

        tarjeta.innerHTML = `
            <div class="flex justify-between items-center text-xs font-mono tracking-wide w-full px-0.5">
                <span class="${APP_CONFIG.theme.textAccent} font-black uppercase text-xs">[${codigoLimpio}]</span>
                <span class="text-gray-400 font-bold text-[11px]">${formato} ${resolucion} / ${tamano}</span>
            </div>

            <div class="portada-contenedor block w-full group relative cursor-pointer">
                <div class="relative bg-gray-950 aspect-[1.5/1] w-full flex items-center justify-center overflow-hidden rounded-lg border border-gray-800">
                    <img src="portadas/vid/${codigoLimpio}.jpg" 
                         onerror="this.src='portadas/vid/${codigoLimpio}.png'; this.onerror=()=>this.src='https://placehold.co/600x400/111827/4b5563?text=${codigoLimpio}'" 
                         class="w-full h-full object-cover">
                    
                    <div class="absolute inset-0 flex items-center justify-center transition-colors duration-300">
                        <a href="${video.url || '#'}" target="_blank" class="play-trigger w-12 h-12 flex items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:scale-110 active:scale-95 transition-transform duration-300 pl-0.5 z-20">
                            <svg class="w-6 h-6 fill-white pointer-events-none" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>

            <div class="bloque-descripcion pt-1 relative">
                <p class="texto-descripcion text-xs text-gray-300 font-medium leading-relaxed lineas-limitadas-2" id="texto-desc-${codigoLimpio}">
                    <span class="contenedor-flotante-ver-mas" id="wrapper-flotante-${codigoLimpio}">
                        <span class="text-gray-300 text-xs font-medium mr-1 select-none font-sans">...</span>
                        <button class="btn-toggle-desc ${APP_CONFIG.theme.textAccent} font-black text-[10px] uppercase tracking-wider hover:underline focus:outline-none">
                            ver más
                        </button>
                    </span>
                    ${descripcionOriginal}
                </p>
                <div id="meta-expandido-${codigoLimpio}" class="hidden flex flex-col gap-2 pt-2 border-t border-gray-800/60 mt-2"></div>
            </div>
        `;

        const textoDesc = tarjeta.querySelector(`#texto-desc-${codigoLimpio}`);
        const wrapperFlotante = tarjeta.querySelector(`#wrapper-flotante-${codigoLimpio}`);
        const metaExpandido = tarjeta.querySelector(`#meta-expandido-${codigoLimpio}`);
        const portadaContenedor = tarjeta.querySelector(`.portada-contenedor`);
        const playTrigger = tarjeta.querySelector(`.play-trigger`);

        playTrigger.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        function conmutarEstado() {
            const estaExpandido = !metaExpandido.classList.contains("hidden");

            if (estaExpandido) {
                metaExpandido.classList.add("hidden");
                metaExpandido.innerHTML = ""; 
                tarjeta.className = "bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl flex flex-col p-3 gap-2 transition-all duration-300";
                textoDesc.className = "texto-descripcion text-xs text-gray-300 font-medium leading-relaxed lineas-limitadas-2";
                wrapperFlotante.classList.remove("hidden");
            } else {
                tarjeta.className = "bg-gray-900 border-2 border-red-600/50 rounded-xl overflow-hidden shadow-xl flex flex-col p-3 gap-2 transition-all duration-300";
                textoDesc.className = "texto-descripcion text-xs text-gray-300 font-medium lineas-expandidas";
                wrapperFlotante.classList.add("hidden");

                // Renderizado dinámico de enlaces a actrices
                const actricesVinculadas = obtenerListaActricesDeVideo(video.codigoactriz || video.actriz || "");
                let htmlActrices = "";

                if (actricesVinculadas.length > 0) {
                    htmlActrices = actricesVinculadas.map(a => `
                        <a href="#" data-id-actriz="${a.id}" class="link-actriz inline-block text-base font-black ${APP_CONFIG.theme.textAccent} ${APP_CONFIG.theme.textAccentHover} hover:underline transition-colors tracking-wide uppercase py-0.5">
                            ${a.actriz}
                        </a>
                    `).join('<span class="text-gray-500 font-bold mx-1">,</span>');
                } else {
                    htmlActrices = `<span class="text-gray-400 font-bold">Desconocida</span>`;
                }

                metaExpandido.innerHTML = `
                    <div class="flex flex-col gap-1.5 text-xs">
                        <div class="flex flex-wrap items-center">
                            ${htmlActrices}
                        </div>
                        <div class="flex flex-col gap-0.5">
                            <p><span class="${APP_CONFIG.theme.textAccent} font-bold">Fecha de subida:</span> <span class="text-white">${video.fechadesubida || '---'}</span></p>
                            <p><span class="${APP_CONFIG.theme.textAccent} font-bold">Fecha de estreno:</span> <span class="text-white">${video.fechadeestreno || '---'}</span></p>
                        </div>
                    </div>
                    <div class="w-full text-right mt-1">
                        <button class="btn-toggle-desc ${APP_CONFIG.theme.textAccent} font-black text-[10px] uppercase tracking-wider hover:underline focus:outline-none">
                            ocultar
                        </button>
                    </div>
                `;

                metaExpandido.querySelectorAll(".link-actriz").forEach(link => {
                    link.addEventListener("click", (el) => {
                        el.preventDefault();
                        el.stopPropagation();
                        const idAct = el.currentTarget.getAttribute("data-id-actriz");
                        irAPerfilActriz(idAct);
                    });
                });

                metaExpandido.classList.remove("hidden");
            }
        }

        let clicksPortada = 0;
        let timerPortada = null;

        portadaContenedor.addEventListener("click", (e) => {
            if (e.target.closest(".play-trigger")) return;

            clicksPortada++;

            if (clicksPortada === 1) {
                timerPortada = setTimeout(() => {
                    clicksPortada = 0;
                    conmutarEstado();
                }, 250);
            } else if (clicksPortada === 2) {
                clearTimeout(timerPortada);
                clicksPortada = 0;
                
                const actricesVinculadas = obtenerListaActricesDeVideo(video.codigoactriz || video.actriz || "");
                if (actricesVinculadas.length > 0) {
                    irAPerfilActriz(actricesVinculadas[0].id);
                }
            }
        });

        tarjeta.addEventListener("click", (e) => {
            if (e.target.classList.contains("btn-toggle-desc") || e.target.closest(".btn-toggle-desc")) {
                conmutarEstado();
            }
        });

        contenedorPrincipal.appendChild(tarjeta);
    });
}

function renderizarListaActrices() {
    contenedorPrincipal.innerHTML = "";

    if (datosFiltrados.length === 0) {
        contenedorPrincipal.innerHTML = `<div class="text-center text-gray-500 py-20 text-xs font-bold tracking-wide">No se encontraron actrices.</div>`;
        return;
    }

    const indiceInicio = (paginaActual - 1) * APP_CONFIG.paginationLimit;
    const indiceFin = paginaActual * APP_CONFIG.paginationLimit;
    const actricesPagina = datosFiltrados.slice(indiceInicio, indiceFin);

    const gridActrices = document.createElement("div");
    gridActrices.className = "grid grid-cols-2 gap-3 w-full";

    actricesPagina.forEach(actrizObj => {
        const item = document.createElement("div");
        item.className = "bg-gray-900 border border-gray-800 rounded-xl p-1.5 flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-transform shadow-md";
        
        let nombreLimpio = actrizObj.slug;
        if (!nombreLimpio) {
            nombreLimpio = actrizObj.actriz 
                ? actrizObj.actriz.toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/ñ/g, "n")
                      .replace(/\s+/g, "_") 
                : "default";
        }

        item.innerHTML = `
            <div class="w-full aspect-[1/1.3333] rounded-lg bg-gray-950 border border-gray-800 overflow-hidden shadow">
                <img src="portadas/act/${nombreLimpio}.jpg" 
                     onerror="this.src='portadas/act/${nombreLimpio}.png'; this.onerror=()=>this.src='https://placehold.co/300x400/111827/ffffff?text=${actrizObj.actriz.charAt(0)}'" 
                     class="w-full h-full object-cover">
            </div>
            <h4 class="text-xs font-black text-gray-100 truncate w-full px-1 tracking-wide mt-1.5 uppercase">${actrizObj.actriz}</h4>
        `;
        
        item.addEventListener("click", () => {
            irAPerfilActriz(actrizObj.id);
        });

        gridActrices.appendChild(item);
    });

    contenedorPrincipal.appendChild(gridActrices);
}

function renderizarPaginacion(totalElementos) {
    contenedorPaginacion.innerHTML = "";
    const totalPaginas = Math.ceil(totalElementos / APP_CONFIG.paginationLimit);

    if (totalPaginas <= 1) return;

    for (let i = 1; i <= totalPaginas; i++) {
        const botonPagina = document.createElement("button");
        botonPagina.textContent = i;
        botonPagina.className = `w-8 h-8 rounded-lg text-xs font-black transition-all active:scale-90 ${paginaActual === i ? `${APP_CONFIG.theme.bgAccent} text-gray-950 shadow-md scale-105` : 'bg-gray-900 text-gray-400 border border-gray-800'}`;
        
        botonPagina.addEventListener("click", () => {
            actualizarEstadoActualSinNavegar();

            paginaActual = i;
            
            let nuevaUrl = `?p=${i}`;
            if (pestañaActiva === "actriz_individual" && actrizSeleccionada) {
                const actrizObj = obtenerActrizPorId(actrizSeleccionada);
                const nombreNorm = (actrizObj ? (actrizObj.nombreactriz || actrizObj.actriz) : "")
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/ñ/g, "n")
                    .replace(/\s+/g, "_");
                nuevaUrl = `?actriz=${nombreNorm}&p=${i}`;
            } else if (pestañaActiva !== "todos") {
                nuevaUrl = `?tab=${pestañaActiva}&p=${i}`;
            }

            history.pushState(obtenerEstadoActual(), "", nuevaUrl);

            if (pestañaActiva === "actrices") {
                renderizarListaActrices();
            } else {
                renderizarCuadrículaVideos();
            }
            renderizarPaginacion(totalElementos);
            window.scrollTo(0, 0);
        });

        contenedorPaginacion.appendChild(botonPagina);
    }
}

// EVENTOS DE NAVEGACIÓN Y CABECERA
function actualizarUIHeadernavigation() {
    const headerElement = document.querySelector("header");

    if (pestañaActiva === "actriz_individual") {
        if (headerElement) headerElement.classList.remove("border-b", "border-gray-800");

        vistaGeneralCabecera.classList.add("hidden");
        vistaActrizCabecera.classList.remove("hidden");
        
        const actrizObj = obtenerActrizPorId(actrizSeleccionada);
        const nombreMostrar = actrizObj ? (actrizObj.nombreactriz || actrizObj.actriz) : 'Actriz';

        if (nombreActrizTitulo) {
            nombreActrizTitulo.textContent = `${nombreMostrar}`;
        }

        let nombreLimpio = actrizObj ? (actrizObj.nombreenportadas || "") : "";
        if (!nombreLimpio) {
            nombreLimpio = nombreMostrar
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/ñ/g, "n")
                .replace(/\s+/g, "_");
        }

        const imgCabecera = document.getElementById("imagen-actriz-cabecera");
        if (imgCabecera) {
            imgCabecera.src = `portadas/act/${nombreLimpio}.jpg`;
            imgCabecera.onerror = () => {
                imgCabecera.src = `portadas/act/${nombreLimpio}.png`;
                imgCabecera.onerror = () => { imgCabecera.src = ''; };
            };
        }

        // Historial de Nombres
        let tieneHistorial = false;
        let listaNombresHistorial = [];

        if (actrizObj) {
            const columnasNombres = ["nombre1", "nombre2", "nombre3", "nombre4", "nombre5"];
            columnasNombres.forEach(col => {
                if (actrizObj[col] && actrizObj[col].trim() !== "" && actrizObj[col].trim() !== "---") {
                    listaNombresHistorial.push(actrizObj[col].trim());
                    tieneHistorial = true;
                }
            });
        }

        if (tieneHistorial) {
            btnNombresAntiguos.classList.remove("hidden");
            btnNombresAntiguos.classList.add("flex");
            btnNombresAntiguos.dataset.historial = JSON.stringify(listaNombresHistorial);
        } else {
            btnNombresAntiguos.classList.remove("flex");
            btnNombresAntiguos.classList.add("hidden");
        }
        
    } else {
        if (headerElement) headerElement.classList.add("border-b", "border-gray-800");
        
        vistaGeneralCabecera.classList.remove("hidden");
        vistaActrizCabecera.classList.add("hidden");
        contenedorPestanasNav.classList.remove("hidden");

        document.querySelectorAll(".tab-item").forEach(b => {
            const tabAttr = b.getAttribute("data-tab");
            if (!tabAttr && pestañaActiva === "todos") {
                b.className = `tab-item px-4 py-2 rounded-full text-sm font-bold ${APP_CONFIG.theme.bgAccent} text-gray-950 shadow transition-all active:scale-95 flex items-center justify-center`;
            } else if (tabAttr === pestañaActiva) {
                b.className = `tab-item px-5 py-2 rounded-full text-sm font-bold ${APP_CONFIG.theme.bgAccent} text-gray-950 shadow transition-all active:scale-95`;
            } else {
                b.className = "tab-item px-5 py-2 rounded-full text-sm font-bold bg-gray-800 text-gray-300 border border-gray-700 active:scale-95";
            }
        });
    }
}

function actualizarOpcionesSelectOrdenar() {
    selectOrdenar.innerHTML = "";

    if (pestañaActiva === "actrices") {
        selectOrdenar.innerHTML = `
            <option value="reciente" class="bg-gray-900 text-white">Recién Actualizado</option>
            <option value="antiguo" class="bg-gray-900 text-white">Más Antiguos</option>
            <option value="az" class="bg-gray-900 text-white">Alfabético A-Z</option>
            <option value="za" class="bg-gray-900 text-white">Alfabético Z-A</option>
        `;
    } else if (pestañaActiva === "actriz_individual") {
        selectOrdenar.innerHTML = `
            <option value="reciente" class="bg-gray-900 text-white">Fecha de Subida</option>
            <option value="estreno" class="bg-gray-900 text-white">Fecha de Estreno</option>
            <option value="subesp" class="bg-gray-900 text-white">SubEsp</option>
            <option value="mr" class="bg-gray-900 text-white">MR (Mosaico Removido)</option>
            <option value="fsc" class="bg-gray-900 text-white">FSC (Fuga sin Censura)</option>
            <option value="amateur" class="bg-gray-900 text-white">Amateur</option>
            <option value="prodprof" class="bg-gray-900 text-white">Producción Profesional</option>
            <option value="prodext" class="bg-gray-900 text-white">Producción Extranjera</option>
        `;
    } else {
        selectOrdenar.innerHTML = `
            <option value="reciente" class="bg-gray-900 text-white">Fecha de Subida</option>
            <option value="estreno" class="bg-gray-900 text-white">Fecha de Estreno</option>
        `;
    }
    
    selectOrdenar.value = criterioOrden;
}

function actualizarPlaceholderBuscador() {
    inputBuscar.placeholder = pestañaActiva === "actrices" ? "Buscar actriz..." : "Buscar...";
}

function resetearAInicio() {
    pestañaActiva = "todos";
    actrizSeleccionada = null;
    filtroRolActriz = "todos";
    paginaActual = 1;
    criterioOrden = "reciente";
    ultimoCriterioSeleccionado = "reciente";
    direccionOrden = "desc";
    inputBuscar.value = "";
    searchBarContainer.classList.add("hidden");
    actualizarPlaceholderBuscador();
    
    document.body.classList.remove("modal-abierto");
    if (modalAyuda) modalAyuda.classList.add("hidden");
    if (modalWhatsapp) modalWhatsapp.classList.add("hidden");
    
    actualizarUIHeadernavigation();
    actualizarOpcionesSelectOrdenar();

    contenedorPestanasNav.scrollLeft = 0;

    history.pushState(obtenerEstadoActual(), "", window.location.pathname);
    
    aplicarFiltrosYRenderizar();
    window.scrollTo(0, 0);
}

function configurarEventos() {
    document.querySelectorAll(".tab-item").forEach(boton => {
        boton.addEventListener("click", (e) => {
            const tabTarget = e.currentTarget.getAttribute("data-tab");
            
            if (!tabTarget) {
                resetearAInicio();
                return;
            }

            if (tabTarget === "ayuda") {
                if (pestañaActiva === "ayuda") return;
                
                actualizarEstadoActualSinNavegar();
                document.body.classList.add("modal-abierto");
                modalAyuda.classList.remove("hidden");
                
                history.pushState(Object.assign(obtenerEstadoActual(), { modalAbierto: "ayuda" }), "");
                return; 
            }

            actualizarEstadoActualSinNavegar();

            pestañaActiva = tabTarget;
            actrizSeleccionada = null;
            filtroRolActriz = "todos";
            paginaActual = 1;
            criterioOrden = "reciente";
            ultimoCriterioSeleccionado = "reciente";
            direccionOrden = "desc";
            
            searchBarContainer.classList.add("hidden");
            inputBuscar.value = "";
            actualizarPlaceholderBuscador();
            actualizarUIHeadernavigation();
            actualizarOpcionesSelectOrdenar();

            history.pushState(obtenerEstadoActual(), "", `?tab=${pestañaActiva}`);

            aplicarFiltrosYRenderizar();
            window.scrollTo(0, 0);
        });
    });

    btnCatCen.addEventListener("click", () => resetearAInicio());
    mainTitle.addEventListener("click", () => resetearAInicio());
    
    const actrizMainTitle = document.getElementById("actriz-main-title");
    if (actrizMainTitle) {
        actrizMainTitle.addEventListener("click", () => resetearAInicio());
    }

    inputBuscar.addEventListener("input", () => {
        paginaActual = 1;
        aplicarFiltrosYRenderizar();
        actualizarEstadoActualSinNavegar();
    });

    let desplegableAbierto = false;
    let opcionAlAbrir = selectOrdenar.value;

    selectOrdenar.addEventListener("focus", () => {
        desplegableAbierto = true;
        opcionAlAbrir = selectOrdenar.value;
    });

    selectOrdenar.addEventListener("pointerdown", () => {
        desplegableAbierto = true;
        opcionAlAbrir = selectOrdenar.value;
    });

    function procesarSeleccionOrden(opcionElegida) {
        if (opcionElegida === ultimoCriterioSeleccionado) {
            direccionOrden = (direccionOrden === "desc") ? "asc" : "desc";
        } else {
            direccionOrden = "desc";
            ultimoCriterioSeleccionado = opcionElegida;
        }

        criterioOrden = opcionElegida;
        paginaActual = 1;
        aplicarFiltrosYRenderizar();
        window.scrollTo(0, 0);
        
        actualizarEstadoActualSinNavegar();
    }

    selectOrdenar.addEventListener("change", (e) => {
        procesarSeleccionOrden(e.target.value);
        desplegableAbierto = false;
    });

    selectOrdenar.addEventListener("click", () => {
        if (desplegableAbierto) {
            desplegableAbierto = false;
            return;
        }

        if (selectOrdenar.value === opcionAlAbrir && selectOrdenar.value === ultimoCriterioSeleccionado) {
            procesarSeleccionOrden(selectOrdenar.value);
        }
    });

    btnVolverActrices.addEventListener("click", () => {
        resetearAInicio();
    });

    btnCabeceraActrices.addEventListener("click", () => {
        actualizarEstadoActualSinNavegar();

        pestañaActiva = "actrices";
        actrizSeleccionada = null;
        filtroRolActriz = "todos";
        paginaActual = 1;
        criterioOrden = "reciente";
        ultimoCriterioSeleccionado = "reciente";
        direccionOrden = "desc";
        
        searchBarContainer.classList.add("hidden");
        inputBuscar.value = "";
        actualizarPlaceholderBuscador();
        actualizarUIHeadernavigation();

        contenedorPestanasNav.scrollLeft = 0;

        actualizarOpcionesSelectOrdenar();

        history.pushState(obtenerEstadoActual(), "", `?tab=${pestañaActiva}`);

        aplicarFiltrosYRenderizar();
        window.scrollTo(0, 0);
    });

    function cerrarModalWhatsapp() {
        if (history.state && history.state.modalAbierto === "whatsapp") {
            history.back();
        } else {
            document.body.classList.remove("modal-abierto");
            modalWhatsapp.classList.add("hidden");
        }
    }

    btnFooterWhatsapp.addEventListener("click", () => {
        actualizarEstadoActualSinNavegar();
        document.body.classList.add("modal-abierto");
        modalWhatsapp.classList.remove("hidden");
        history.pushState(Object.assign(obtenerEstadoActual(), { modalAbierto: "whatsapp" }), "");
    });

    btnCerrarModal.addEventListener("click", cerrarModalWhatsapp);
    modalWhatsapp.addEventListener("click", (e) => {
        if (e.target === modalWhatsapp) cerrarModalWhatsapp();
    });

    btnFooterSearch.addEventListener("click", () => {
        searchBarContainer.classList.toggle("hidden");
        if (!searchBarContainer.classList.contains("hidden")) {
            actualizarPlaceholderBuscador();
            
            const header = document.querySelector("header");
            const headerHeight = header ? header.offsetHeight : 0;
            const mainElement = document.querySelector("main");
            const mainTop = mainElement ? mainElement.getBoundingClientRect().top + window.pageYOffset : 0;
            
            window.scrollTo({
                top: mainTop - headerHeight,
                behavior: "auto"
            });
    
            inputBuscar.focus({ preventScroll: true });
        }
        actualizarEstadoActualSinNavegar();
    });

    function cerrarGlosarioAyuda() {
        if (history.state && history.state.modalAbierto === "ayuda") {
            history.back();
        } else {
            document.body.classList.remove("modal-abierto");
            modalAyuda.classList.add("hidden");
        }
    }

    if (btnCerrarAyuda) btnCerrarAyuda.addEventListener("click", cerrarGlosarioAyuda);
    if (btnEntendidoAyuda) btnEntendidoAyuda.addEventListener("click", cerrarGlosarioAyuda);
    if (modalAyuda) {
        modalAyuda.addEventListener("click", (e) => {
            if (e.target === modalAyuda) cerrarGlosarioAyuda();
        });
    }

    const modalNombres = document.getElementById("modal-nombres-antiguos");
    const btnCerrarModalNombres = document.getElementById("btn-cerrar-modal-nombres");
    const btnEntendidoNombres = document.getElementById("btn-entendido-nombres");
    const contenedorListaNombres = document.getElementById("lista-nombres-antiguos-contenedor");

    btnNombresAntiguos.addEventListener("click", () => {
        if (!btnNombresAntiguos.dataset.historial) return;

        const listaNombres = JSON.parse(btnNombresAntiguos.dataset.historial);
        contenedorListaNombres.innerHTML = ""; 

        listaNombres.forEach((celdaTexto) => {
            const variantes = celdaTexto.split(",").map(v => v.trim());
            const romanizacion = (variantes[0] && variantes[0] !== "---") ? variantes[0] : "";
            const kanji = (variantes[1] && variantes[1] !== "---") ? variantes[1] : "";
            const tonalidad = (variantes[2] && variantes[2] !== "---") ? variantes[2] : "";

            const bloqueNombre = document.createElement("div");
            bloqueNombre.className = "bg-gray-950/60 border border-gray-800 rounded-xl p-3 flex flex-col gap-1";

            let htmlInterno = "";

            if (romanizacion) {
                htmlInterno += `<div class="text-base font-black text-white tracking-wide">${romanizacion}</div>`;
            }

            if (kanji || tonalidad) {
                htmlInterno += `<div class="flex justify-between items-center text-sm mt-1">`;
                if (kanji) {
                    htmlInterno += `<span class="${APP_CONFIG.theme.textAccent} font-bold font-sans">${kanji}</span>`;
                } else {
                    htmlInterno += `<span></span>`;
                }
                if (tonalidad) {
                    htmlInterno += `<span class="text-gray-300 font-medium text-xs font-sans">${tonalidad}</span>`;
                }
                htmlInterno += `</div>`;
            }

            bloqueNombre.innerHTML = htmlInterno;
            contenedorListaNombres.appendChild(bloqueNombre);
        });

        document.body.classList.add("modal-abierto");
        modalNombres.classList.remove("hidden");
        
        actualizarEstadoActualSinNavegar();
        history.pushState(Object.assign(obtenerEstadoActual(), { modalAbierto: "nombres" }), "");
    });

    function cerrarModalNombres() {
        if (history.state && history.state.modalAbierto === "nombres") {
            history.back();
        } else {
            document.body.classList.remove("modal-abierto");
            modalNombres.classList.add("hidden");
        }
    }

    if (btnCerrarModalNombres) btnCerrarModalNombres.addEventListener("click", cerrarModalNombres);
    if (btnEntendidoNombres) btnEntendidoNombres.addEventListener("click", cerrarModalNombres);
    if (modalNombres) {
        modalNombres.addEventListener("click", (e) => {
            if (e.target === modalNombres) cerrarModalNombres();
        });
    }

    // CONTROL DE NAVEGACIÓN SWIPE
    let touchStartX = 0;
    let touchStartY = 0;

    contenedorPrincipal.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    contenedorPrincipal.addEventListener("touchend", (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;

        const diferenciaX = touchEndX - touchStartX;
        const diferenciaY = touchEndY - touchStartY;

        const UMBRAL_SWIPE = 60;

        if (Math.abs(diferenciaX) > Math.abs(diferenciaY) && Math.abs(diferenciaX) > UMBRAL_SWIPE) {
            const totalPaginas = Math.ceil(datosFiltrados.length / APP_CONFIG.paginationLimit);
            if (totalPaginas <= 1) return;

            let cambioPagina = false;

            if (diferenciaX < 0 && paginaActual < totalPaginas) {
                paginaActual++;
                cambioPagina = true;
            } else if (diferenciaX > 0 && paginaActual > 1) {
                paginaActual--;
                cambioPagina = true;
            }

            if (cambioPagina) {
                actualizarEstadoActualSinNavegar();

                let nuevaUrl = `?p=${paginaActual}`;
                if (pestañaActiva === "actriz_individual" && actrizSeleccionada) {
                    const actrizObj = obtenerActrizPorId(actrizSeleccionada);
                    const nombreNorm = (actrizObj ? (actrizObj.nombreactriz || actrizObj.actriz) : "")
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/ñ/g, "n")
                        .replace(/\s+/g, "_");
                    nuevaUrl = `?actriz=${nombreNorm}&p=${paginaActual}`;
                } else if (pestañaActiva !== "todos") {
                    nuevaUrl = `?tab=${pestañaActiva}&p=${paginaActual}`;
                }

                history.pushState(obtenerEstadoActual(), "", nuevaUrl);

                if (pestañaActiva === "actrices") {
                    renderizarListaActrices();
                } else {
                    renderizarCuadrículaVideos();
                }
                renderizarPaginacion(datosFiltrados.length);
                window.scrollTo(0, 0);
            }
        }
    }, { passive: true });
}

window.addEventListener("popstate", (evento) => {
    document.body.classList.remove("modal-abierto");
    if (modalAyuda) modalAyuda.classList.add("hidden");
    if (modalWhatsapp) modalWhatsapp.classList.add("hidden");
    const modalNombres = document.getElementById("modal-nombres-antiguos");
    if (modalNombres) modalNombres.classList.add("hidden");

    if (evento && evento.state) {
        restaurarEstado(evento.state);
    } else {
        resetearAInicio();
    }
});

window.addEventListener("DOMContentLoaded", inicializarApp);
