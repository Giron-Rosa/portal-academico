# Portal del Docente — Documentación Técnica Completa

Este documento describe en profundidad la implementación del **Portal del Docente**, el módulo más extenso del sistema. Se detalla la arquitectura del componente Angular, cada una de sus interfaces, signals, métodos, la conexión con el backend, y la estructura del template HTML y los estilos SCSS.

**Archivo principal**: `frontend/src/app/components/portal-docente/portal-docente.ts` (~1 794 líneas)  
**Template**: `portal-docente.html` (~2 189 líneas)  
**Estilos**: `portal-docente.scss` (~3 208 líneas)

---

## 📁 Estructura de Archivos del Componente

```
frontend/src/app/components/portal-docente/
├── portal-docente.ts      ← Lógica del componente (interfaces, signals, métodos)
├── portal-docente.html    ← Template con las 8 secciones del portal
└── portal-docente.scss    ← Estilos completos (~3 200 líneas)
```

---

## 🔌 Importaciones y Dependencias (Líneas 1–6)

```typescript
import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
```

| Importación | Propósito |
|---|---|
| `signal`, `computed` | Sistema reactivo de Angular 21 (reemplaza a RxJS para estado local) |
| `HostListener` | Escucha clicks en `document` para cerrar el dropdown del avatar |
| `CommonModule` | Directivas `@if`, `@for`, pipes `number`, `slice` |
| `FormsModule` | Two-way binding con `[ngModel]` / `(ngModelChange)` para formularios |
| `HttpClient`, `HttpHeaders` | Llamadas REST al backend con cabecera `Authorization: Bearer <JWT>` |
| `Router` | Navegación programática (solo se usa en `logout()`) |
| `AuthService` | Obtención del JWT, nombre y código del docente autenticado |

---

## 📐 Interfaces de Datos (Líneas 8–304)

El archivo define **20 interfaces** que modelan toda la información que fluye entre el backend y la UI. Están organizadas por módulo funcional:

### Interfaces Generales

#### `Curso` (línea 8) — *Exportada*
Modelo enriquecido de un curso asignado al docente, ya transformado para la UI.

| Campo | Tipo | Descripción |
|---|---|---|
| `idAulaCurso` | `number` | PK de la tabla `aula_cursos`. Clave para todas las llamadas al backend. |
| `nombre` | `string` | Nombre del curso (ej. "Matemática") |
| `grado` | `string` | Grado completo (ej. "5to Secundaria") |
| `seccion` | `string` | Letra de sección (ej. "B") |
| `color` | `string` | Color de fondo de la card, asignado cíclicamente desde `CARD_COLORS` |
| `iconType` | `string` | Clave para el SVG del ícono, mapeado desde `ICON_MAP` |
| `badge` | `string` | Grado abreviado (ej. "5to Sec") |
| `horasSemana` | `number` | Horas semanales de dictado |
| `totalAlumnos` | `number` | Cantidad de alumnos con matrícula activa |

#### `CursoApi` (línea 20) — *Privada*
Estructura cruda que devuelve el endpoint `GET /api/portal/docente/mis-cursos`. El método `mapCurso()` la transforma a `Curso` añadiendo los campos visuales (`color`, `iconType`, `badge`).

#### `Pendiente` (línea 96) — *Exportada*
Representa una tarea o examen que tiene alumnos sin calificar. Se muestra en el sidebar derecho "POR REVISAR".

| Campo | Tipo | Descripción |
|---|---|---|
| `idAulaCurso` | `number` | Identifica el curso para navegar al detalle |
| `tipo` | `string` | `'tarea'` o `'examen'` |
| `grado` | `string` | Grado del curso (ej. "5to Secundaria") |
| `seccion` | `string` | Sección (ej. "B") |
| `curso` | `string` | Nombre del curso |
| `titulo` | `string` | Título de la tarea/examen pendiente |
| `sinCalificar` | `number` | Cantidad de alumnos sin nota |
| `totalAlumnos` | `number` | Total de alumnos asignados |

---

### Interfaces de Mensajería

#### `MensajeResumen` (línea 34) — *Exportada*
Cada fila de la bandeja de entrada del docente. Se usa en la lista lateral izquierda de la sección Mensajes.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `number` | PK del mensaje |
| `asunto` | `string` | Asunto escrito por el padre |
| `tipo` | `string` | `'justificante'`, `'consulta'` o `'otro'` |
| `leido` | `boolean` | Si el docente ya abrió el mensaje |
| `fechaEnvio` | `string` | Formato `"DD/MM/YYYY HH:MM"` |
| `nombrePadre` | `string` | Nombre completo del padre que envió el mensaje |
| `nombreAlumno` | `string \| null` | Nombre del alumno relacionado |
| `grado`, `seccion`, `curso` | `string \| null` | Contexto académico del mensaje |

#### `RespuestaResumen` (línea 48)
Cada respuesta dentro del hilo de un mensaje.

#### `MensajeDetalle` (línea 57) — *Extiende `MensajeResumen`*
Incluye el `cuerpo` del mensaje y la lista de `respuestas` del hilo.

---

### Interfaces del Calendario

#### `ClaseHorario` (línea 63) — *Exportada*
Bloque de clase semanal devuelto por `GET /api/portal/docente/mi-horario`.

