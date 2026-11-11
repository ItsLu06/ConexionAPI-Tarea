'use strict';

const URL_API_CITAS = 'https://dummyjson.com/quotes/random';
const URL_API_PERROS = 'https://dog.ceo/api/breeds/image/random';
const URL_API_GATOS_JSON = 'https://cataas.com/cat?json=true';
const URL_BASE_IMAGEN_GATO = 'https://cataas.com/cat/';
const URL_API_DATOS_CURIOSOS = 'https://uselessfacts.jsph.pl/api/v2/facts/random?language=en';

const TIEMPO_MAXIMO_CONSULTA_MS = 10000;
const TIEMPO_MAXIMO_IMAGEN_MS = 15000;

class ErrorDeConsulta extends Error {
    constructor(tipo, mensaje) {
        super(mensaje);
        this.name = 'ErrorDeConsulta';
        this.tipo = tipo;
    }
}

function obtenerMensajeDeError(error) {
    const tipo = error instanceof ErrorDeConsulta ? error.tipo : 'desconocido';

    switch (tipo) {
        case 'red':
            return navigator.onLine === false
                ? 'Parece que no tienes conexión a Internet. Revísala e inténtalo de nuevo.'
                : 'No se pudo conectar con el servicio. Revisa tu conexión e inténtalo de nuevo.';
        case 'http':
            return 'El servicio respondió con un error. Inténtalo de nuevo en unos segundos.';
        case 'tiempo':
            return 'La consulta tardó demasiado en responder. Inténtalo de nuevo.';
        case 'formato':
            return 'El servicio devolvió datos inesperados. Inténtalo de nuevo.';
        case 'imagen':
            return 'No se pudo cargar la imagen. Inténtalo de nuevo.';
        default:
            return 'Ocurrió un problema inesperado. Inténtalo de nuevo.';
    }
}

function esTextoNoVacio(valor) {
    return typeof valor === 'string' && valor.trim().length > 0;
}

function esUrlWeb(valor) {
    if (!esTextoNoVacio(valor)) {
        return false;
    }
    try {
        const { protocol } = new URL(valor);
        return protocol === 'https:' || protocol === 'http:';
    } catch {
        return false;
    }
}

async function solicitarJson(url) {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), TIEMPO_MAXIMO_CONSULTA_MS);

    try {
        const respuesta = await fetch(url, { signal: controlador.signal });

        if (!respuesta.ok) {
            throw new ErrorDeConsulta('http', `Código HTTP ${respuesta.status}`);
        }
        return await respuesta.json();
    } catch (error) {
        if (error instanceof ErrorDeConsulta) {
            throw error;
        }
        if (error.name === 'AbortError') {
            throw new ErrorDeConsulta('tiempo', 'Tiempo de espera agotado');
        }
        if (error instanceof SyntaxError) {
            throw new ErrorDeConsulta('formato', 'La respuesta no es un JSON válido');
        }
        throw new ErrorDeConsulta('red', 'Fallo de red');
    } finally {
        clearTimeout(temporizador);
    }
}

function precargarImagen(url) {
    return new Promise((resolver, rechazar) => {
        const imagen = new Image();
        const temporizador = setTimeout(() => {
            rechazar(new ErrorDeConsulta('imagen', 'Tiempo de espera agotado al cargar la imagen'));
        }, TIEMPO_MAXIMO_IMAGEN_MS);

        imagen.onload = () => {
            clearTimeout(temporizador);
            resolver();
        };
        imagen.onerror = () => {
            clearTimeout(temporizador);
            rechazar(new ErrorDeConsulta('imagen', 'La imagen no se pudo cargar'));
        };
        imagen.src = url;
    });
}

async function obtenerCita() {
    const datos = await solicitarJson(URL_API_CITAS);

    if (!esTextoNoVacio(datos?.quote) || !esTextoNoVacio(datos?.author)) {
        throw new ErrorDeConsulta('formato', 'Faltan los campos quote o author');
    }
    return { texto: datos.quote, autor: datos.author };
}

async function obtenerPerro() {
    const datos = await solicitarJson(URL_API_PERROS);

    if (!esUrlWeb(datos?.message)) {
        throw new ErrorDeConsulta('formato', 'Falta el campo message con la URL de la imagen');
    }
    return { urlImagen: datos.message, raza: extraerRazaDeUrl(datos.message) };
}

async function obtenerGato() {
    const datos = await solicitarJson(URL_API_GATOS_JSON);

    let urlImagen = null;
    if (esTextoNoVacio(datos?.id)) {
        urlImagen = URL_BASE_IMAGEN_GATO + encodeURIComponent(datos.id);
    } else if (esUrlWeb(datos?.url)) {
        urlImagen = datos.url;
    }

    if (urlImagen === null) {
        throw new ErrorDeConsulta('formato', 'Faltan los campos id o url de la imagen');
    }

    const etiquetas = Array.isArray(datos.tags) ? datos.tags.filter(esTextoNoVacio) : [];
    return { urlImagen, etiquetas };
}

