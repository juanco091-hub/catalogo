const CONFIG = {
    urlSheetsActrices: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQX-IQxtjDJYB9gOVeoRDLeYCwpBYlmBSBHEPuPxgPL_xlZ1IUHvvyhZ7rgKvq6uMRwrlKESlBmHEjS/pub?gid=0&single=true&output=csv",
    urlSheetsVideos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQX-IQxtjDJYB9gOVeoRDLeYCwpBYlmBSBHEPuPxgPL_xlZ1IUHvvyhZ7rgKvq6uMRwrlKESlBmHEjS/pub?gid=1597144864&single=true&output=csv"
};

let BD_ACTRICES = []; 
let BD_VIDEOS = [];
let LISTA_ACTRICES_UNICAS = []; 
let datosFiltrados = []; 

let pestañaActiva = "todos"; 
let actrizSeleccionada = null; 
let paginaActual = 1;
const LIMITE_POR_PAGINA = 20; 
let criterioOrden = "reciente"; 

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

let pestanaPreviaAyuda = "todos";
const modalAyuda = document.getElementById("modal-ayuda");
const btnCerrarAyuda = document.getElementById("btn-cerrar-ayuda");
const btnEntendidoAyuda = document.getElementById("btn-entendido-ayuda");

async function inicializarApp() {
    try {
        contenedorPrincipal.innerHTML = `
            <div class="flex flex-col items-center justify-center py-24 text-center gap-3">
                <div class="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-xs font-bold text-gray-400 tracking-wide">Cargando base de datos...</p>
            </div>
        `;
        
        const [resActrices, resVideos] = await Promise.all([
            fetch(CONFIG.urlSheetsActrices).then(r => r.text()),
            fetch(CONFIG.urlSheetsVideos).then(r => r.text())
        ]);

        BD_ACTRICES = parsearCSV(resActrices);
        BD_VIDEOS = parsearCSV(resVideos);

        generarListaActricesUnicas();
        configurarEventos();
        
        history.replaceState({ 
            pestana: "todos", 
            pagina: 1, 
            actriz: null 
        }, "", window.location.pathname);

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

window.addEventListener("popstate", (evento) => {
    if (pestañaActiva === "ayuda") {
        document.body.classList.remove("modal-abierto");
        modalAyuda.classList.add("hidden");
        pestañaActiva = pestanaPreviaAyuda;
        actualizarUIHeadernavigation();
        return;
    }

    if (evento && evento.state) {
        pestañaActiva = evento.state.pestana || "todos";
        paginaActual = evento.state.pagina || 1;
        actrizSeleccionada = evento.state.actriz || null;
        
        document.body.classList.remove("modal-abierto");
        modalAyuda.classList.add("hidden");
        modalWhatsapp.classList.add("hidden");

        actualizarUIHeadernavigation();
        actualizarOpcionesSelectOrdenar();
        aplicarFiltrosYRenderizar(); 
    } else {
        resetearAInicio();
    }
});

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

function generarListaActricesUnicas() {
    const mapaActrices = {};
    BD_ACTRICES.forEach(a => {
        if (a.actriz) {
            mapaActrices[a.actriz.trim()] = a.ultimaactualizacion || "---";
        }
    });

    const setActrices = new Set();
    BD_VIDEOS.forEach(v => {
        if (v.actriz && v.actriz.trim() !== "" && v.actriz.toLowerCase() !== "desconocida") {
            setActrices.add(v.actriz.trim());
        }
    });

    LISTA_ACTRICES_UNICAS = Array.from(setActrices).map(nombre => {
        return {
            actriz: nombre,
            ultimaactualizacion: mapaActrices[nombre] || "---"
        };
    });

    LISTA_ACTRICES_UNICAS.sort((a, b) => a.actriz.localeCompare(b.actriz));
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
                
                pestanaPreviaAyuda = pestañaActiva; 
                pestañaActiva = "ayuda";
                
                document.body.classList.add("modal-abierto");
                modalAyuda.classList.remove("hidden");
                actualizarUIHeadernavigation();
                history.pushState({ pestana: "ayuda" }, "", window.location.pathname);
                return; 
            }

            pestañaActiva = tabTarget;
            actrizSeleccionada = null;
            paginaActual = 1;
            
            searchBarContainer.classList.add("hidden");
            inputBuscar.value = "";
            actualizarPlaceholderBuscador();
            actualizarUIHeadernavigation();
            actualizarOpcionesSelectOrdenar();

            history.pushState({ 
                pestana: pestañaActiva, 
                pagina: 1, 
                actriz: null 
            }, "", `?tab=${pestañaActiva}`);

            aplicarFiltrosYRenderizar();
            window.scrollTo(0, 0);
        });
    });

    btnCatCen.addEventListener("click", () => resetearAInicio());
    mainTitle.addEventListener("click", () => resetearAInicio());

    inputBuscar.addEventListener("input", () => {
        paginaActual = 1;
        aplicarFiltrosYRenderizar();
    });

    selectOrdenar.addEventListener("change", (e) => {
        criterioOrden = e.target.value;
        paginaActual = 1;
        aplicarFiltrosYRenderizar();
        window.scrollTo(0, 0);
    });

    btnVolverActrices.addEventListener("click", () => {
        resetearAInicio();
    });

    modalWhatsapp.addEventListener("click", (e) => {
        if (e.target === modalWhatsapp) {
            document.body.classList.remove("modal-abierto");
            modalWhatsapp.classList.add("hidden");
        }
    });
    btnFooterWhatsapp.addEventListener("click", () => {
        document.body.classList.add("modal-abierto");
        modalWhatsapp.classList.remove("hidden");
    });
    btnCerrarModal.addEventListener("click", () => {
        document.body.classList.remove("modal-abierto");
        modalWhatsapp.classList.add("hidden");
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
    });

    function cerrarGlosarioAyuda() {
        document.body.classList.remove("modal-abierto");
        modalAyuda.classList.add("hidden");
        pestañaActiva = pestanaPreviaAyuda; 
        actualizarUIHeadernavigation(); 
            
        if (history.state && history.state.pestana === "ayuda") {
            history.back();
        }
    }

    btnCerrarAyuda.addEventListener("click", cerrarGlosarioAyuda);
    btnEntendidoAyuda.addEventListener("click", cerrarGlosarioAyuda);
    modalAyuda.addEventListener("click", (e) => {
        if (e.target === modalAyuda) cerrarGlosarioAyuda();
    });
}