| Campo | Tipo | Descripción |
|---|---|---|
| `dia` | `number` | 1=Lunes, 2=Martes, …, 5=Viernes |
| `diaNombre` | `string` | Nombre del día en español |
| `horaInicio` | `string` | Formato `"HH:MM"` (ej. `"07:30"`) |
| `horaFin` | `string` | Formato `"HH:MM"` (ej. `"09:00"`) |
| `curso` | `string` | Nombre del curso |
| `grado`, `seccion` | `string` | Contexto del aula |

---

### Interfaces de Detalle de Curso

#### `Material` (línea 110)
Material didáctico cargado por el docente (PDF, Word, video, enlace, YouTube).

#### `ClaseNodo` / `SemanaNodo` (líneas 121–130)
Estructuras para el árbol de contenido jerárquico: **Semana → Clase → Materiales**. Se construyen dinámicamente en el `computed` `contenidoArbol`.

#### `FormMaterial` (línea 133)
Estado del formulario del modal "Subir Material".

---

### Interfaces de Tareas (Líneas 141–181)

#### `Tarea` (línea 143)
Tarea creada por el docente con estadísticas de entrega.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `number` | PK de `tareas_curso` |
| `numeroTarea` | `number` | Número secuencial de la tarea |
| `semana`, `clase` | `number` | Ubicación académica |
| `titulo` | `string` | Título descriptivo |
| `descripcion` | `string \| null` | Instrucciones opcionales |
| `tipoEntregable` | `string \| null` | Ej. "PDF", "Cuaderno escaneado" |
| `fechaEntrega` | `string \| null` | Formato `"DD/MM/YYYY"` |
| `notaMaxima` | `number` | Nota máxima (default 20) |
| `intentos` | `number` | Intentos permitidos |
| `url` | `string \| null` | URL de referencia |
| `totalAlumnos` | `number` | Alumnos asignados |
| `entregadas` | `number` | Cantidad que ya entregó |
| `noEntregadas` | `number` | Cantidad que no entregó |

#### `NotaTarea` (línea 161)
Registro de entrega/nota de un alumno para una tarea específica.

#### `FormTarea` (línea 170)
Estado local del formulario "Nueva Tarea".

---

### Interfaces de Exámenes (Líneas 183–224)

#### `Examen` (línea 185)
Similar a `Tarea` pero con campos específicos de examen: `tipo` (escrito/oral/online/practico), `duracionMinutos`, estadísticas `asistieron`/`noAsistieron`/`calificados`.

#### `NotaExamen` (línea 204)
Registro nota/asistencia de un alumno para un examen.

#### `FormExamen` (línea 213)
Estado del formulario "Nuevo Examen".

---

### Interfaces de Reportes (Líneas 226–253)

#### `Reporte` (línea 228)
Reporte emitido por el docente sobre un alumno. Tipos: `pendiente`, `anotacion`, `llamada_atencion`, `felicitacion`, `otro`. Tiene campo `visiblePadre` para controlar si el padre lo ve.

#### `AlumnoReportes` (línea 238)
Agrupa todos los reportes de un alumno: `idAlumno`, `codigo`, `nombres`, `totalReportes`, `reportes[]`.

#### `FormReporte` (línea 246)
Estado del formulario "Nuevo Reporte".

---

### Interfaces de Asistencia (Líneas 255–273)

#### `AsistenciaAlumno` (línea 257)
Registro de asistencia de un alumno para una fecha. Estados: `presente`, `falta`, `tardanza`, `justificado`. Campo `justificante` para el motivo.

#### `SesionAsistencia` (línea 266)
Sesión completa de una fecha: `fecha`, 4 contadores de totales, y la lista de `alumnos`.

---

### Interfaces de Comunicados / Refuerzos (Líneas 275–304)

#### `AulaSimple` (línea 278)
Aula reducida (id, grado, sección) para el selector del formulario de comunicados.

#### `Comunicado` (línea 285)
Comunicado emitido por el docente. Tipos: `examen`, `actividad`, `reunion_padres`, `paseo`, `dia_festivo`, `general`.

#### `FormComunicado` (línea 298)
Estado del formulario de nuevo comunicado.

---

## 🎨 Constantes de Configuración (Líneas 77–318)

### `CURSO_COLORS` (línea 77)
Paleta de colores hexadecimales para los bloques del calendario semanal. Mapea el nombre del curso en minúsculas a un color:

```typescript
'matemática': '#4361ee',     // azul
'comunicación': '#ef476f',   // rosa
'ciencia y tecnología': '#06d6a0', // verde
// ...9 cursos definidos
```

### `CAL_HORA_INICIO`, `CAL_HORA_FIN`, `CAL_PX_POR_HORA` (líneas 89–94)
Configuración de la grilla visual del calendario:
* **Inicio**: 7:00 AM
* **Fin**: 3:00 PM (15:00)
* **Resolución**: 64 píxeles por hora → cada bloque de 90 min mide 96px

### `CARD_COLORS` (línea 306)
8 colores pastel que se asignan cíclicamente a las cards de los cursos en la sección Inicio.

### `ICON_MAP` (línea 308)
Mapea el nombre del curso a una clave de ícono SVG (`'algebra'`, `'comunica'`, `'trigo'`, `'historia'`, `'geo'`, `'razon'`). Se usa en el template para renderizar el ícono correspondiente.

---

## ⚡ Declaración del Componente (Líneas 320–325)