async function obtenerDatoCurioso() {
    const datos = await solicitarJson(URL_API_DATOS_CURIOSOS);

    if (!esTextoNoVacio(datos?.text)) {
        throw new ErrorDeConsulta('formato', 'Falta el campo text');
    }
    return { texto: datos.text };
}

function extraerRazaDeUrl(url) {
    const coincidencia = /\/breeds\/([^/]+)\//.exec(url);
    if (!coincidencia) {
        return '';
    }
    const palabras = coincidencia[1].split('-').reverse().join(' ');
    return palabras.charAt(0).toUpperCase() + palabras.slice(1);
}

async function mostrarCita(seccion, datos) {
    document.getElementById('cita-texto').textContent = datos.texto;
    document.getElementById('cita-autor').textContent = datos.autor;
}

async function mostrarPerro(seccion, datos) {
    await precargarImagen(datos.urlImagen);

    const imagen = document.getElementById('perro-imagen');
    imagen.alt = datos.raza ? `Foto de un perro de raza ${datos.raza}` : 'Foto aleatoria de un perro';
    imagen.src = datos.urlImagen;
    document.getElementById('perro-pie').textContent = datos.raza ? `Raza: ${datos.raza}` : '';
}

async function mostrarGato(seccion, datos) {
    await precargarImagen(datos.urlImagen);

    const imagen = document.getElementById('gato-imagen');
    const etiquetas = datos.etiquetas.join(', ');
    imagen.alt = etiquetas ? `Foto aleatoria de un gato (${etiquetas})` : 'Foto aleatoria de un gato';
    imagen.src = datos.urlImagen;
    document.getElementById('gato-pie').textContent = etiquetas ? `Etiquetas: ${etiquetas}` : '';
}

async function mostrarDatoCurioso(seccion, datos) {
    document.getElementById('dato-texto').textContent = datos.texto;
}

const secciones = [
    { id: 'cita', consultar: obtenerCita, mostrar: mostrarCita },
    { id: 'perro', consultar: obtenerPerro, mostrar: mostrarPerro },
    { id: 'gato', consultar: obtenerGato, mostrar: mostrarGato },
    { id: 'dato', consultar: obtenerDatoCurioso, mostrar: mostrarDatoCurioso }
];

function mostrarEstado(seccion, estadoActivo) {
    for (const [estado, elemento] of Object.entries(seccion.estados)) {
        elemento.hidden = estado !== estadoActivo;
    }
}

async function actualizarSeccion(seccion) {
    if (seccion.enCurso) {
        return;
    }

    seccion.enCurso = true;
    seccion.boton.disabled = true;
    seccion.raiz.setAttribute('aria-busy', 'true');
    mostrarEstado(seccion, 'cargando');

    try {
        const datos = await seccion.consultar();
        await seccion.mostrar(seccion, datos);
        mostrarEstado(seccion, 'contenido');
    } catch (error) {
        console.error(`[${seccion.id}]`, error);
        seccion.mensajeError.textContent = obtenerMensajeDeError(error);
        mostrarEstado(seccion, 'error');
    } finally {
        seccion.enCurso = false;
        seccion.boton.disabled = false;
        seccion.raiz.setAttribute('aria-busy', 'false');
    }
}

function prepararSeccion(seccion) {
    seccion.raiz = document.querySelector(`[data-seccion="${seccion.id}"]`);
    seccion.boton = seccion.raiz.querySelector('[data-accion="actualizar"]');
    seccion.mensajeError = seccion.raiz.querySelector('[data-campo="mensaje-error"]');
    seccion.estados = {
        cargando: seccion.raiz.querySelector('[data-estado="cargando"]'),
        error: seccion.raiz.querySelector('[data-estado="error"]'),
        contenido: seccion.raiz.querySelector('[data-estado="contenido"]')
    };
    seccion.enCurso = false;

    seccion.boton.addEventListener('click', () => actualizarSeccion(seccion));
    seccion.raiz
        .querySelector('[data-accion="reintentar"]')
        .addEventListener('click', () => actualizarSeccion(seccion));

    const imagen = seccion.raiz.querySelector('img');
    if (imagen) {
        imagen.addEventListener('error', () => {
            if (!seccion.enCurso && imagen.getAttribute('src')) {
                seccion.mensajeError.textContent = obtenerMensajeDeError(new ErrorDeConsulta('imagen'));
                mostrarEstado(seccion, 'error');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    secciones.forEach(prepararSeccion);
    secciones.forEach(actualizarSeccion);
});
