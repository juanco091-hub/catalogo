const CONFIG = {
    urlSheetsActrices: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0YbDSS-cHA_kEaYIw8Kq0ko0nFmzgczzQm2F769-I-n9frt-FKlwalmijrUHxDcRswlfSIwGl1QPg/pub?gid=0&single=true&output=csv",
    urlSheetsVideos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0YbDSS-cHA_kEaYIw8Kq0ko0nFmzgczzQm2F769-I-n9frt-FKlwalmijrUHxDcRswlfSIwGl1QPg/pub?gid=1597144864&single=true&output=csv"
};

let ENV_VARS = {};

let BD_ACTRICES = []; 
let BD_VIDEOS = [];
let LISTA_ACTRICES_UNICAS = []; 
let datosFiltrados = []; 

let pestañaActiva = "todos"; 
let actrizSeleccionada = null; 
let paginaActual = 1;
const LIMITE_POR_PAGINA = 20; 
let criterioOrden = "reciente"; 
let ultimoCriterioSeleccionado = "reciente";
let direccionOrden = "desc";
let filtroProtagonismo = "todos"; // "todos", "solitario", "colaboracion"

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
const btnFiltroProtagonismo = document.getElementById("btn-filtro-protagonismo");
const modalProtagonismo = document.getElementById("modal-protagonismo");

async function cargarEnvVars() {
    try {
        const respuesta = await fetch('.env');
        if (!respuesta.ok) return;
        const textoEnv = await respuesta.text();
        
        const lineas = textoEnv.split(/\r?\n/);
        lineas.forEach(linea => {
            const l = linea.trim();
            if (l && !l.startsWith('#') && l.includes('=')) {
                const partes = l.split('=');
                const clave = partes[0].trim();
                const valor = partes.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
                ENV_VARS[clave] = valor;
            }
        });

        aplicarEnvVars();
    } catch (e) {
        console.warn("No se pudo cargar el archivo .env, usando valores por defecto.", e);
    }
}