```typescript
@Component({
  selector: 'app-portal-docente',
  imports: [CommonModule, FormsModule],
  templateUrl: './portal-docente.html',
  styleUrl: './portal-docente.scss',
})
export class PortalDocente { ... }
```

* **Selector**: `<app-portal-docente>` — se instancia en la ruta `/portal/docente`.
* **Standalone**: Usa `imports` directamente (sin módulo separado).
* **Módulos importados**: `CommonModule` (directivas de control de flujo) + `FormsModule` (bindings bidireccionales).

---

## 🧠 Inyección de Dependencias (Líneas 327–329)

```typescript
private router = inject(Router);
private auth   = inject(AuthService);
private http   = inject(HttpClient);
```

Usa la función `inject()` de Angular 21 (en lugar del constructor). Las tres dependencias cubren:
1. **Router**: Solo para `logout()` → redirección a `/`.
2. **AuthService**: JWT token, nombre, código del docente.
3. **HttpClient**: Todas las llamadas REST al backend.

---

## 📡 Signals — Estado Reactivo del Componente (Líneas 331–561)

El componente utiliza **62 signals** y **9 computed** para manejar todo el estado reactivo sin observables RxJS.

### Signals de Navegación General (Líneas 331–349)

| Signal | Tipo | Default | Propósito |
|---|---|---|---|
| `activeSection` | `string` | `'inicio'` | Sección activa: `'inicio'`, `'calendario'`, `'mensajes'`, `'refuerzos'`, `'curso-detalle'` |
| `activeGrade` | `string` | `'Todos'` | Filtro de grado en la sección Inicio |
| `selectedYear` | `string` | `'2026'` | Año académico seleccionado |
| `dropdownOpen` | `boolean` | `false` | Controla el menú desplegable del avatar |
| `cargando` | `boolean` | `false` | Loading state de la carga de cursos |
| `errorCarga` | `string` | `''` | Mensaje de error si falla la carga |
| `cursos` | `Curso[]` | `[]` | Lista completa de cursos del docente |
| `pendientes` | `Pendiente[]` | `[]` | Tareas/exámenes sin calificar (sidebar derecho) |

### Datos del Docente (Líneas 338–340)

```typescript
nombre    = this.auth.getNombre() ?? 'Docente';
codigo    = this.auth.getCodigo() ?? '';
iniciales = this.nombre.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();
```

Se extraen del `AuthService` al instanciar el componente. Las `iniciales` generan las letras del avatar (ej. "OC" para "Oscar Castillo").

### Signals de Mensajería (Líneas 354–384)

| Signal | Tipo | Propósito |
|---|---|---|
| `mensajes` | `MensajeResumen[]` | Bandeja de entrada completa |
| `mensajeActivo` | `MensajeDetalle \| null` | Mensaje abierto en el panel de detalle |
| `cargandoMensajes` | `boolean` | Loading state |
| `errorMensajes` | `string` | Mensaje de error |
| `filtroGradoMsg` | `string` | Filtro por grado (`''` = Todos) |
| `replyText` | `string` | Texto de respuesta que está escribiendo el docente |
| `enviandoReply` | `boolean` | Loading del envío de respuesta |

**Computed derivados**:
* `gradosMensajes` → extrae grados únicos de los mensajes para los tabs de filtro.
* `mensajesFiltrados` → filtra los mensajes por el grado seleccionado.
* `noLeidos` → cuenta mensajes con `leido === false` (para el badge del sidebar).

### Signals de Detalle de Curso (Líneas 386–424)

| Signal | Tipo | Propósito |
|---|---|---|
| `cursoActivo` | `Curso \| null` | El curso abierto en la vista de detalle |
| `activeSubTab` | `string` | Tab activo: `'asistencia'`, `'contenido'`, `'tareas'`, `'examenes'`, `'reportes'` |
| `materiales` | `Material[]` | Materiales del curso activo |
| `cargandoMat` | `boolean` | Loading state de materiales |
| `modalMaterial` | `boolean` | Si el modal "Subir Material" está abierto |
| `enviandoMat` | `boolean` | Loading del envío del formulario |
| `formMaterial` | `FormMaterial` | Estado del formulario del modal |
| `semanasAbiertas` | `Set<number>` | IDs de semanas expandidas en el acordeón |
| `clasesAbiertas` | `Set<string>` | Claves `"semana-clase"` expandidas |

**Computed derivado**:
* `contenidoArbol` → transforma la lista plana de `materiales` en un árbol `SemanaNodo[] > ClaseNodo[] > Material[]` para renderizar el acordeón jerárquico.

### Signals de Tareas (Líneas 426–443)

| Signal | Tipo | Propósito |
|---|---|---|
| `tareas` | `Tarea[]` | Lista de tareas del curso activo |
| `cargandoTareas` | `boolean` | Loading state |
| `mostrarFormTarea` | `boolean` | Visibilidad del formulario |
| `enviandoTarea` | `boolean` | Loading del envío |
| `formTarea` | `FormTarea` | Estado del formulario |
| `tareasExpandidas` | `Set<number>` | IDs de tareas expandidas en el acordeón |
| `notasPorTarea` | `Map<number, NotaTarea[]>` | Notas cargadas por tarea (lazy loading) |
| `editandoNota` | `Map<number, string>` | Valores temporales de nota en edición inline |
| `guardandoNota` | `Set<number>` | IDs de notas en proceso de guardado |

