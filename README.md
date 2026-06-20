# BigQuery Release Notes Explorer 🚀

Una aplicación web moderna y responsiva construida con **Python Flask** y tecnologías frontend nativas (**HTML5, CSS3, JavaScript**) para consultar, buscar y compartir las notas de lanzamiento de Google BigQuery de manera interactiva.

---

## 🌟 Características Principales

*   **Parseo Inteligente de Feeds:** Consume el feed XML oficial de BigQuery y separa las entradas diarias en tarjetas individuales divididas por su categoría específica (`Feature`, `Issue`, `Announcement`, etc.).
*   **Filtros Rápidos y Búsqueda Activa:** Filtra las notas de lanzamiento al instante haciendo clic en los botones de categoría de la barra lateral o escribe palabras clave en la barra de búsqueda para búsquedas rápidas.
*   **Diseño Oscuro y Minimalista:** Interfaz de usuario premium inspirada en temas de espacio de trabajo modernos, optimizada con efectos de desenfoque translúcido (*glassmorphic*), animaciones fluidas y soporte completo para dispositivos móviles.
*   **Sistema de Caché Local:** Guarda de forma segura las actualizaciones en un archivo caché local JSON por 1 hora para acelerar drásticamente los tiempos de carga y evitar el bloqueo por exceso de peticiones a Google.
*   **Compositor y Simulador de Tweets integrado:**
    *   Muestra un clon visual del editor de posts de X (Twitter).
    *   Ajusta dinámicamente el límite de caracteres (280) calculando las URLs fijas e indicadores dinámicos.
    *   Trunca de manera limpia el cuerpo del cambio técnico para asegurar que el post que compartas en X mediante el *Web Intent* de Twitter encaje sin sobrepasar los límites de longitud.

---

## 🛠️ Stack Tecnológico

*   **Backend:** Python 3.14+ (Flask, Requests, XML ElementTree)
*   **Frontend:** HTML5 semántico, CSS3 nativo (CSS Variables, Flexbox, CSS Grid), JavaScript ES6 Vanilla.
*   **Control de Versiones:** Git & GitHub

---

## 📁 Estructura del Directorio

```text
ester-event-talks-app/
├── app.py                   # Servidor backend en Flask (ruteo, caché y parseo)
├── requirements.txt         # Dependencias del entorno Python
├── DOCUMENTACION.md         # Guía técnica en detalle del proyecto
├── README.md                # Presentación general del repositorio
├── templates/
│   └── index.html           # Plantilla base y maquetación de la app
└── static/
    ├── css/
    │   └── style.css        # Hoja de estilos con variables de diseño nativas
    └── js/
        └── app.js           # Lógica del cliente, filtrado, toasts y modal de X
```

---

## 💻 Instalación y Uso Local

Sigue estos pasos para levantar el entorno de desarrollo en tu máquina:

### 1. Clonar el repositorio
```bash
git clone https://github.com/yeyejordan1/ester-event-talks-app.git
cd ester-event-talks-app
```

### 2. Crear y activar el entorno virtual
En Windows (PowerShell):
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

En macOS/Linux:
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 4. Ejecutar la aplicación
```bash
python app.py
```

Abre tu navegador e ingresa a: **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 📜 Más Información

Si deseas profundizar en la arquitectura interna del sistema, el ciclo de vida de las solicitudes HTTP, los payloads JSON del API o los diagramas de secuencia detallados, consulta el archivo [DOCUMENTACION.md](DOCUMENTACION.md).