function actualizarPlaceholderBuscador() {
    inputBuscar.placeholder = pestañaActiva === "actrices" ? "Buscar actriz..." : "Buscar...";
}

function resetearAInicio() {
    pestañaActiva = "todos";
    actrizSeleccionada = null;
    paginaActual = 1;
    criterioOrden = "reciente";
    inputBuscar.value = "";
    searchBarContainer.classList.add("hidden");
    actualizarPlaceholderBuscador();
    
    document.body.classList.remove("modal-abierto");
    modalAyuda.classList.add("hidden");
    modalWhatsapp.classList.add("hidden");
    
    actualizarUIHeadernavigation();
    actualizarOpcionesSelectOrdenar();

    contenedorPestanasNav.scrollLeft = 0;

    history.pushState({ pestana: "todos", pagina: 1, actriz: null }, "", window.location.pathname);
    
    aplicarFiltrosYRenderizar();
    window.scrollTo(0, 0);
}

function actualizarUIHeadernavigation() {
    if (pestañaActiva === "actriz_individual") {
        contenedorPestanasNav.classList.add("hidden");
        vistaActrizCabecera.classList.remove("hidden");
        nombreActrizTitulo.textContent = `${actrizSeleccionada}`;
    } else {
        contenedorPestanasNav.classList.remove("hidden");
        vistaActrizCabecera.classList.add("hidden");

        document.querySelectorAll(".tab-item").forEach(b => {
            const tabAttr = b.getAttribute("data-tab");
            if (!tabAttr && pestañaActiva === "todos") {
                b.className = "tab-item px-4 py-2 rounded-full text-sm font-bold bg-red-600 text-white shadow transition-all active:scale-95 flex items-center justify-center";
            } else if (tabAttr === pestañaActiva) {
                b.className = "tab-item px-5 py-2 rounded-full text-sm font-bold bg-red-600 text-white shadow transition-all active:scale-95";
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
            <option value="amateur" class="bg-gray-900 text-white">Amateur</option>
            <option value="prodprof" class="bg-gray-900 text-white">Producción Profesional</option>
            <option value="prodext" class="bg-gray-900 text-white">Producción Extranjera</option>
            <option value="vpf" class="bg-gray-900 text-white">VPF</option>
        `;
    } else {
        selectOrdenar.innerHTML = `
            <option value="reciente" class="bg-gray-900 text-white">Fecha de Subida</option>
            <option value="estreno" class="bg-gray-900 text-white">Fecha de Estreno</option>
        `;
    }
    criterioOrden = "reciente";
}

function aplicarFiltrosYRenderizar() {
    const textoBusqueda = inputBuscar.value.toLowerCase().trim();

    if (pestañaActiva === "actrices") {
        let actricesFiltradas = [...LISTA_ACTRICES_UNICAS];

        if (textoBusqueda !== "") {
            actricesFiltradas = actricesFiltradas.filter(a => a.actriz && a.actriz.toLowerCase().includes(textoBusqueda));
        }

        if (criterioOrden === "reciente") {
            actricesFiltradas.sort((a, b) => new Date(b.ultimaactualizacion) - new Date(a.ultimaactualizacion));
        } else if (criterioOrden === "antiguo") {
            actricesFiltradas.sort((a, b) => new Date(a.ultimaactualizacion) - new Date(b.ultimaactualizacion));
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

    if (pestañaActiva === "actriz_individual" && actrizSeleccionada) {
        videosFiltrados = videosFiltrados.filter(v => v.actriz && v.actriz.toLowerCase().trim() === actrizSeleccionada.toLowerCase().trim());
    } else if (pestañaActiva === "amateur") {
        videosFiltrados = videosFiltrados.filter(v => v.produccion && v.produccion.toLowerCase().trim() === "amateur");
    } else if (pestañaActiva === "subesp") { 
        videosFiltrados = videosFiltrados.filter(v => v.subtitulos && v.subtitulos.toLowerCase().trim() === "sub español");
    } else if (pestañaActiva === "prodprof") {
        videosFiltrados = videosFiltrados.filter(v => v.produccion && v.produccion.toLowerCase().trim() === "profesional");
    } else if (pestañaActiva === "prodext") {
        videosFiltrados = videosFiltrados.filter(v => v.produccionextranjera && (v.produccionextranjera.toLowerCase().trim() === "si" || v.produccionextranjera.toLowerCase().trim() === "sí"));
    } else if (pestañaActiva === "vpf") {
        videosFiltrados = videosFiltrados.filter(v => v.vpf && (v.vpf.toLowerCase().trim() === "si" || v.vpf.toLowerCase().trim() === "sí"));
    }

    if (textoBusqueda !== "") {
        videosFiltrados = videosFiltrados.filter(v => {
            const matchCodigo = v.codigo && v.codigo.toLowerCase().includes(textoBusqueda);
            const matchActriz = v.actriz && v.actriz.toLowerCase().includes(textoBusqueda);
            const matchDesc = v.descripcion && v.descripcion.toLowerCase().includes(textoBusqueda);
            return matchCodigo || matchActriz || matchDesc;
        });
    }

    if (criterioOrden === "reciente") {
        videosFiltrados.sort((a, b) => new Date(b.fechadesubida) - new Date(a.fechadesubida));
    } else if (criterioOrden === "estreno") {
        videosFiltrados.sort((a, b) => new Date(b.fechadeestreno) - new Date(a.fechadeestreno));
    } else if (criterioOrden === "subesp") {
        videosFiltrados = videosFiltrados.filter(v => v.subtitulos && v.subtitulos.toLowerCase().trim() === "sub español");
    } else if (criterioOrden === "amateur") {
        videosFiltrados = videosFiltrados.filter(v => v.produccion && v.produccion.toLowerCase().trim() === "amateur");
    } else if (criterioOrden === "prodprof") {
        videosFiltrados = videosFiltrados.filter(v => v.produccion && v.produccion.toLowerCase().trim() === "profesional");
    } else if (criterioOrden === "prodext") {
        videosFiltrados = videosFiltrados.filter(v => v.produccionextranjera && (v.produccionextranjera.toLowerCase().trim() === "si" || v.produccionextranjera.toLowerCase().trim() === "sí"));
    } else if (criterioOrden === "vpf") {
        videosFiltrados = videosFiltrados.filter(v => v.vpf && (v.vpf.toLowerCase().trim() === "si" || v.vpf.toLowerCase().trim() === "sí"));
    }

    datosFiltrados = videosFiltrados;
    renderizarCuadrículaVideos();
    renderizarPaginacion(datosFiltrados.length);
}

function irAPerfilActriz(nombreActriz) {
    if (!nombreActriz || nombreActriz.toLowerCase() === "desconocida") return;
    
    actrizSeleccionada = nombreActriz;
    pestañaActiva = "actriz_individual";
    paginaActual = 1;
    inputBuscar.value = "";
    searchBarContainer.classList.add("hidden");
    actualizarPlaceholderBuscador();
    
    actualizarUIHeadernavigation();
    actualizarOpcionesSelectOrdenar();

    const slug = nombreActriz.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/ñ/g, "n")
          .replace(/\s+/g, "_");

    history.pushState({ 
        pestana: "actriz_individual", 
        pagina: 1, 
        actriz: actrizSeleccionada 
    }, "", `?actriz=${slug}`);

    aplicarFiltrosYRenderizar();
    window.scrollTo(0, 0);
}

function renderizarCuadrículaVideos() {
    contenedorPrincipal.innerHTML = "";
    
    if (datosFiltrados.length === 0) {
        contenedorPrincipal.innerHTML = `<div class="text-center text-gray-500 py-20 text-xs font-bold tracking-wide">No se encontraron videos.</div>`;
        return;
    }

    const indiceInicio = (paginaActual - 1) * LIMITE_POR_PAGINA;
    const indiceFin = paginaActual * LIMITE_POR_PAGINA;
    const videosPagina = datosFiltrados.slice(indiceInicio, indiceFin);

    videosPagina.forEach(video => {
        const tarjeta = document.createElement("div");
        tarjeta.className = "bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl flex flex-col p-3 gap-2 transition-all duration-300";
        
        const codigoLimpio = video.codigo ? video.codigo.trim() : "SIN CÓDIGO";
        const formato = video.formato || "MP4";
        const resolucion = video.resolucion || "1080p";
        const tamano = video.tamano || "GB";
        const nombreActriz = video.actriz || 'Desconocida';
        const descripcionOriginal = video.descripcion || 'Sin descripción disponible.';

        tarjeta.innerHTML = `
            <div class="flex justify-between items-center text-xs font-mono tracking-wide w-full px-0.5">
                <span class="text-yellow-500 font-black uppercase text-xs">[${codigoLimpio}]</span>
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
                        <button class="btn-toggle-desc text-yellow-500 font-black text-[10px] uppercase tracking-wider hover:underline focus:outline-none">
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

                metaExpandido.innerHTML = `
                    <div class="flex flex-col gap-1.5 text-xs">
                        <a href="#" data-actriz="${nombreActriz}" class="link-actriz inline-block text-base font-black text-yellow-500 hover:text-yellow-400 hover:underline transition-colors tracking-wide uppercase py-0.5">
                            ${nombreActriz}
                        </a>
                        <div class="flex flex-col gap-0.5">
                            <p><span class="text-yellow-500 font-bold">Fecha de subida:</span> <span class="text-white">${video.fechadesubida || '---'}</span></p>
                            <p><span class="text-yellow-500 font-bold">Fecha de estreno:</span> <span class="text-white">${video.fechadeestreno || '---'}</span></p>
                        </div>
                    </div>
                    <div class="w-full text-right mt-1">
                        <button class="btn-toggle-desc text-yellow-500 font-black text-[10px] uppercase tracking-wider hover:underline focus:outline-none">
                            ocultar
                        </button>
                    </div>
                `;

                const nuevoLinkActriz = metaExpandido.querySelector(".link-actriz");
                if (nuevoLinkActriz) {
                    nuevoLinkActriz.addEventListener("click", (el) => {
                        el.preventDefault();
                        el.stopPropagation();
                        const act = el.currentTarget.getAttribute("data-actriz");
                        irAPerfilActriz(act);
                    });
                }

                metaExpandido.classList.remove("hidden");
            }
        }

        tarjeta.addEventListener("click", (e) => {
            if (e.target.classList.contains("btn-toggle-desc") || e.target.closest(".btn-toggle-desc")) {
                conmutarEstado();
            }
        });

        portadaContenedor.addEventListener("click", (e) => {
            if (!e.target.closest(".play-trigger")) {
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

    const indiceInicio = (paginaActual - 1) * LIMITE_POR_PAGINA;
    const indiceFin = paginaActual * LIMITE_POR_PAGINA;
    const actricesPagina = datosFiltrados.slice(indiceInicio, indiceFin);

    const gridActrices = document.createElement("div");
    gridActrices.className = "grid grid-cols-2 gap-3 w-full";

    actricesPagina.forEach(actrizObj => {
        const item = document.createElement("div");
        item.className = "bg-gray-900 border border-gray-800 rounded-xl p-1.5 flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-transform shadow-md";
        
        const nombreLimpio = actrizObj.actriz 
            ? actrizObj.actriz.toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/ñ/g, "n")
                  .replace(/\s+/g, "_") 
            : "default";

        item.innerHTML = `
            <div class="w-full aspect-[1/1.3333] rounded-lg bg-gray-950 border border-gray-800 overflow-hidden shadow">
                <img src="portadas/act/${nombreLimpio}.jpg" 
                     onerror="this.src='portadas/act/${nombreLimpio}.png'; this.onerror=()=>this.src='https://placehold.co/300x400/111827/ffffff?text=${actrizObj.actriz.charAt(0)}'" 
                     class="w-full h-full object-cover">
            </div>
            <h4 class="text-xs font-black text-gray-100 truncate w-full px-1 tracking-wide mt-1.5 uppercase">${actrizObj.actriz}</h4>
        `;
        
        item.addEventListener("click", () => {
            irAPerfilActriz(actrizObj.actriz);
        });

        gridActrices.appendChild(item);
    });

    contenedorPrincipal.appendChild(gridActrices);
}

function renderizarPaginacion(totalElementos) {
    contenedorPaginacion.innerHTML = "";
    const totalPaginas = Math.ceil(totalElementos / LIMITE_POR_PAGINA);

    if (totalPaginas <= 1) return;

    for (let i = 1; i <= totalPaginas; i++) {
        const botonPagina = document.createElement("button");
        botonPagina.textContent = i;
        botonPagina.className = `w-8 h-8 rounded-lg text-xs font-black transition-all active:scale-90 ${paginaActual === i ? 'bg-yellow-600 text-gray-950 shadow-md scale-105' : 'bg-gray-900 text-gray-400 border border-gray-800'}`;
        
        botonPagina.addEventListener("click", () => {
            paginaActual = i;
            
            let nuevaUrl = `?p=${i}`;
            if (pestañaActiva === "actriz_individual" && actrizSeleccionada) {
                const slug = actrizSeleccionada.toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/ñ/g, "n")
                    .replace(/\s+/g, "_");
                nuevaUrl = `?actriz=${slug}&p=${i}`;
            } else if (pestañaActiva !== "todos") {
                nuevaUrl = `?tab=${pestañaActiva}&p=${i}`;
            }

            history.pushState({ 
                pestana: pestañaActiva, 
                pagina: paginaActual, 
                actriz: actrizSeleccionada 
            }, "", nuevaUrl);

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

window.addEventListener("DOMContentLoaded", inicializarApp);