### Signals de Exámenes (Líneas 445–459)
Estructura idéntica a Tareas: `examenes`, `formExamen`, `examenesExpandidos`, `notasPorExamen`, `editandoNotaEx`, `guardandoNotaEx`.

### Signals de Reportes (Líneas 461–471)

| Signal | Tipo | Propósito |
|---|---|---|
| `reportesAlumnos` | `AlumnoReportes[]` | Lista de alumnos con sus reportes |
| `cargandoReportes` | `boolean` | Loading state |
| `mostrarFormReporte` | `boolean` | Visibilidad del formulario |
| `enviandoReporte` | `boolean` | Loading del envío |
| `alumnosExpandidos` | `Set<number>` | IDs de alumnos expandidos |
| `formReporte` | `FormReporte` | Estado del formulario |

### Signals de Asistencia (Líneas 473–482)

| Signal | Tipo | Propósito |
|---|---|---|
| `sesionAsistencia` | `SesionAsistencia \| null` | Datos del backend de la sesión actual |
| `cargandoAsistencia` | `boolean` | Loading state |
| `guardandoAsistencia` | `boolean` | Loading del guardado bulk |
| `asistenciaModificada` | `boolean` | `true` si hay cambios locales sin guardar |
| `fechaAsistencia` | `string` | Fecha seleccionada (`'YYYY-MM-DD'`) |
| `fechasSesiones` | `string[]` | Fechas con sesiones guardadas (historial) |
| `asistenciaLocal` | `AsistenciaAlumno[]` | Copia editable que se modifica antes de guardar |

### Signals de Comunicados / Refuerzos (Líneas 484–516)

| Signal | Tipo | Propósito |
|---|---|---|
| `comunicados` | `Comunicado[]` | Lista de comunicados del docente |
| `cargandoComunicados` | `boolean` | Loading state |
| `errorComunicados` | `string` | Error de carga |
| `misAulas` | `AulaSimple[]` | Aulas para el selector del formulario |
| `mostrarFormCom` | `boolean` | Visibilidad del formulario |
| `enviandoCom` | `boolean` | Loading del envío |
| `filtroGradoCom` | `string` | Filtro por grado |
| `formCom` | `FormComunicado` | Estado del formulario |

**Computed derivados**: `gradosComunicados`, `comunicadosFiltrados` — misma lógica que en mensajería.

### Signals del Calendario (Líneas 518–570)

| Signal / Propiedad | Tipo | Propósito |
|---|---|---|
| `horario` | `ClaseHorario[]` | Bloques de clase del backend |
| `cargandoHorario` | `boolean` | Loading state |
| `errorHorario` | `string` | Error de carga |
| `semanaInicio` | `Date` | Lunes de la semana visible (inicia en la semana actual) |
| `horasGrilla` | `string[]` | Etiquetas del eje Y: `["07:00", "08:00", ..., "14:00"]` |
| `altoGrilla` | `number` | Altura total en px: `(15 - 7) × 64 = 512px` |
| `diasSemana` | `array` | 5 objetos con `num`, `corto` ("Lun"), `largo` ("Lunes") |

**Computed derivados**:
* `semanaLabel` → etiqueta de la semana visible (ej. "19 – 23 de mayo, 2026").
* `hoyDia` → número ISO del día actual (1–5), 0 si es fin de semana.
* `grades` → grados únicos + "Todos" para las tabs de filtro de cursos.
* `filteredCursos` → cursos filtrados por grado seleccionado.

---

## 🏗️ Constructor — Carga Inicial (Líneas 583–590)

```typescript
constructor() {
  this.cargarCursos();
  this.cargarHorario();
  this.cargarMensajes();
  this.cargarComunicados();
  this.cargarMisAulas();
  this.cargarPendientes();
}
```

Al instanciarse el componente, lanza **6 llamadas HTTP en paralelo** para cargar toda la información necesaria del docente. Todas comparten el mismo patrón:
1. Obtener token JWT de `AuthService`.
2. Si no hay token, `return` silencioso.
3. Activar signal de carga (`cargandoX.set(true)`).
4. `HttpClient.get()` con cabecera `Authorization: Bearer <token>`.
5. En `next`: guardar datos en signal y desactivar carga.
6. En `error`: guardar mensaje de error y desactivar carga.

---

## 🔧 Métodos — Clasificación Completa (Líneas 592–1794)

### Helpers del Calendario (Líneas 592–663)

| Método | Línea | Descripción |
|---|---|---|
| `getMonday(fecha)` | 600 | Devuelve el lunes de la semana de una fecha dada. Usa aritmética ISO (lunes = 1). |
| `semanaAnterior()` | 610 | Resta 7 días a `semanaInicio` para ver la semana anterior. |
| `semanaSiguiente()` | 617 | Suma 7 días a `semanaInicio`. |
| `semanaHoy()` | 624 | Resetea `semanaInicio` al lunes de la semana actual. |
| `clasesDelDia(dia)` | 632 | Filtra `horario()` por número de día (1–5) para poblar columnas. |
| `blockTop(horaInicio)` | 640 | Calcula `top` en px: `(minutos_desde_7am) × 64/60`. |
| `blockHeight(horaInicio, horaFin)` | 650 | Calcula `height` en px: `duración_en_min × 64/60 - 2`. |
| `cursoColor(curso)` | 661 | Busca en `CURSO_COLORS` por nombre en minúsculas, fallback `'#94a3b8'`. |

