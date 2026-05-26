# Documentación de Arquitectura de Frontend – Portal Académico

Este documento detalla la arquitectura de software, jerarquía de directorios, documentación de archivos clave y el mapa de conectividad con el backend del proyecto **Portal Académico**.

---

## 📂 1. Análisis de Arquitectura (Jerarquía y Estructura)

El frontend está desarrollado sobre **Angular 21** utilizando el paradigma moderno de **Componentes Autónomos (Standalone Components)**. Este enfoque elimina la necesidad de declarar módulos tradicionales de Angular (`NgModule`), permitiendo que cada componente gestione sus propias dependencias de forma explícita.

La jerarquía del directorio principal `src/app` se organiza de la siguiente manera:

* **`src/app/`**
  * **`components/`**: Capa de presentación y vistas funcionales. Contiene subcarpetas independientes para cada sección visual o vista protegida.
    * **`home/`**: Vista pública inicial de la plataforma.
    * **`login/`**: Componente de autenticación y control de acceso.
    * **`navbar/` & `footer/`**: Componentes globales de estructura y navegación.
    * **`portal-alumno/`**: Panel académico reactivo para estudiantes.
    * **`portal-padre/`**: Tablero analítico y de supervisión para padres.
    * **`portal-docente/`**: Panel de gestión pedagógica integral (notas, asistencia, comunicados, mensajería).
  * **`services/`**: Capa lógica e infraestructura. Alberga servicios transversales inyectados como Singletons globales.
    * [auth.service.ts](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/services/auth.service.ts)
  * **Configuraciones raíz**:
    * [app.config.ts](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/app.config.ts): Proveedor global de configuraciones (rutas, clientes HTTP).
    * [app.routes.ts](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/app.routes.ts): Configuración del router.
    * [app.ts](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/app.ts): Componente raíz (Shell) que aloja el `<router-outlet>`.

---

## 📄 2. Documentación Detallada de Archivos

A continuación, se detalla el análisis de los archivos clave del proyecto en base al estándar solicitado:

### Nombre del archivo: [app.config.ts](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/app.config.ts)
* **Propósito**: Definir y exportar los proveedores de configuración esenciales para arrancar la aplicación de Angular.
* **Dependencias**: Inyecta configuraciones core de `@angular/core` (`ApplicationConfig`, `provideBrowserGlobalErrorListeners`), `@angular/router` (`provideRouter`), y `@angular/common/http` (`provideHttpClient`).
* **Lógica clave**:
  * Registra las rutas globales mediante `provideRouter(routes)`.
  * Habilita el cliente HTTP global `provideHttpClient()` para permitir llamadas a APIs externas.
  * Configura escuchadores de errores del navegador mediante `provideBrowserGlobalErrorListeners()`.

### Nombre del archivo: [app.routes.ts](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/app.routes.ts)
* **Propósito**: Definir la tabla de enrutamiento principal de la aplicación, asignando URLs del navegador a componentes específicos.
* **Dependencias**: Importa la clase `Routes` de `@angular/router` y los componentes de las vistas principales.
* **Lógica clave**:
  * Mapea rutas planas: vacío (`''`) para la landing pública, `/portal/docente`, `/portal/padre` y `/portal/alumno` a sus respectivos componentes.
  * Define un comodín `**` para redireccionar cualquier ruta inexistente a la raíz (`''`).