function hexToRgba(hex, alpha) {
    if (!hex || !hex.startsWith('#')) return hex;
    let c = hex.substring(1);
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    if (c.length !== 6) return hex;
    const num = parseInt(c, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

function aplicarEnvVars() {
    const root = document.documentElement;

    const setVar = (nombre, varEnv, valDefecto) => {
        const val = ENV_VARS[varEnv] || valDefecto;
        root.style.setProperty(nombre, val);
        return val;
    };

    const btnCenColor = setVar('--env-color-iluminacion-btn-cen', 'COLOR_ILUMINACION_BTN_CEN', '#ca8a04');
    root.style.setProperty('--env-color-iluminacion-btn-cen-alpha', hexToRgba(btnCenColor, 0.4));

    const pestanasHomeColor = setVar('--env-color-iluminacion-pestanas-home', 'COLOR_ILUMINACION_PESTANAS_HOME', '#ca8a04');
    root.style.setProperty('--env-color-iluminacion-pestanas-home-alpha', hexToRgba(pestanasHomeColor, 0.3));
    root.style.setProperty('--env-color-iluminacion-pestanas-home-alpha10', hexToRgba(pestanasHomeColor, 0.1));
    root.style.setProperty('--env-color-iluminacion-pestanas-home-alpha30', hexToRgba(pestanasHomeColor, 0.3));

    setVar('--env-color-codigo-video', 'COLOR_CODIGO_VIDEO', '#eab308');
    setVar('--env-color-btn-ver-mas-ocultar', 'COLOR_BTN_VER_MAS_OCULTAR', '#eab308');
    setVar('--env-color-nombre-actriz-descripcion', 'COLOR_NOMBRE_ACTRIZ_DESCRIPCION', '#eab308');
    setVar('--env-color-etiquetas-fechas', 'COLOR_ETIQUETAS_FECHAS', '#eab308');

    const pestanasActrizColor = setVar('--env-color-iluminacion-pestanas-actriz', 'COLOR_ILUMINACION_PESTANAS_ACTRIZ', '#ca8a04');
    root.style.setProperty('--env-color-iluminacion-pestanas-actriz-alpha', hexToRgba(pestanasActrizColor, 0.3));

    setVar('--env-color-nombre-actriz-pagina', 'COLOR_NOMBRE_ACTRIZ_PAGINA', '#eab308');
    setVar('--env-color-subtexto-ordenar-por', 'COLOR_SUBTEXTO_ORDENAR_POR', '#9ca3af');
    setVar('--env-color-borde-buscador', 'COLOR_BORDE_BUSCADOR', '#ca8a04');

    setVar('--env-color-texto-btn-entendido', 'COLOR_TEXTO_BTN_ENTENDIDO', '#030712');
    setVar('--env-color-fondo-btn-entendido', 'COLOR_FONDO_BTN_ENTENDIDO', '#ca8a04');

    if (ENV_VARS['TITULO_MODAL_NOMBRES_ARTISTICOS']) {
        const el = document.getElementById('titulo-modal-nombres');
        if (el) el.textContent = ENV_VARS['TITULO_MODAL_NOMBRES_ARTISTICOS'];
    }
    if (ENV_VARS['TITULO_MODAL_GUIA_ABREVIACIONES']) {
        const el = document.getElementById('titulo-modal-ayuda');
        if (el) el.textContent = ENV_VARS['TITULO_MODAL_GUIA_ABREVIACIONES'];
    }
}

function obtenerEstadoActual() {
    return {
        pestana: pestañaActiva,
        actriz: actrizSeleccionada,
        pagina: paginaActual,
        criterioOrden: criterioOrden,
        ultimoCriterioSeleccionado: ultimoCriterioSeleccionado,
        direccionOrden: direccionOrden,
        filtroProtagonismo: filtroProtagonismo,
        textoBusqueda: inputBuscar.value,
        scrollY: window.scrollY
    };
}

function restaurarEstado(state) {
    if (!state) return;
    
    pestañaActiva = state.pestana || "todos";
    actrizSeleccionada = state.actriz || null;
    paginaActual = state.pagina || 1;
    criterioOrden = state.criterioOrden || "reciente";
    ultimoCriterioSeleccionado = state.ultimoCriterioSeleccionado || "reciente";
    direccionOrden = state.direccionOrden || "desc";
    filtroProtagonismo = state.filtroProtagonismo || "todos";
    
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

async function inicializarApp() {
    try {
        contenedorPrincipal.innerHTML = `
            <div class="flex flex-col items-center justify-center py-24 text-center gap-3">
                <div class="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-xs font-bold text-gray-400 tracking-wide">Cargando base de datos...</p>
            </div>
        `;
        
        await cargarEnvVars();

        const [resActrices, resVideos] = await Promise.all([
            fetch(CONFIG.urlSheetsActrices).then(r => r.text()),
            fetch(CONFIG.urlSheetsVideos).then(r => r.text())
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

window.addEventListener("popstate", (evento) => {
    document.body.classList.remove("modal-abierto");
    if (modalAyuda) modalAyuda.classList.add("hidden");
    if (modalWhatsapp) modalWhatsapp.classList.add("hidden");
    const modalNombres = document.getElementById("modal-nombres-antiguos");
    if (modalNombres) modalNombres.classList.add("hidden");
    if (modalProtagonismo) modalProtagonismo.classList.add("hidden");

    if (evento && evento.state) {
        restaurarEstado(evento.state);
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

function debePublicarNombreActriz(nombreReal) {
    if (!nombreReal) return true;
    const registro = BD_ACTRICES.find(a => a.nombreactriz && a.nombreactriz.toLowerCase().trim() === nombreReal.toLowerCase().trim());
    if (registro && registro.publicarnombreactriz) {
        const val = registro.publicarnombreactriz.toLowerCase().trim();
        return val === "si" || val === "sí";
    }
    return true; 
}

function obtenerNombreVisibleActriz(nombreReal) {
    return debePublicarNombreActriz(nombreReal) ? nombreReal : "N/D";
}

function generarListaActricesUnicas() {
    const mapaActrices = {};
    BD_ACTRICES.forEach(a => {
        if (a.nombreactriz) {
            mapaActrices[a.nombreactriz.trim()] = a.ultimaactualizacion || "---";
        }
    });

    const setActrices = new Set();
    BD_VIDEOS.forEach(v => {
        if (v.nombreactriz && v.nombreactriz.trim() !== "" && v.nombreactriz.toLowerCase() !== "desconocida") {
            const lista = v.nombreactriz.split(',').map(n => n.trim());
            lista.forEach(nom => {
                if (nom) setActrices.add(nom);
            });
        }
    });

    LISTA_ACTRICES_UNICAS = Array.from(setActrices).map(nombre => {
        return {
            actriz: nombre,
            nombreVisible: obtenerNombreVisibleActriz(nombre),
            ultimaactualizacion: mapaActrices[nombre] || "---"
        };
    });

    LISTA_ACTRICES_UNICAS.sort((a, b) => a.actriz.localeCompare(b.actriz));
}

function configurarEventos() {
    document.querySelectorAll(".tab-item").forEach(boton => {
        boton.addEventListener("click", (e) => {
            const tabTarget = e.currentTarget.getAttribute("data-tab") || "todos";
            
            // 1. Si el usuario presiona la MISMA pestaña activa (excepto ayuda):
            if (tabTarget === pestañaActiva && pestañaActiva !== "ayuda") {
                const scrollActual = window.scrollY || document.documentElement.scrollTop;
                if (scrollActual > 10) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                return; // Si el scroll es <= 10, ignora el clic por completo
            }

            // 2. Si abre el modal de Ayuda / Glosario
            if (tabTarget === "ayuda") {
                if (pestañaActiva === "ayuda") return;
                
                actualizarEstadoActualSinNavegar();
                document.body.classList.add("modal-abierto");
                modalAyuda.classList.remove("hidden");
                
                history.pushState(Object.assign(obtenerEstadoActual(), { modalAbierto: "ayuda" }), "");
                return; 
            }

            // 3. Cambio a una nueva pestaña distinta
            actualizarEstadoActualSinNavegar();

            pestañaActiva = tabTarget;
            actrizSeleccionada = null;
            paginaActual = 1;
            criterioOrden = "reciente";
            ultimoCriterioSeleccionado = "reciente";
            direccionOrden = "desc";
            filtroProtagonismo = "todos";
            
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
        paginaActual = 1;
        criterioOrden = "reciente";
        ultimoCriterioSeleccionado = "reciente";
        direccionOrden = "desc";
        filtroProtagonismo = "todos";
        
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

    btnCerrarAyuda.addEventListener("click", cerrarGlosarioAyuda);
    btnEntendidoAyuda.addEventListener("click", cerrarGlosarioAyuda);
    modalAyuda.addEventListener("click", (e) => {
        if (e.target === modalAyuda) cerrarGlosarioAyuda();
    });

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
                    htmlInterno += `<span class="text-yellow-600 font-bold font-sans">${kanji}</span>`;
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

    btnCerrarModalNombres.addEventListener("click", cerrarModalNombres);
    btnEntendidoNombres.addEventListener("click", cerrarModalNombres);
    modalNombres.addEventListener("click", (e) => {
        if (e.target === modalNombres) cerrarModalNombres();
    });

    // Eventos Modal Filtro de Protagonismo
    btnFiltroProtagonismo.addEventListener("click", () => {
        actualizarUIModalProtagonismo();
        document.body.classList.add("modal-abierto");
        modalProtagonismo.classList.remove("hidden");
        actualizarEstadoActualSinNavegar();
        history.pushState(Object.assign(obtenerEstadoActual(), { modalAbierto: "protagonismo" }), "");
    });

    function cerrarModalProtagonismo() {
        if (history.state && history.state.modalAbierto === "protagonismo") {
            history.back();
        } else {
            document.body.classList.remove("modal-abierto");
            modalProtagonismo.classList.add("hidden");
        }
    }

    document.getElementById("btn-cerrar-modal-protagonismo").addEventListener("click", cerrarModalProtagonismo);
    modalProtagonismo.addEventListener("click", (e) => {
        if (e.target === modalProtagonismo) cerrarModalProtagonismo();
    });

    document.querySelectorAll(".btn-opcion-protagonismo").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const tipo = e.currentTarget.getAttribute("data-filtro-protagonismo");
            filtroProtagonismo = tipo;
            paginaActual = 1;
            cerrarModalProtagonismo();
            aplicarFiltrosYRenderizar();
            actualizarEstadoActualSinNavegar();
        });
    });

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
            const totalPaginas = Math.ceil(datosFiltrados.length / LIMITE_POR_PAGINA);
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
                    const slug = actrizSeleccionada.toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/ñ/g, "n")
                        .replace(/\s+/g, "_");
                    nuevaUrl = `?actriz=${slug}&p=${paginaActual}`;
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

function actualizarUIModalProtagonismo() {
    document.querySelectorAll(".btn-opcion-protagonismo").forEach(btn => {
        const tipo = btn.getAttribute("data-filtro-protagonismo");
        const check = btn.querySelector(".checkmark");
        if (tipo === filtroProtagonismo) {
            btn.classList.add("border", "border-yellow-500/50", "bg-gray-800/90");
            if (check) check.classList.remove("hidden");
        } else {
            btn.classList.remove("border", "border-yellow-500/50", "bg-gray-800/90");
            if (check) check.classList.add("hidden");
        }
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
    ultimoCriterioSeleccionado = "reciente";
    direccionOrden = "desc";
    filtroProtagonismo = "todos";
    inputBuscar.value = "";
    searchBarContainer.classList.add("hidden");
    actualizarPlaceholderBuscador();
    
    document.body.classList.remove("modal-abierto");
    modalAyuda.classList.add("hidden");
    modalWhatsapp.classList.add("hidden");
    if (modalProtagonismo) modalProtagonismo.classList.add("hidden");
    
    actualizarUIHeadernavigation();
    actualizarOpcionesSelectOrdenar();

    contenedorPestanasNav.scrollLeft = 0;

    history.pushState(obtenerEstadoActual(), "", window.location.pathname);
    
    aplicarFiltrosYRenderizar();
    window.scrollTo(0, 0);
}

function actualizarUIHeadernavigation() {
    const headerElement = document.querySelector("header");

    if (pestañaActiva === "actriz_individual") {
        if (headerElement) headerElement.classList.remove("border-b", "border-gray-800");

        vistaGeneralCabecera.classList.add("hidden");
        vistaActrizCabecera.classList.remove("hidden");
        if (nombreActrizTitulo) {
            nombreActrizTitulo.textContent = obtenerNombreVisibleActriz(actrizSeleccionada);
        }

        const nombreLimpio = actrizSeleccionada
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/ñ/g, "n")
            .replace(/\s+/g, "_");

        const imgCabecera = document.getElementById("imagen-actriz-cabecera");
        if (imgCabecera) {
            imgCabecera.src = `portadas/act/${nombreLimpio}.jpg`;
            imgCabecera.onerror = () => {
                imgCabecera.src = `portadas/act/${nombreLimpio}.png`;
                imgCabecera.onerror = () => { imgCabecera.src = ''; };
            };
        }

        const registroActriz = BD_ACTRICES.find(a => a.nombreactriz && a.nombreactriz.toLowerCase().trim() === actrizSeleccionada.toLowerCase().trim());
        
        let tieneHistorial = false;
        let listaNombresHistorial = [];

        if (registroActriz) {
            const columnasNombres = ["nombre1", "nombre2", "nombre3", "nombre4", "nombre5"];
            columnasNombres.forEach(col => {
                if (registroActriz[col] && registroActriz[col].trim() !== "" && registroActriz[col].trim() !== "---") {
                    listaNombresHistorial.push(registroActriz[col].trim());
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

        // Verificar si la actriz tiene colaboraciones (videos compartidos con otras actrices)
        const tieneColaboracion = BD_VIDEOS.some(v => {
            if (!v.nombreactriz) return false;
            const actricesArr = v.nombreactriz.split(',').map(n => n.trim().toLowerCase());
            return actricesArr.includes(actrizSeleccionada.toLowerCase().trim()) && actricesArr.length > 1;
        });

        if (tieneColaboracion) {
            btnFiltroProtagonismo.classList.remove("hidden");
            btnFiltroProtagonismo.classList.add("flex");
        } else {
            btnFiltroProtagonismo.classList.remove("flex");
            btnFiltroProtagonismo.classList.add("hidden");
        }
        
    } else {
        if (headerElement) headerElement.classList.add("border-b", "border-gray-800");
        
        vistaGeneralCabecera.classList.remove("hidden");
        vistaActrizCabecera.classList.add("hidden");
        contenedorPestanasNav.classList.remove("hidden");

        document.querySelectorAll(".tab-item").forEach(b => {
            const tabAttr = b.getAttribute("data-tab");
            if (!tabAttr && pestañaActiva === "todos") {
                b.className = "tab-item px-4 py-2 rounded-full text-sm font-bold text-gray-950 dinamico-tab-activa active:scale-95 flex items-center justify-center";
            } else if (tabAttr === pestañaActiva) {
                b.className = "tab-item px-5 py-2 rounded-full text-sm font-bold text-gray-950 dinamico-tab-activa active:scale-95";
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
        const nombreSel = actrizSeleccionada.toLowerCase().trim();
        videosFiltrados = videosFiltrados.filter(v => {
            if (!v.nombreactriz) return false;
            const arr = v.nombreactriz.split(',').map(n => n.trim().toLowerCase());
            return arr.includes(nombreSel);
        });

        // Aplicar Filtro de Protagonismo si aplica
        if (filtroProtagonismo === "solitario") {
            videosFiltrados = videosFiltrados.filter(v => {
                const arr = v.nombreactriz.split(',').map(n => n.trim());
                return arr.length === 1;
            });
        } else if (filtroProtagonismo === "colaboracion") {
            videosFiltrados = videosFiltrados.filter(v => {
                const arr = v.nombreactriz.split(',').map(n => n.trim());
                return arr.length > 1;
            });
        }
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

    if (textoBusqueda !== "") {
        videosFiltrados = videosFiltrados.filter(v => {
            const matchCodigo = v.codigovideo && v.codigovideo.toLowerCase().includes(textoBusqueda);
            const matchActriz = v.nombreactriz && v.nombreactriz.toLowerCase().includes(textoBusqueda);
            const matchDesc = v.descripcion && v.descripcion.toLowerCase().includes(textoBusqueda);
            return matchCodigo || matchActriz || matchDesc;
        });
    }

    const parsearFechaMs = (strFecha, strFechaFallback = null) => {
        const intentarParsear = (str) => {
            if (!str || str.trim() === "" || str.trim() === "---") return 0;
            const limpia = str.trim().replace(/-/g, "/");
            const partes = limpia.split("/");
            
            if (partes.length === 3 && partes[0].length === 4) {
                const ts = new Date(partes[0], partes[1] - 1, partes[2]).getTime();
                return isNaN(ts) ? 0 : ts;
            }
            if (partes.length === 3 && partes[2].length === 4) {
                const ts = new Date(partes[2], partes[1] - 1, partes[0]).getTime();
                return isNaN(ts) ? 0 : ts;
            }
            
            const timestamp = Date.parse(limpia);
            return isNaN(timestamp) ? 0 : timestamp;
        };

        let tsMain = intentarParsear(strFecha);
        if (tsMain === 0 && strFechaFallback) {
            tsMain = intentarParsear(strFechaFallback);
        }
        return tsMain;
    };

    const ordenarPorFecha = (lista, campoFecha, campoFallback = null) => {
        return lista.sort((a, b) => {
            const msA = parsearFechaMs(a[campoFecha], campoFallback ? a[campoFallback] : null);
            const msB = parsearFechaMs(b[campoFecha], campoFallback ? b[campoFallback] : null);
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

    if (criterioOrden === "estreno") {
        ordenarPorFecha(videosFiltrados, "fechadeestreno", "fechadesubida");
    } else {
        ordenarPorFecha(videosFiltrados, "fechadesubida");
    }

    datosFiltrados = videosFiltrados;
    renderizarCuadrículaVideos();
    renderizarPaginacion(datosFiltrados.length);
}

function irAPerfilActriz(nombreActriz) {
    if (!nombreActriz || nombreActriz.toLowerCase() === "desconocida") return;
    
    actualizarEstadoActualSinNavegar();

    actrizSeleccionada = nombreActriz;
    pestañaActiva = "actriz_individual";
    paginaActual = 1;
    criterioOrden = "reciente";
    ultimoCriterioSeleccionado = "reciente";
    direccionOrden = "desc";
    filtroProtagonismo = "todos";
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

    history.pushState(obtenerEstadoActual(), "", `?actriz=${slug}`);

    aplicarFiltrosYRenderizar();
    window.scrollTo(0, 0);
}

function formatearCodigoVideoTarjeta(video) {
    const publicar = video.publicarcodigovideo ? video.publicarcodigovideo.trim() : "Sí";
    const codigoReal = video.codigovideo ? video.codigovideo.trim() : "";

    if (publicar.toLowerCase() === "sí" || publicar.toLowerCase() === "si") {
        return codigoReal ? `[${codigoReal}]` : "";
    } else if (publicar.toLowerCase() === "no") {
        return "";
    } else {
        return `[${publicar}]`;
    }
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
        
        const codigoReal = video.codigovideo ? video.codigovideo.trim() : "SIN CÓDIGO";
        const codigoMostrar = formatearCodigoVideoTarjeta(video);
        const formato = video.formato || "MP4";
        const resolucion = video.resolucion || "1080p";
        const tamano = video.tamano || "GB";
        const descripcionOriginal = video.descripcion || 'Sin descripción disponible.';

        // Generar enlaces/máscara para las actrices de este video
        let htmlActricesEnlaces = "";
        if (video.nombreactriz && video.nombreactriz.trim() !== "" && video.nombreactriz.toLowerCase() !== "desconocida") {
            const listaNombres = video.nombreactriz.split(',').map(n => n.trim()).filter(n => n);
            const partes = listaNombres.map(nombreReal => {
                const visible = obtenerNombreVisibleActriz(nombreReal);
                return `<a href="#" data-actriz="${nombreReal}" class="link-actriz inline-block text-base font-black dinamico-nombre-actriz-desc hover:underline transition-colors tracking-wide uppercase py-0.5">${visible}</a>`;
            });
            htmlActricesEnlaces = partes.join('<span class="text-gray-400 font-bold mx-1">,</span>');
        } else {
            htmlActricesEnlaces = `<span class="text-gray-400 font-bold">Desconocida</span>`;
        }

        tarjeta.innerHTML = `
            <div class="flex justify-between items-center text-xs font-mono tracking-wide w-full px-0.5">
                <span class="font-black uppercase text-xs dinamico-codigo-video">${codigoMostrar}</span>
                <span class="text-gray-400 font-bold text-[11px]">${formato} ${resolucion} / ${tamano}</span>
            </div>

            <div class="portada-contenedor block w-full group relative cursor-pointer">
                <div class="relative bg-gray-950 aspect-[1.5/1] w-full flex items-center justify-center overflow-hidden rounded-lg border border-gray-800">
                    <img src="portadas/vid/${codigoReal}.jpg" 
                         onerror="this.src='portadas/vid/${codigoReal}.png'; this.onerror=()=>this.src='https://placehold.co/600x400/111827/4b5563?text=${codigoReal}'" 
                         class="w-full h-full object-fill">
                    
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
                <p class="texto-descripcion text-xs text-gray-300 font-medium leading-relaxed lineas-limitadas-2" id="texto-desc-${codigoReal}">
                    <span class="contenedor-flotante-ver-mas" id="wrapper-flotante-${codigoReal}">
                        <span class="text-gray-300 text-xs font-medium mr-1 select-none font-sans">...</span>
                        <button class="btn-toggle-desc font-black text-[10px] uppercase tracking-wider hover:underline focus:outline-none dinamico-btn-vermas">
                            ver más
                        </button>
                    </span>
                    ${descripcionOriginal}
                </p>
                <div id="meta-expandido-${codigoReal}" class="hidden flex flex-col gap-2 pt-2 border-t border-gray-800/60 mt-2"></div>
            </div>
        `;

        const textoDesc = tarjeta.querySelector(`#texto-desc-${codigoReal}`);
        const wrapperFlotante = tarjeta.querySelector(`#wrapper-flotante-${codigoReal}`);
        const metaExpandido = tarjeta.querySelector(`#meta-expandido-${codigoReal}`);
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
                        <div class="flex items-center flex-wrap">
                            ${htmlActricesEnlaces}
                        </div>
                        <div class="flex flex-col gap-0.5">
                            <p><span class="font-bold dinamico-etiquetas-fechas">Fecha de subida:</span> <span class="text-white">${video.fechadesubida || '---'}</span></p>
                            <p><span class="font-bold dinamico-etiquetas-fechas">Fecha de estreno:</span> <span class="text-white">${video.fechadeestreno || '---'}</span></p>
                        </div>
                    </div>
                    <div class="w-full text-right mt-1">
                        <button class="btn-toggle-desc font-black text-[10px] uppercase tracking-wider hover:underline focus:outline-none dinamico-btn-vermas">
                            ocultar
                        </button>
                    </div>
                `;

                metaExpandido.querySelectorAll(".link-actriz").forEach(link => {
                    link.addEventListener("click", (el) => {
                        el.preventDefault();
                        el.stopPropagation();
                        const act = el.currentTarget.getAttribute("data-actriz");
                        irAPerfilActriz(act);
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
                
                if (video.nombreactriz) {
                    const primerNombre = video.nombreactriz.split(',')[0].trim();
                    if (primerNombre && primerNombre.toLowerCase() !== "desconocida") {
                        // Si ya estamos en el perfil de ESTA MISMA actriz, no redirigir ni saturar el historial
                        if (pestañaActiva === "actriz_individual" && actrizSeleccionada && 
                            actrizSeleccionada.toLowerCase().trim() === primerNombre.toLowerCase().trim()) {
                            // Ejecutamos simplemente la expansión/contracción
                            conmutarEstado();
                        } else {
                            irAPerfilActriz(primerNombre);
                        }
                    } else {
                        conmutarEstado();
                    }
                } else {
                    conmutarEstado();
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
                     onerror="this.src='portadas/act/${nombreLimpio}.png'; this.onerror=()=>this.src='https://placehold.co/300x400/111827/ffffff?text=${actrizObj.nombreVisible.charAt(0)}'" 
                     class="w-full h-full object-fill">
            </div>
            <h4 class="text-xs font-black text-gray-100 truncate w-full px-1 tracking-wide mt-1.5 uppercase">${actrizObj.nombreVisible}</h4>
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
        botonPagina.className = `w-8 h-8 rounded-lg text-xs font-black transition-all active:scale-90 ${paginaActual === i ? 'text-gray-950 shadow-md scale-105 dinamico-tab-activa' : 'bg-gray-900 text-gray-400 border border-gray-800'}`;
        
        botonPagina.addEventListener("click", () => {
            actualizarEstadoActualSinNavegar();

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

window.addEventListener("DOMContentLoaded", inicializarApp);