### Carga de Cursos (Líneas 665–936)

| Método | Línea | Endpoint | Descripción |
|---|---|---|---|
| `cargarCursos()` | 669 | `GET /mis-cursos` | Obtiene cursos del docente y los transforma con `mapCurso()`. |
| `mapCurso(c, idx)` | 920 | — | Transforma `CursoApi` → `Curso` asignando color, ícono y badge abreviado. |

### Mensajería (Líneas 691–772)

| Método | Línea | Endpoint | Descripción |
|---|---|---|---|
| `cargarMensajes()` | 694 | `GET /mensajes` | Carga la bandeja de entrada. |
| `abrirMensaje(id)` | 712 | `GET /mensajes/{id}` | Obtiene detalle + hilo de respuestas. El backend marca el mensaje como leído automáticamente. Actualiza el flag `leido` localmente sin recargar toda la lista. |
| `enviarRespuesta()` | 734 | `POST /mensajes/{id}/responder` | Envía `{ cuerpo }` y recarga el detalle para mostrar la nueva respuesta. |
| `tiempoRelativo(fechaStr)` | 759 | — | Convierte `"DD/MM/YYYY HH:MM"` a texto relativo: "hace 2 horas", "hace 3 días". |

### Comunicados / Refuerzos (Líneas 774–895)

| Método | Línea | Endpoint | Descripción |
|---|---|---|---|
| `cargarComunicados()` | 777 | `GET /comunicados` | Carga los comunicados del docente. |
| `cargarMisAulas()` | 791 | `GET /comunicados/mis-aulas` | Carga aulas para el selector del formulario. |
| `toggleFormCom()` | 800 | — | Abre/cierra formulario y resetea al abrir. |
| `setFormCom(campo, valor)` | 809 | — | Actualiza un campo del formulario reactivamente. |
| `enviarComunicado()` | 818 | `POST /comunicados` | Crea comunicado, inserta localmente y recarga para orden correcto. |
| `eliminarComunicado(id)` | 849 | `DELETE /comunicados/{id}` | **Optimistic update**: quita de la lista local antes de confirmar con el backend. Si falla, recarga todo. |
| `colorTipo(tipo)` | 858 | — | Devuelve color de fondo del badge de tipo (ej. `examen` → `#fee2e2`). |
| `colorTipoTexto(tipo)` | 872 | — | Devuelve color de texto del badge. |
| `labelTipo(tipo)` | 884 | — | Devuelve etiqueta legible (ej. `reunion_padres` → "Reunión de Padres"). |

### Horario (Líneas 897–918)

| Método | Línea | Endpoint |
|---|---|---|
| `cargarHorario()` | 898 | `GET /mi-horario` |

### Navegación al Detalle de Curso (Líneas 938–995)

#### `abrirCurso(curso)` (línea 941)
Punto de entrada principal cuando el docente hace click en una card de curso.

**Acciones en secuencia**:
1. `cursoActivo.set(curso)` — almacena el curso seleccionado.
2. `activeSection.set('curso-detalle')` — cambia la vista principal.
3. `activeSubTab.set('contenido')` — abre el tab Contenido por defecto.
4. Expande Semana 1, Clase 1 del acordeón.
5. Lanza **5 llamadas HTTP en paralelo** para cargar: materiales, tareas, exámenes, reportes y asistencia.
6. Inicializa la fecha de asistencia a hoy y carga fechas de sesiones guardadas.

#### `volverAlInicio()` (línea 957)
Limpia **todo** el estado del detalle de curso:
* Resetea 14 signals a sus valores vacíos/iniciales.
* Cambia `activeSection` de vuelta a `'inicio'`.

#### `toggleSemana(s)` / `toggleClase(s, c)` (líneas 978, 988)
Alternan la expansión de semanas y clases en el acordeón de contenido usando `Set.add()`/`Set.delete()`.

### Materiales (Líneas 997–1099)

| Método | Línea | Endpoint | Descripción |
|---|---|---|---|
| `cargarMateriales(idAulaCurso)` | 998 | `GET /cursos/{id}/materiales` | Carga materiales del curso. |
| `toggleModalMaterial(abrir)` | 1013 | — | Abre/cierra modal y resetea formulario. |
| `setFormMat(campo, valor)` | 1021 | — | Actualiza campo del formulario. |
| `stepperMat(campo, delta)` | 1026 | — | Incrementa/decrementa semana o clase (mín. 1). |
| `enviarMaterial()` | 1034 | `POST /cursos/{id}/materiales` | Crea material, cierra modal, recarga lista, y **expande automáticamente** la semana/clase del nuevo material. |
| `eliminarMaterial(id)` | 1067 | `DELETE /cursos/materiales/{id}` | **Optimistic update**: quita localmente primero. |
| `iconoMaterial(tipo)` | 1080 | — | Devuelve path SVG según tipo. |
| `colorMaterial(tipo)` | 1092 | — | Devuelve color del ícono según tipo. |
| `labelMaterial(tipo)` | 1097 | — | Devuelve etiqueta legible. |

### Tareas (Líneas 1101–1293)