### Nombre del archivo: [auth.service.ts](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/services/auth.service.ts)
* **Propósito**: Administrar la sesión activa del usuario. Guarda tokens JWT, roles y credenciales en `localStorage`, exponiendo el estado global del login en la interfaz de usuario de forma reactiva.
* **Dependencias**: Usa `@angular/core` para declarar el servicio global mediante `@Injectable({ providedIn: 'root' })` (patrón **Singleton**). Inyecta la API de **Signals** de Angular.
* **Lógica clave**:
  * Declara un Signal reactivo `isLoginOpen` para abrir o cerrar de forma síncrona el modal de autenticación.
  * Implementa [saveSession](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/services/auth.service.ts#L16-L22) para persistir datos de la sesión y [logout](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/services/auth.service.ts#L24-L27) para limpiarlos.
  * Define [getPortalRoute](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/services/auth.service.ts#L36-L44) para redirigir condicionalmente según el rol del usuario (`maestro`, `alumno`, `padre`, `admin`).

### Nombre del archivo: [login.ts](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/components/login/login.ts)
* **Propósito**: Controlador del formulario de autenticación. Realiza la llamada HTTP POST para validar credenciales y asienta la sesión en caso de éxito.
* **Dependencias**:
  * Inyecta [AuthService](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/services/auth.service.ts) para delegar el guardado de sesión.
  * Inyecta `Router` y `HttpClient` de Angular.
* **Lógica clave**:
  * Mantiene campos reactivos mediante Signals (`codigo`, `password`, `remember`, `showPass`, `loading`, `error`).
  * En [onSubmit](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/components/login/login.ts#L43-L69), ejecuta una petición POST a `http://localhost:8080/api/auth/login` enviando el identificador y la contraseña.
  * Procesa la respuesta asíncrona mediante un Observable de RxJS (`.subscribe()`), guardando la sesión al completarse y redirigiendo al portal correspondiente.

### Nombre del archivo: [portal-alumno.ts](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/components/portal-alumno/portal-alumno.ts)
* **Propósito**: Controlador del panel principal del estudiante. Permite visualizar el avance de cursos y las tareas del período académico vigente.
* **Dependencias**: Inyecta [AuthService](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/services/auth.service.ts) para extraer metadatos de sesión, además de `Router` y `HttpClient`.
* **Lógica clave**:
  * Implementa el ciclo de vida `OnInit` para verificar la existencia de una sesión válida.
  * En [ngOnInit](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/components/portal-alumno/portal-alumno.ts#L100-L126), recupera el token de sesión y realiza un GET a `http://localhost:8080/api/portal/alumno/mis-cursos` inyectando el header `Authorization: Bearer <token>`.
  * Utiliza Signals como `cursos`, `cargando` y `errorCarga` para actualizar la vista sin generar parpadeos en el DOM.

### Nombre del archivo: [portal-padre.ts](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/components/portal-padre/portal-padre.ts)
* **Propósito**: Panel administrativo para los padres de familia, permitiendo monitorizar el estado académico de uno o más estudiantes asociados.
* **Dependencias**: Inyecta [AuthService](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/services/auth.service.ts), `HttpClient` y `Router`.
* **Lógica clave**:
  * Inicia la carga en el constructor llamando a [cargarResumen](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/components/portal-padre/portal-padre.ts#L91-L109) mediante una llamada HTTP GET a `/api/portal/padre/resumen`.
  * Utiliza **Signals Computados** (`hijoActual` y `hijosEnRiesgo`) que optimizan el rendimiento calculando valores derivados automáticamente sólo cuando sus señales fuente cambian.
  * Aplica un formateador de datos `mapHijo` para moldear la respuesta JSON del servidor (`HijoApi`) en el modelo estructurado del frontend (`Hijo`).

### Nombre del archivo: [portal-docente.ts](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/components/portal-docente/portal-docente.ts)
* **Propósito**: Panel de control del maestro para gestionar notas de exámenes, tareas, tomar asistencia por fechas, publicar comunicados (refuerzos) y mensajería con los padres.
* **Dependencias**: Inyecta [AuthService](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/services/auth.service.ts), `HttpClient` y `Router`.
* **Lógica clave**:
  * **Componente Robusto (Monolítico local)**: El componente gestiona múltiples subsecciones a través de signals de estado como `activeSection` e interactúa con múltiples endpoints:
    * `/api/portal/docente/mis-cursos` (GET) para listar cursos a cargo.
    * `/api/portal/docente/mensajes` (GET/POST) para ver y responder hilos de mensajes a padres.
    * `/api/portal/docente/comunicados` (GET/POST/DELETE) para anuncios.
    * `/api/portal/docente/mi-horario` (GET) para poblar dinámicamente un calendario interactivo con cálculos de posiciones visuales mediante CSS dinámico.
  * **Estructuración reactiva**: El árbol de contenidos del curso (semanas, clases y materiales didácticos) es calculado reactivamente con un signal `computed` (`contenidoArbol`), agrupando colecciones planas recuperadas de la API.
  * **Gestión de Acordeones**: Utiliza conjuntos eficientes (`Set<number>` y `Set<string>`) a través de signals para controlar qué pestañas de clases o tareas se encuentran abiertas.

---

## 🔌 3. Mapa de Conectividad con Spring Boot (Flujo de Datos)

El flujo de comunicación entre Angular y Spring Boot se estructura de la siguiente manera:

```
┌──────────────────────────────────────┐          HTTP Requests (JSON)          ┌──────────────────────────────────────┐
│           FRONTEND ANGULAR           │ ─────────────────────────────────────> │         BACKEND SPRING BOOT          │
│                                      │ <───────────────────────────────────── │                                      │
│  [Componente de UI (Vista)]          │          JWT Token (Bearer)            │  [RestControllers API]               │
│             │                        │                                        │  - AuthController                    │
│             ▼                        │                                        │  - AlumnoController                  │
│       (Signals State)                │                                        │  - DocenteController                 │
│             │                        │                                        │  - PadreController                   │
│             ▼                        │                                        │                   │                  │
│     [Petición HttpClient]            │                                        │                   ▼                  │
│             │                        │                                        │          [Capa de Servicios]         │
│             ▼                        │                                        │                   │                  │
│    [Headers: Authorization] ─────────┼────────────────────────────────────────┼────────► [Spring Security / JWT]      │
│                                      │                                        │                   │                  │
│  [Servicio Global: AuthService]      │                                        │                   ▼                  │
│   (Guarda Token en LocalStorage)     │                                        │          [Base de Datos Postgres]    │
└──────────────────────────────────────┘                                        └──────────────────────────────────────┘
```

1. **Autenticación**: El usuario ingresa credenciales en el modal. `login.ts` hace POST a `/api/auth/login`. El servidor responde con un JSON conteniendo un JWT (JSON Web Token).
2. **Persistencia del Token**: El token y metadatos se guardan en `localStorage` a través de `AuthService`.
3. **Peticiones Protegidas**: Cuando se accede a un portal (alumno, docente o padre), el componente extrae el token usando `auth.getToken()`, añade el encabezado `Authorization: Bearer <token>` y realiza las peticiones correspondientes a los recursos API REST expuestos por Spring Boot.
4. **Respuestas Reactivas**: Los componentes se suscriben (`subscribe()`) a estas respuestas asíncronas de la API, transforman los datos si es necesario, y actualizan sus correspondientes `signals`. Esto fuerza la renderización reactiva de las vistas de manera instantánea y controlada.

---

## 🛠️ 4. Recomendaciones Arquitectónicas (Senior Vision)

### 1. Refactorización a Servicios de Dominio (Desacoplamiento)
**Problema actual**: Los componentes (`portal-alumno.ts`, `portal-docente.ts`, `portal-padre.ts`) realizan llamadas directas de `HttpClient` e insertan URLs codificadas a fuego (hardcoded). Esto rompe el principio de responsabilidad única (SRP).
**Solución**: Crear servicios específicos por rol que encapsulen la lógica de comunicación con el backend.
* Ejemplo: Crear `AlumnoService`, `DocenteService`, `PadreService`.
* Beneficio: Aísla el protocolo HTTP, centraliza la gestión de rutas y simplifica las pruebas unitarias.

### 2. Implementación de Interceptor HTTP para JWT
**Problema actual**: Cada componente debe implementar manualmente la cabecera `Authorization: Bearer <token>` en sus peticiones. Esto duplica código y aumenta la posibilidad de errores si expira o cambia el método de sesión.
**Solución**: Configurar un `HttpInterceptorFn` en Angular:
```typescript
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  return next(req);
};
```
* Configuración en [app.config.ts](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/app.config.ts):
```typescript
provideHttpClient(withInterceptors([jwtInterceptor]))
```
* Beneficio: Remueve por completo la inyección y configuración repetitiva de `HttpHeaders` en todos los componentes.
