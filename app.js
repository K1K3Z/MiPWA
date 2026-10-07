// Referencias a elementos del DOM
const inputTarea = document.getElementById('tarea');
const btnAgregar = document.getElementById('agregar');
const listaTareas = document.getElementById('lista');
const statsElement = document.getElementById('stats');
const btnNotificacion = document.getElementById('btn-notificacion');
const btnInstalar = document.getElementById('btn-instalar');
const estadoConexion = document.getElementById('estado-conexion');

// 1. Cargar tareas guardadas en LocalStorage o iniciar con arreglo vacío
let tareas = JSON.parse(localStorage.getItem('tareas')) || [];

// Variable para el evento de instalación PWA
let eventoInstalacion = null;

// ==========================================
// 2. Funciones Principales (CRUD & Render)
// ==========================================

// Guardar en LocalStorage
function guardarTareasEnLocalStorage() {
    localStorage.setItem('tareas', JSON.stringify(tareas));
}

// Renderizar la lista de tareas en el HTML
function renderizarTareas() {
    listaTareas.innerHTML = '';

    if (tareas.length === 0) {
        listaTareas.innerHTML = '<li class="empty-state">No tienes tareas pendientes 🎉</li>';
        statsElement.textContent = '0 tareas pendientes';
        return;
    }

    const pendientes = tareas.filter(t => !t.completada).length;
    statsElement.textContent = `${pendientes} de ${tareas.length} tareas pendientes`;

    tareas.forEach((tarea) => {
        const li = document.createElement('li');
        if (tarea.completada) {
            li.classList.add('completada');
        }

        // Estructura interna de cada item
        li.innerHTML = `
            <div class="tarea-content" onclick="marcarTarea(${tarea.id})">
                <span class="checkbox-custom"></span>
                <span class="texto-tarea">${escaparHTML(tarea.texto)}</span>
            </div>
            <button class="btn-eliminar" onclick="eliminarTarea(${tarea.id})" title="Eliminar tarea">
                🗑️ Borrar
            </button>
        `;

        listaTareas.appendChild(li);
    });
}

// Función para prevenir XSS en los textos
function escaparHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Agregar nueva tarea
function agregarTarea() {
    const texto = inputTarea.value.trim();
    if (texto === '') {
        alert('Por favor, escribe una tarea antes de agregar.');
        inputTarea.focus();
        return;
    }

    const nuevaTarea = {
        id: Date.now(),
        texto: texto,
        completada: false
    };

    tareas.push(nuevaTarea);
    guardarTareasEnLocalStorage();
    renderizarTareas();

    inputTarea.value = '';
    inputTarea.focus();

    // Notificación al agregar tarea
    enviarNotificacion('Nueva tarea agregada', `"${texto}" se ha añadido a tu lista.`);
}

// Marcar tarea como completada o pendiente
window.marcarTarea = function(id) {
    tareas = tareas.map(t => {
        if (t.id === id) {
            return { ...t, completada: !t.completada };
        }
        return t;
    });
    guardarTareasEnLocalStorage();
    renderizarTareas();
};

// Eliminar tarea
window.eliminarTarea = function(id) {
    const tareaAEliminar = tareas.find(t => t.id === id);
    tareas = tareas.filter(t => t.id !== id);
    guardarTareasEnLocalStorage();
    renderizarTareas();

    if (tareaAEliminar) {
        enviarNotificacion('Tarea eliminada', `"${tareaAEliminar.texto}" fue eliminada.`);
    }
};

// ==========================================
// 3. Event Listeners
// ==========================================

btnAgregar.addEventListener('click', agregarTarea);

inputTarea.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        agregarTarea();
    }
});

// ==========================================
// 4. Registro de Service Worker (Offline Support)
// ==========================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then((registro) => {
                console.log('✅ Service Worker registrado con éxito:', registro.scope);
            })
            .catch((error) => {
                console.error('❌ Error al registrar el Service Worker:', error);
            });
    });
}

// ==========================================
// 5. API de Notificaciones
// ==========================================

function solicitarPermisoNotificaciones() {
    if (!('Notification' in window)) {
        alert('Este navegador no soporta notificaciones.');
        return;
    }

    if (Notification.permission === 'granted') {
        enviarNotificacion('Notificaciones Activas', '¡Las notificaciones ya están funcionando!');
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permiso) => {
            if (permiso === 'granted') {
                enviarNotificacion('¡Permiso Concedido!', 'Recibirás avisos cuando agregues o elimines tareas.');
            } else {
                alert('Permiso de notificaciones denegado.');
            }
        });
    } else {
        alert('Las notificaciones están bloqueadas en la configuración de tu navegador.');
    }
}

function enviarNotificacion(titulo, cuerpo) {
    if ('Notification' in window && Notification.permission === 'granted') {
        // Intentar usar la notificación del Service Worker si está listo
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then((reg) => {
                reg.showNotification(titulo, {
                    body: cuerpo,
                    icon: 'icons/icon-192.png',
                    badge: 'icons/icon-192.png',
                    vibrate: [100, 50, 100]
                });
            });
        } else {
            // Fallback a notificación web estándar
            new Notification(titulo, {
                body: cuerpo,
                icon: 'icons/icon-192.png'
            });
        }
    }
}

btnNotificacion.addEventListener('click', solicitarPermisoNotificaciones);

// ==========================================
// 6. Detección de Estado de Conexión (Online/Offline)
// ==========================================

function actualizarEstadoConexion() {
    if (navigator.onLine) {
        estadoConexion.textContent = '🟢 En línea';
        estadoConexion.className = 'online';
    } else {
        estadoConexion.textContent = '🔴 Sin conexión (Modo Offline activo)';
        estadoConexion.className = 'offline';
    }
}

window.addEventListener('online', actualizarEstadoConexion);
window.addEventListener('offline', actualizarEstadoConexion);

// ==========================================
// 7. Instalación PWA (Prompt de Instalación)
// ==========================================

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevenir que el navegador muestre la barra automáticamente
    e.preventDefault();
    eventoInstalacion = e;
    // Mostrar el botón de instalación en la UI
    btnInstalar.classList.remove('hidden');
});

btnInstalar.addEventListener('click', async () => {
    if (!eventoInstalacion) return;
    // Mostrar prompt de instalación
    eventoInstalacion.prompt();
    const { outcome } = await eventoInstalacion.userChoice;
    console.log(`Respuesta del usuario a la instalación: ${outcome}`);
    // Ocultar botón tras la elección
    btnInstalar.classList.add('hidden');
    eventoInstalacion = null;
});

window.addEventListener('appinstalled', () => {
    console.log('🎉 PWA instalada con éxito en el sistema.');
    btnInstalar.classList.add('hidden');
});

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    renderizarTareas();
    actualizarEstadoConexion();
});