| Método | Línea | Endpoint | Descripción |
|---|---|---|---|
| `cargarTareas(idAulaCurso)` | 1104 | `GET /cursos/{id}/tareas` | Carga tareas del curso. |
| `setFormTarea(campo, valor)` | 1119 | — | Actualiza campo del formulario. |
| `stepperTarea(campo, delta)` | 1124 | — | Stepper para campos numéricos. |
| `toggleFormTarea(abrir)` | 1132 | — | Abre/cierra y auto-incrementa `numeroTarea`. |
| `enviarTarea()` | 1145 | `POST /cursos/{id}/tareas` | Crea tarea en el backend. |
| `eliminarTarea(id)` | 1180 | `DELETE /tareas/{id}` | Optimistic update + limpia notas y expansión. |
| `toggleTarea(id)` | 1195 | — | Expande/colapsa tarea. **Lazy loading**: carga notas solo la primera vez que se expande. |
| `cargarNotasTarea(idTarea)` | 1209 | `GET /tareas/{id}/notas` | Carga la planilla de notas. |
| `iniciarEditNota(idNota, notaActual)` | 1222 | — | Inicia edición inline: guarda el valor actual como string en `editandoNota`. |
| `cancelarEditNota(idNota)` | 1227 | — | Cancela edición inline. |
| `setEditNota(idNota, valor)` | 1232 | — | Actualiza valor temporal mientras el docente escribe. |
| `guardarNotaAlumno(idNota, idTarea, entregado?)` | 1237 | `PATCH /tareas/notas/{id}` | Guarda nota y/o estado entregado. Actualiza localmente la nota + recalcula estadísticas de la tarea. |
| `toggleEntregado(idNota, idTarea, entregadoActual)` | 1279 | `PATCH /tareas/notas/{id}` | Toggle rápido de entregado con optimistic update. |

#### Flujo de Edición Inline de Notas

```
1. El docente hace click en la celda de nota → iniciarEditNota()
   → Se guarda el valor actual como string en el Map<idNota, string>
2. El docente escribe un nuevo valor → setEditNota()
   → Se actualiza el string temporal en el Map
3a. Si presiona Enter / click en ✓ → guardarNotaAlumno()
   → Se parsea el string a float, se envía PATCH al backend
   → Se actualiza la nota en notasPorTarea y se recalculan estadísticas
3b. Si presiona Esc / click fuera → cancelarEditNota()
   → Se elimina la entrada del Map
```

### Exámenes (Líneas 1295–1484)
Estructura **idéntica** a Tareas, con los métodos correspondientes:
* `cargarExamenes`, `setFormExamen`, `stepperExamen`, `toggleFormExamen`, `enviarExamen`, `eliminarExamen`
* `toggleExamen`, `cargarNotasExamen`
* `iniciarEditNotaEx`, `cancelarEditNotaEx`, `setEditNotaEx`, `guardarNotaExamen`
* `toggleAsistio` — toggle de asistencia del alumno al examen (optimistic update)
* `labelTipoExamen(tipo)` — convierte `'escrito'`→`'Escrito'`, etc.

### Reportes (Líneas 1486–1614)

| Método | Línea | Endpoint | Descripción |
|---|---|---|---|
| `cargarReportes(idAulaCurso)` | 1488 | `GET /cursos/{id}/reportes` | Carga reportes agrupados por alumno. |
| `toggleAlumnoReportes(idAlumno)` | 1502 | — | Expande/colapsa un alumno. |
| `toggleFormReporte(abrir)` | 1510 | — | Abre/cierra formulario y resetea. |
| `setFormReporte(campo, valor)` | 1520 | — | Actualiza campo del formulario. |
| `enviarReporte()` | 1524 | `POST /cursos/{id}/reportes` | Crea reporte, inserta localmente en el alumno correcto, y lo expande automáticamente. |
| `eliminarReporte(idReporte, idAlumno)` | 1562 | `DELETE /reportes/{id}` | Optimistic update: quita del alumno y decrementa `totalReportes`. |
| `toggleVisibilidadReporte(idReporte, idAlumno)` | 1586 | `PATCH /reportes/{id}/visibilidad` | Alterna si el padre puede ver el reporte. Optimistic update + confirmación del backend. |
| `contarTipoReporte(reportes, tipo)` | 1736 | — | Cuenta reportes de un tipo específico. |
| `tipoReporteInfo(tipo)` | 1741 | — | Devuelve `{ label, css }` para renderizar el badge del tipo. |

### Asistencia (Líneas 1616–1733)

| Método | Línea | Endpoint | Descripción |
|---|---|---|---|
| `hoy()` | 1619 | — | Helper privado: devuelve `'YYYY-MM-DD'` de hoy. |
| `cargarSesionAsistencia(idAulaCurso, fecha?)` | 1623 | `GET /cursos/{id}/asistencia?fecha=` | Carga la sesión. Si no hay registros para esa fecha, el backend devuelve alumnos con estado `'presente'` por defecto. Clona los datos a `asistenciaLocal` para edición. |
| `cargarFechasSesiones(idAulaCurso)` | 1644 | `GET /cursos/{id}/asistencia/fechas` | Carga el historial de fechas guardadas. |
| `cambiarFechaAsistencia(fecha)` | 1654 | — | Cambia la fecha; si hay cambios sin guardar, pide confirmación con `confirm()`. |
| `setEstadoAsistencia(idAlumno, estado)` | 1663 | — | Cambia el estado de un alumno en la copia local. Si el nuevo estado no es `'justificado'`, limpia el justificante. |
| `setJustificanteAsistencia(idAlumno, justificante)` | 1673 | — | Actualiza el texto del justificante de un alumno. |
| `marcarTodosPresentes()` | 1680 | — | Acción rápida: pone todos los alumnos como `'presente'` y limpia justificantes. |
| `guardarAsistencia()` | 1687 | `POST /cursos/{id}/asistencia` | Envía todos los registros en bulk. El backend hace **UPSERT** (`INSERT ON CONFLICT DO UPDATE`). Tras guardar, recarga el historial de fechas. |
| `asistenciaStats()` | 1718 | — | Calcula contadores sobre `asistenciaLocal()`. Se llama desde el template para la barra de estadísticas y la barra de progreso. |
| `formatFechaCorta(fechaStr)` | 1729 | — | Convierte `'YYYY-MM-DD'` → `"Mié 21 May"` con `toLocaleDateString('es-PE')`. |

### Pendientes (Líneas 1752–1774)

| Método | Línea | Endpoint | Descripción |
|---|---|---|---|
| `cargarPendientes()` | 1754 | `GET /pendientes` | Carga tareas y exámenes sin calificar para el sidebar. |
| `irAPendiente(item)` | 1768 | — | Busca el curso en `cursos()` por `idAulaCurso`, llama a `abrirCurso(curso)`, y cambia `activeSubTab` a `'tareas'` o `'examenes'` según `item.tipo`. |

### Métodos de Navegación Global (Líneas 1776–1793)

| Método | Línea | Descripción |
|---|---|---|
| `setSection(id)` | 1776 | Cambia sección activa y cierra dropdown. |
| `setGrade(grado)` | 1777 | Cambia filtro de grado. |
| `setYear(year)` | 1778 | Cambia año académico. |
| `toggleDropdown()` | 1779 | Alterna menú del avatar. |
| `onDocClick(e)` | 1781 | `@HostListener('document:click')` — cierra dropdown si el click no fue dentro de `.pd-avatar-wrapper`. |
| `logout()` | 1789 | Cierra sesión en `AuthService` y navega a `/`. |

---

## 🖼️ Estructura del Template HTML

El template está organizado en un layout de 3 columnas:

```
┌────────────┬──────────────────────────────────┬─────────────┐
│  Sidebar   │           Main Content            │  Right      │
│  Izquierdo │                                    │  Sidebar   │
│  (nav)     │  Secciones intercambiables         │ (Pendientes)│
│            │  controladas por activeSection()    │             │
└────────────┴──────────────────────────────────┴─────────────┘
```

### Secciones Principales (controladas por `activeSection()`)

| Valor | Contenido | Líneas aprox. |
|---|---|---|
| `'inicio'` | Cards de cursos con filtro por grado, loading, error y estado vacío | 100–205 |
| `'curso-detalle'` | Breadcrumb + Tab bar + 5 sub-tabs | 207–1270 |
| `'calendario'` | Grilla semanal con bloques de horario posicionados absolutamente | 1270–1500 |
| `'mensajes'` | Bandeja de entrada (izq) + detalle de mensaje (der) + formulario de respuesta | 1500–1850 |
| `'refuerzos'` | Lista de comunicados con filtro + formulario de creación | 1850–2113 |

### Sub-Tabs del Detalle de Curso (controlados por `activeSubTab()`)

| Tab | Contenido |
|---|---|
| `'asistencia'` | Selector de fecha + barra de stats + lista de alumnos con 4 botones de estado + justificante inline + botón guardar bulk |
| `'contenido'` | Acordeón Semana → Clase → Materiales + modal Subir Material |
| `'tareas'` | Formulario nueva tarea + lista acordeón con calificación inline |
| `'examenes'` | Formulario nuevo examen + lista acordeón con calificación inline |
| `'reportes'` | Formulario nuevo reporte + lista por alumno expandible |

### Sidebar Derecho — "POR REVISAR"

Muestra cards clickeables con:
* Badge de tipo (Tarea/Examen) + grado/sección
* Nombre del curso + título del pendiente
* Contador rojo "N sin calificar"
* Click → `irAPendiente(item)` → navega al curso+tab correspondiente

---

## 🎨 Estructura de los Estilos SCSS (~3 208 líneas)

Los estilos están organizados en **bloques temáticos** con prefijos de clase:

| Prefijo | Módulo | Líneas aprox. |
|---|---|---|
| `.pd-` | Layout general, sidebar, header, cards, loading | 1–435 |
| `.cd-` | Detalle de curso, tabs, breadcrumb, acordeón, modal | 436–1920 |
| `.tr-` | Tab Tareas: formulario, acordeón, calificación inline | 1920–2313 |
| `.ex-` | Tab Exámenes: estilos específicos | 2313–2415 |
| `.rp-` | Tab Reportes: cards de alumno, formulario, badges de tipo | 2415–2816 |
| `.as-` | Tab Asistencia: barra de fecha, stats, botones de estado, justificante | 2818–3192 |
| `.cal-` | Calendario semanal: grilla, bloques, navegación | 3194+ |

### Patrones de Diseño Recurrentes

1. **Optimistic UI**: Los backgrounds de las filas cambian inmediatamente al interactuar (`.as-row-presente`, `.as-row-falta`, etc.) sin esperar al backend.
2. **Acordeón con chevron animado**: `.cd-chevron` rota con `transform: rotate()` según la clase `.open`.
3. **Edición inline**: Inputs que aparecen/desaparecen según `editandoNota().has(idNota)`.
4. **Responsive**: `@media (max-width: 640px)` oculta textos de botones dejando solo íconos.

---

## 🔗 Diagrama de Conexión Backend ↔ Frontend

```
┌─────────────────────────────────────────────────────────────┐
│                    PORTAL DOCENTE (Angular)                  │
│                                                              │
│  constructor() ─── 6 llamadas HTTP en paralelo ─────────────┤
│     ├── cargarCursos()          → GET /mis-cursos           │
│     ├── cargarHorario()         → GET /mi-horario           │
│     ├── cargarMensajes()        → GET /mensajes             │
│     ├── cargarComunicados()     → GET /comunicados          │
│     ├── cargarMisAulas()        → GET /comunicados/mis-aulas│
│     └── cargarPendientes()      → GET /pendientes           │
│                                                              │
│  abrirCurso() ─── 5 llamadas HTTP en paralelo ──────────────┤
│     ├── cargarMateriales()      → GET /cursos/{id}/materiales│
│     ├── cargarTareas()          → GET /cursos/{id}/tareas   │
│     ├── cargarExamenes()        → GET /cursos/{id}/examenes │
│     ├── cargarReportes()        → GET /cursos/{id}/reportes │
│     └── cargarSesionAsistencia()→ GET /cursos/{id}/asistencia│
│                                                              │
│  Acciones del docente ──────────────────────────────────────┤
│     ├── enviarMaterial()        → POST /cursos/{id}/materiales│
│     ├── eliminarMaterial()      → DELETE /cursos/materiales/{id}│
│     ├── enviarTarea()           → POST /cursos/{id}/tareas  │
│     ├── eliminarTarea()         → DELETE /tareas/{id}       │
│     ├── guardarNotaAlumno()     → PATCH /tareas/notas/{id}  │
│     ├── toggleEntregado()       → PATCH /tareas/notas/{id}  │
│     ├── enviarExamen()          → POST /cursos/{id}/examenes│
│     ├── eliminarExamen()        → DELETE /examenes/{id}     │
│     ├── guardarNotaExamen()     → PATCH /examenes/notas/{id}│
│     ├── toggleAsistio()         → PATCH /examenes/notas/{id}│
│     ├── enviarReporte()         → POST /cursos/{id}/reportes│
│     ├── eliminarReporte()       → DELETE /reportes/{id}     │
│     ├── toggleVisibilidadReporte() → PATCH /reportes/{id}/visibilidad│
│     ├── guardarAsistencia()     → POST /cursos/{id}/asistencia│
│     ├── enviarComunicado()      → POST /comunicados         │
│     ├── eliminarComunicado()    → DELETE /comunicados/{id}  │
│     ├── abrirMensaje()          → GET /mensajes/{id}        │
│     └── enviarRespuesta()       → POST /mensajes/{id}/responder│
│                                                              │
│  TOTAL: ~30 llamadas HTTP distintas                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📌 Patrones Arquitectónicos Clave

### 1. Signal-Based State Management
Todo el estado se maneja con `signal()` y `computed()` de Angular 21. No se usa RxJS para estado local (solo `HttpClient.subscribe()` para las llamadas HTTP). Esto permite:
* Actualizaciones granulares sin change detection innecesaria.
* `update()` para mutaciones inmutables (ej. `this.tareas.update(list => list.filter(...))`).
* `computed()` para derivaciones automáticas (ej. `contenidoArbol`, `filteredCursos`).

### 2. Optimistic Updates
Patrón consistente en todo el componente:
1. Se actualiza el signal local **antes** de enviar la petición HTTP.
2. Si el HTTP falla, se recarga desde el backend (`error: () => this.cargarX()`).
3. Ejemplo en `eliminarTarea()`: se filtra la lista local, luego se envía `DELETE`.

### 3. Lazy Loading de Notas
Las notas de tareas y exámenes no se cargan al abrir un curso. Solo se cargan cuando el docente **expande** una tarea/examen por primera vez:

```typescript
toggleTarea(id) {
  // ...
  if (!this.notasPorTarea().has(id)) this.cargarNotasTarea(id);
}
```

### 4. Inline Editing con 3-Signal Pattern
Cada módulo de edición inline de notas usa 3 signals coordinados:
* `editandoNota: Map<idNota, string>` — valor temporal mientras se edita.
* `guardandoNota: Set<number>` — IDs en proceso de guardado (para spinners).
* `notasPorTarea: Map<number, NotaTarea[]>` — datos finales guardados.

### 5. Upsert Bulk para Asistencia
La asistencia usa un patrón distinto: se edita toda la lista localmente y se guarda en un solo `POST` con `INSERT ON CONFLICT DO UPDATE`, evitando múltiples peticiones individuales.

---

## 📊 Resumen Cuantitativo

| Métrica | Cantidad |
|---|---|
| Interfaces TypeScript | 20 |
| Signals (`signal()`) | 62 |
| Computed (`computed()`) | 9 |
| Métodos públicos | ~55 |
| Métodos privados | ~4 |
| Constantes de configuración | 5 |
| Endpoints consumidos | ~30 |
| Secciones del template | 5 principales + 5 sub-tabs |
| Líneas TypeScript | ~1 794 |
| Líneas HTML | ~2 189 |
| Líneas SCSS | ~3 208 |
| **Total del componente** | **~7 191 líneas** |
