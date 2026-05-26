# Documentación — Componente `PortalAlumno`

> Carpeta: [frontend/src/app/components/portal-alumno/](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/components/portal-alumno)

Este es el componente más complejo del proyecto hasta ahora. Implementa el **panel principal del alumno** — la página que ve un estudiante después de iniciar sesión. Incluye navbar propio, sidebar de navegación, grid de cursos cargados desde el backend, y panel de actividades.

Está compuesto por 3 archivos:

| Archivo | Rol | Líneas |
|---|---|---|
| [portal-alumno.ts](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/components/portal-alumno/portal-alumno.ts) | Lógica del componente (TypeScript) | 144 |
| [portal-alumno.html](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/components/portal-alumno/portal-alumno.html) | Plantilla visual (HTML) | 321 |
| [portal-alumno.scss](file:///c:/Users/USER/Documents/GitHub/Angular/frontend/src/app/components/portal-alumno/portal-alumno.scss) | Estilos (SCSS) | 595 |

---

## Estructura visual de la página

```
┌────────────────────────────────────────────────────────────────┐
│  🏫 San Agustín Campus   Portal Alumno     🔔  Hola Juan [JP] │  ← pa-navbar
│                                                 └─ dropdown   │
├────────┬───────────────────────────────────────────────────────┤
│ 🏠 Ini │  Mis cursos                    Actividades semanales  │
│ 📅 Cal │  ┌──────┐ ┌──────┐ ┌──────┐  ┌──────────────────┐   │
│ 📋 Kan │  │Matem │ │Comun │ │Cienc │  │ Práctica calif.  │   │
│ 📖 Ref │  │ ∑    │ │ Aa   │ │  ⚗   │  │ Ensayo narrat.   │   │
│ 📁 Rec │  └──────┘ └──────┘ └──────┘  │ Informe lab.     │   │
│         │                               └──────────────────┘   │
│ sidebar │           pa-content                                  │
└────────┴───────────────────────────────────────────────────────┘
```

---

# PARTE 1 — `portal-alumno.ts` (Lógica)

## 1.1 Imports (líneas 1–4)

```typescript
import { Component, inject, signal, OnInit, HostListener } from '@angular/core';  // L1
import { HttpClient, HttpHeaders } from '@angular/common/http';                     // L2
import { Router } from '@angular/router';                                           // L3
import { AuthService } from '../../services/auth.service';                          // L4
```

| Import | Para qué se usa en este componente |
|---|---|
| `Component` | Decorador para definir el componente |
| `inject` | Inyección moderna de dependencias |
| `signal` | Variables reactivas (estado de la UI) |
| `OnInit` | Interfaz que obliga a implementar `ngOnInit()` — se ejecuta al cargar el componente |
| `HostListener` | Escuchar clics en el documento para cerrar el dropdown |
| `HttpClient` | Hacer petición GET para obtener los cursos del backend |
| `HttpHeaders` | Construir los headers HTTP (para enviar el token Bearer) |
| `Router` | Redirigir al usuario si no tiene sesión |
| `AuthService` | Leer datos de sesión (token, nombre, código) y hacer logout |

---

## 1.2 Tipo `Seccion` (línea 6)

```typescript
type Seccion = 'inicio' | 'calendario' | 'kanban' | 'refuerzo' | 'recursos';
```

**¿Qué es un `type` en TypeScript?**
Define un tipo personalizado que **solo puede tener uno de estos 5 valores**. Si intentas asignar otro valor (ej: `'ajustes'`), TypeScript da error.

**¿Para qué sirve?**
Controla qué sección del portal está visible. Solo una sección se muestra a la vez.

| Valor | Sección que muestra |
|---|---|
| `'inicio'` | Grid de cursos + actividades (la vista principal) |
| `'calendario'` | Placeholder — "próximamente" |
| `'kanban'` | Placeholder — "próximamente" |
| `'refuerzo'` | Placeholder — "próximamente" |
| `'recursos'` | Placeholder — "próximamente" |

---

## 1.3 Interfaz `CursoApi` (líneas 8–17)

```typescript
interface CursoApi {
  nombre: string;       // "Matemática"
  area: string;         // "Matemática"
  horasSemana: number;  // 6
  grado: string;        // "4to Secundaria"
  seccion: string;      // "A"
  turno: string;        // "Mañana"
  periodo: string;      // "2025-I"
  docente: string;      // "Prof. María García"
}
```

**¿Qué es?** Define la forma de los datos **tal como los envía el backend** en la respuesta del API. Es el "contrato" de lo que recibes del servidor.

> [!NOTE]
> Incluye `area` y `periodo` que vienen del backend pero que no se usan directamente en la tarjeta — se transforman a `areaKey` y se extraen al nivel del componente.

---

## 1.4 Interfaz `Curso` (líneas 19–28)

```typescript
export interface Curso {
  nombre: string;       // "Matemática"
  grado: string;        // "4to Secundaria"
  seccion: string;      // "A"
  turno: string;        // "Mañana"
  horasSemana: number;  // 6
  docente: string;      // "Prof. María García"
  color: string;        // "#dce8f7" ← NUEVO, no viene del backend
  areaKey: string;      // "mat"    ← NUEVO, no viene del backend
}
```

**¿Por qué hay dos interfaces (`CursoApi` y `Curso`)?**

| `CursoApi` | `Curso` |
|---|---|
| Forma exacta del backend | Forma que usa el frontend |
| Tiene `area: "Matemática"` | Tiene `areaKey: "mat"` (código corto) |
| Tiene `periodo: "2025-I"` | NO tiene periodo (se extrae a nivel del componente) |
| NO tiene color | Tiene `color: "#dce8f7"` (para el fondo de la tarjeta) |

El componente **transforma** `CursoApi` → `Curso` en el `ngOnInit()`.

> [!TIP]
> `export interface Curso` — el `export` permite que otros archivos importen esta interfaz si la necesitan.

---

## 1.5 Interfaz `Actividad` (líneas 30–36)

```typescript
interface Actividad {
  tipo: string;       // "Evaluación", "Tarea", "Laboratorio", "Examen"
  titulo: string;     // "Práctica calificada"
  curso: string;      // "Matemática"
  vence: string;      // "25/04 · 11:59 PM"
  estado: 'pendiente' | 'entregado' | 'vencido';  // Union type para el estado
}
```

El campo `estado` es un **union type** — solo puede ser uno de los 3 valores. Esto se usa en el template para mostrar badges de colores diferentes:

| Estado | Color del badge |
|---|---|
| `'pendiente'` | 🟡 Amarillo |
| `'entregado'` | 🟢 Verde |
| `'vencido'` | 🔴 Rojo |

---

## 1.6 Decorador `@Component` (líneas 38–43)

```typescript
@Component({
  selector: 'app-portal-alumno',
  imports: [],
  templateUrl: './portal-alumno.html',
  styleUrl: './portal-alumno.scss',
})
```

| Propiedad | Valor | Nota |
|---|---|---|
| `selector` | `'app-portal-alumno'` | Se usa como `<app-portal-alumno />` |
| `imports` | `[]` (vacío) | No importa módulos adicionales |

---

## 1.7 Clase `PortalAlumno implements OnInit` (línea 44)

```typescript
export class PortalAlumno implements OnInit {
```

| Parte | Significado |
|---|---|
| `implements OnInit` | **Obliga** a la clase a tener un método `ngOnInit()`. Angular lo ejecuta automáticamente una vez que el componente se crea y sus dependencias están listas |

---

## 1.8 Inyección de dependencias (líneas 45–47)

```typescript
private router = inject(Router);       // Para redirigir si no hay sesión
private auth   = inject(AuthService);  // Para leer token, nombre, código y hacer logout
private http   = inject(HttpClient);   // Para hacer la petición GET de cursos
```

---

## 1.9 URL del API (línea 49)

```typescript
private readonly API = 'http://localhost:8080/api/portal/alumno/mis-cursos';
```

Endpoint del backend que devuelve los cursos del alumno autenticado.

---

## 1.10 Señales reactivas — Estado (líneas 51–56)

```typescript
seccionActiva = signal<Seccion>('inicio');   // L51 — qué sección está visible
dropdownOpen  = signal(false);               // L52 — si el dropdown del avatar está abierto
periodo       = signal('');                  // L53 — período académico (ej: "2025-I")
cargando      = signal(true);               // L54 — si los cursos están cargándose
errorCarga    = signal('');                  // L55 — mensaje de error si falla la carga
cursos        = signal<Curso[]>([]);         // L56 — array de cursos del alumno
```

| Señal | Tipo | Valor inicial | Cambia cuando... |
|---|---|---|---|
| `seccionActiva` | `Seccion` | `'inicio'` | El usuario hace clic en un ítem del sidebar |
| `dropdownOpen` | `boolean` | `false` | Clic en avatar o clic fuera del dropdown |
| `periodo` | `string` | `''` | Se cargan los cursos del backend |
| `cargando` | `boolean` | `true` | Termina la petición HTTP (éxito o error) |
| `errorCarga` | `string` | `''` | La petición HTTP falla |
| `cursos` | `Curso[]` | `[]` (vacío) | Se cargan los cursos del backend |

> [!NOTE]
> `signal<Seccion>('inicio')` y `signal<Curso[]>([])` usan **genéricos** (`<Seccion>`, `<Curso[]>`) para decirle a TypeScript el tipo exacto del contenido de la señal.

---

## 1.11 Datos del usuario — Leídos de localStorage (líneas 58–60)

```typescript
nombre    = this.auth.getNombre() ?? 'Estudiante';                                    // L58
codigo    = this.auth.getCodigo() ?? '';                                                // L59
iniciales = this.nombre.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();  // L60
```

### Línea 58 — `nombre`

```typescript
nombre = this.auth.getNombre() ?? 'Estudiante';
```

- `this.auth.getNombre()` → lee el nombre del `localStorage` (ej: `"Juan Pérez"` o `null`).
- `??` → **operador nullish coalescing** — si el valor de la izquierda es `null` o `undefined`, usa el valor de la derecha.
- Resultado: `"Juan Pérez"` si hay sesión, o `"Estudiante"` si no hay nombre guardado.

### Línea 59 — `codigo`

```typescript
codigo = this.auth.getCodigo() ?? '';
```

Mismo patrón. Lee el código o usa string vacío como fallback.

### Línea 60 — `iniciales` (paso a paso)

```typescript
iniciales = this.nombre.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();
```

Suponiendo que `nombre = "Juan Pérez"`:

| Paso | Método | Entrada | Salida |
|---|---|---|---|
| 1 | `.split(' ')` | `"Juan Pérez"` | `["Juan", "Pérez"]` |
| 2 | `.map(p => p[0])` | `["Juan", "Pérez"]` | `["J", "P"]` |
| 3 | `.join('')` | `["J", "P"]` | `"JP"` |
| 4 | `.slice(0, 2)` | `"JP"` | `"JP"` (máximo 2 caracteres) |
| 5 | `.toUpperCase()` | `"JP"` | `"JP"` |

**Resultado:** `"JP"` — se muestra en el avatar circular rojo del navbar.

Con un nombre de 3 partes como `"María Elena García"`:

| Paso | Resultado |
|---|---|
| `.split(' ')` | `["María", "Elena", "García"]` |
| `.map(p => p[0])` | `["M", "E", "G"]` |
| `.join('')` | `"MEG"` |
| `.slice(0, 2)` | `"ME"` ← solo toma las primeras 2 |

---

## 1.12 Items de navegación del sidebar (líneas 62–68)

```typescript
navItems: { id: Seccion; label: string; icon: string }[] = [
  { id: 'inicio',     label: 'Inicio',     icon: 'home'     },
  { id: 'calendario', label: 'Calendario', icon: 'calendar' },
  { id: 'kanban',     label: 'Kanban',     icon: 'kanban'   },
  { id: 'refuerzo',   label: 'Refuerzo',   icon: 'refuerzo' },
  { id: 'recursos',   label: 'Recursos',   icon: 'recursos' },
];
```

Es un **array de objetos** que define los ítems del sidebar. Cada ítem tiene:

| Propiedad | Tipo | Para qué |
|---|---|---|
| `id` | `Seccion` | Identificador que se compara con `seccionActiva()` |
| `label` | `string` | Texto visible en el sidebar |
| `icon` | `string` | Clave para seleccionar el SVG correcto en el template |

El template itera sobre este array con `@for` para generar los botones del sidebar.

---

## 1.13 Actividades (datos hardcoded) (líneas 70–75)

```typescript
actividades: Actividad[] = [
  { tipo: 'Evaluación',  titulo: 'Práctica calificada',   curso: 'Matemática',          vence: '25/04 · 11:59 PM', estado: 'pendiente' },
  { tipo: 'Tarea',       titulo: 'Ensayo narrativo',       curso: 'Comunicación',         vence: '28/04 · 11:59 PM', estado: 'pendiente' },
  { tipo: 'Laboratorio', titulo: 'Informe de experimento', curso: 'Ciencia y Tecnología', vence: '30/04 · 11:59 PM', estado: 'pendiente' },
  { tipo: 'Examen',      titulo: 'Quiz de vocabulario',    curso: 'Inglés',               vence: '26/04 · 08:00 AM', estado: 'vencido'   },
];
```

> [!IMPORTANT]
> Estas actividades son **datos estáticos** (hardcoded). A diferencia de los cursos que se cargan del backend, las actividades están escritas directamente en el código. En una versión futura se cargarían desde el API.

---

## 1.14 Mapa de colores por curso (líneas 77–87)

```typescript
private readonly COLORES: Record<string, string> = {
  'Matemática':                       '#dce8f7',  // Azul claro
  'Comunicación':                     '#fde8e8',  // Rosa claro
  'Ciencia y Tecnología':             '#e8f7ec',  // Verde claro
  'Historia, Geografía y Economía':   '#f0e8f7',  // Morado claro
  'Inglés':                           '#fef9e0',  // Amarillo claro
  'Arte y Cultura':                   '#fde0ec',  // Rosa
  'Educación Física':                 '#e0f7ec',  // Verde
  'Personal Social':                  '#e8f0fe',  // Azul
  'Religión':                         '#f7f0e8',  // Beige
};
```

**`Record<string, string>`** — tipo de TypeScript que define un objeto donde:
- Las **llaves** son strings (nombre del curso)
- Los **valores** son strings (código hexadecimal del color)

Cada curso tiene un color pastel único para el fondo de su tarjeta visual.

---

## 1.15 Mapa de áreas por clave (líneas 89–98)

```typescript
private readonly AREA_KEY: Record<string, string> = {
  'Matemática':       'mat',
  'Comunicación':     'com',
  'Ciencias':         'cie',
  'Sociales':         'his',
  'Idiomas':          'ing',
  'Arte':             'art',
  'Educación Física': 'efi',
  'Formación':        'rel',
};
```

Convierte el nombre del área (que viene del backend) a un **código corto** que se usa en el template para seleccionar el ícono SVG decorativo de cada tarjeta:

| `area` del backend | `areaKey` | Ícono |
|---|---|---|
| `'Matemática'` | `'mat'` | ∑ |
| `'Comunicación'` | `'com'` | Aa |
| `'Ciencias'` | `'cie'` | ⚗ |
| `'Sociales'` | `'his'` | 🌍 |
| `'Idiomas'` | `'ing'` | EN |
| `'Arte'` | `'art'` | 🎨 |
| `'Educación Física'` | `'efi'` | ⚽ |
| `'Formación'` | `'rel'` | ✝ |

---

## 1.16 Función `ngOnInit()` — Cargar cursos del backend (líneas 100–126)

Esta es la función más importante del componente. Se ejecuta **automáticamente** cuando Angular crea el componente.

### Paso 1: Verificar autenticación (líneas 101–102)

```typescript
const token = this.auth.getToken();
if (!token) { this.router.navigate(['/']); return; }
```

| Línea | Qué hace |
|---|---|
| L101 | Lee el token JWT del `localStorage` |
| L102 | Si **no hay token** (el usuario no ha iniciado sesión) → lo redirige a la página principal (`/`) y **sale de la función** |

> [!IMPORTANT]
> Esta es una **guardia de ruta manual**. Protege el portal de accesos no autorizados. Si alguien escribe `/portal/alumno` directamente en la URL sin haber iniciado sesión, lo redirige a la página principal.

### Paso 2: Crear headers con el token (línea 104)

```typescript
const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
```

- Crea un objeto `HttpHeaders` con el header `Authorization`.
- **`Bearer ${token}`** → formato estándar JWT. Ejemplo del header resultante:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

El backend necesita este header para saber **quién es** el alumno y devolver **sus** cursos.

### Paso 3: Petición GET (líneas 106–125)

```typescript
this.http.get<CursoApi[]>(this.API, { headers }).subscribe({
```

| Parte | Significado |
|---|---|
| `.get<CursoApi[]>` | Petición GET que espera un array de `CursoApi` como respuesta |
| `this.API` | `http://localhost:8080/api/portal/alumno/mis-cursos` |
| `{ headers }` | Envía los headers con el token Bearer |
| `.subscribe({...})` | Se suscribe a la respuesta |

### Paso 4: Respuesta exitosa — `next` (líneas 107–120)

```typescript
next: (data) => {
  if (data.length > 0) this.periodo.set(data[0].periodo);     // L108
  this.cursos.set(data.map(d => ({                              // L109
    nombre:      d.nombre,                                      // L110
    grado:       d.grado,                                       // L111
    seccion:     d.seccion,                                     // L112
    turno:       d.turno,                                       // L113
    horasSemana: d.horasSemana,                                 // L114
    docente:     d.docente,                                     // L115
    color:       this.COLORES[d.nombre] ?? '#e8f0fb',          // L116
    areaKey:     this.AREA_KEY[d.area]  ?? 'gen',              // L117
  })));                                                         // L118
  this.cargando.set(false);                                     // L119
},
```

**Línea por línea:**

| Línea | Qué hace |
|---|---|
| **L108** | Si hay cursos, extrae el `periodo` del primer curso (todos comparten el mismo período) y lo guarda en la señal |
| **L109–118** | Transforma cada `CursoApi` del backend a un `Curso` del frontend usando `.map()` |
| **L116** | Busca el color del curso por nombre. Si no existe en `COLORES` → usa `'#e8f0fb'` (azul claro por defecto) |
| **L117** | Busca la clave del área. Si no existe en `AREA_KEY` → usa `'gen'` (genérico) |
| **L119** | Desactiva el estado de carga (el spinner desaparece) |

**Ejemplo de la transformación:**

```
Backend envía (CursoApi):              Frontend usa (Curso):
{                                       {
  nombre: "Matemática",                  nombre: "Matemática",
  area: "Matemática",          →         grado: "4to Secundaria",
  horasSemana: 6,                        seccion: "A",
  grado: "4to Secundaria",              turno: "Mañana",
  seccion: "A",                          horasSemana: 6,
  turno: "Mañana",                       docente: "Prof. García",
  periodo: "2025-I",                     color: "#dce8f7",     ← NUEVO
  docente: "Prof. García"                areaKey: "mat"         ← NUEVO
}                                       }
```

### Paso 5: Error (líneas 121–124)

```typescript
error: () => {
  this.errorCarga.set('No se pudieron cargar los cursos. Intenta de nuevo.');
  this.cargando.set(false);
},
```

Si la petición falla (servidor caído, error de red, etc.), muestra un mensaje de error y quita el spinner.

---

### Diagrama del flujo de `ngOnInit()`

```mermaid
flowchart TD
    A["ngOnInit() se ejecuta automáticamente"] --> B{¿Existe token<br>en localStorage?}
    B -- No --> C["router.navigate('/') → redirige a inicio"]
    B -- Sí --> D["Crea headers: Authorization: Bearer token"]
    D --> E["GET /api/portal/alumno/mis-cursos"]
    E --> F{¿Respuesta?}
    F -- "✅ Éxito" --> G["Extrae periodo del primer curso"]
    G --> H["Transforma CursoApi[] → Curso[]<br>(agrega color y areaKey)"]
    H --> I["cargando → false"]
    F -- "❌ Error" --> J["errorCarga → 'No se pudieron cargar...'"]
    J --> K["cargando → false"]
```

---

## 1.17 Función `setSeccion()` — Cambiar sección activa (línea 128)

```typescript
setSeccion(id: Seccion) { this.seccionActiva.set(id); this.dropdownOpen.set(false); }
```

| Paso | Qué hace |
|---|---|
| `this.seccionActiva.set(id)` | Cambia la sección visible (ej: `'inicio'` → `'calendario'`) |
| `this.dropdownOpen.set(false)` | Cierra el dropdown del avatar si está abierto |

En el template, `@if (seccionActiva() === 'inicio')` controla qué sección se renderiza.

---

## 1.18 Función `toggleDropdown()` — Abrir/cerrar dropdown (línea 129)

```typescript
toggleDropdown() { this.dropdownOpen.update(v => !v); }
```

- `.update(v => !v)` → invierte el valor actual: `false → true → false → ...`
- Controla la visibilidad del menú desplegable del avatar.

---

## 1.19 Función `pendientes()` — Contar actividades pendientes (línea 131)

```typescript
pendientes = () => this.actividades.filter(a => a.estado === 'pendiente').length;
```

**Paso a paso con los datos actuales:**

| Actividad | Estado | ¿Pasa el filtro? |
|---|---|---|
| Práctica calificada | `'pendiente'` | ✅ Sí |
| Ensayo narrativo | `'pendiente'` | ✅ Sí |
| Informe de experimento | `'pendiente'` | ✅ Sí |
| Quiz de vocabulario | `'vencido'` | ❌ No |

**Resultado: `3`** — se muestra como badge rojo en el ícono de notificaciones.

> [!NOTE]
> `pendientes` es una **arrow function asignada a una propiedad**, no un método tradicional. Se llama con `pendientes()` en el template. Cada vez que se llama, recalcula el filtro (no se cachea).

---

## 1.20 Función `onDocClick()` — Cerrar dropdown al clic fuera (líneas 133–137)

```typescript
@HostListener('document:click', ['$event'])
onDocClick(e: MouseEvent) {
  const t = e.target as HTMLElement;
  if (!t.closest('.pa-avatar-wrapper')) this.dropdownOpen.set(false);
}
```

**Paso a paso:**

| Paso | Código | Qué hace |
|---|---|---|
| 1 | `@HostListener('document:click', ['$event'])` | Escucha **todos los clics** en el documento |
| 2 | `e.target as HTMLElement` | Obtiene el elemento donde se hizo clic |
| 3 | `t.closest('.pa-avatar-wrapper')` | Busca si el elemento o algún ancestro tiene la clase `pa-avatar-wrapper` |
| 4 | `if (!t.closest(...))` | Si el clic fue **fuera** del avatar → cierra el dropdown |

**`.closest()` busca hacia arriba en el DOM:**

```
Clic en "Cerrar sesión":
  <button> → padre: <div class="pa-dropdown"> → padre: <div class="pa-avatar-wrapper">
  → .closest('.pa-avatar-wrapper') ENCUENTRA → NO cierra

Clic en el sidebar:
  <button class="pa-nav-item"> → padre: <aside class="pa-sidebar">
  → .closest('.pa-avatar-wrapper') NO ENCUENTRA → SÍ cierra
```

---

## 1.21 Función `logout()` — Cerrar sesión (líneas 139–142)

```typescript
logout() {
  this.auth.logout();              // Borra datos de localStorage
  this.router.navigate(['/']);     // Redirige a la página principal
}
```

| Paso | Qué ocurre |
|---|---|
| `this.auth.logout()` | Elimina `pa_token`, `pa_rol`, `pa_codigo`, `pa_nombre`, `pa_email` del localStorage |
| `this.router.navigate(['/'])` | Navega a la ruta raíz (landing page) |

---

# PARTE 2 — `portal-alumno.html` (Template)

## 2.1 Estructura general

```html
<div class="pa-wrapper">
  <header class="pa-navbar">...</header>      <!-- Navbar superior propio -->
  <div class="pa-layout">
    <aside class="pa-sidebar">...</aside>      <!-- Sidebar izquierdo -->
    <main class="pa-content">                  <!-- Área de contenido -->
      @if (seccionActiva() === 'inicio') { ... }
      @if (seccionActiva() === 'calendario') { ... }
      @if (seccionActiva() === 'kanban') { ... }
      @if (seccionActiva() === 'refuerzo') { ... }
      @if (seccionActiva() === 'recursos') { ... }
    </main>
  </div>
</div>
```

---

## 2.2 Navbar del portal (líneas 4–55)

### Notificaciones con badge (líneas 17–25)

```html
<button class="pa-notif-btn" title="Notificaciones">
  <svg><!-- ícono campana --></svg>
  @if (pendientes() > 0) {
    <span class="pa-notif-badge">{{ pendientes() }}</span>
  }
</button>
```

- `pendientes()` se llama **dos veces**: una para la condición y otra para el texto.
- Si hay 3 actividades pendientes → muestra un badge rojo con "3".
- Si hay 0 pendientes → el badge no aparece.

### Avatar y dropdown del usuario (líneas 28–52)

```html
<div class="pa-avatar-wrapper" (click)="toggleDropdown()">
  <div class="pa-user-info">
    <span class="pa-greeting">Hola {{ nombre.split(' ')[0] }}</span>
    <span class="pa-role">Estudiante</span>
  </div>
  <div class="pa-avatar">{{ iniciales }}</div>

  @if (dropdownOpen()) {
    <div class="pa-dropdown">
      <div class="pa-dropdown-info">
        <span class="pa-dropdown-name">{{ nombre }}</span>
        <span class="pa-dropdown-code">{{ codigo }}</span>
      </div>
      <hr class="pa-dropdown-divider" />
      <button class="pa-dropdown-item danger" (click)="logout()">
        <svg><!-- ícono logout --></svg>
        Cerrar sesión
      </button>
    </div>
  }
</div>
```

| Parte | Qué muestra | Ejemplo |
|---|---|---|
| `nombre.split(' ')[0]` | Solo el primer nombre | `"Hola Juan"` |
| `{{ iniciales }}` | Las 2 iniciales en el avatar | `"JP"` |
| `{{ nombre }}` | Nombre completo en el dropdown | `"Juan Pérez"` |
| `{{ codigo }}` | Código en el dropdown | `"A2024001"` |

---

## 2.3 Sidebar — Navegación lateral (líneas 61–104)

```html
<aside class="pa-sidebar">
  @for (item of navItems; track item.id) {
    <button
      class="pa-nav-item"
      [class.active]="seccionActiva() === item.id"
      (click)="setSeccion(item.id)">

      @if (item.icon === 'home') { <svg><!-- ícono casa --></svg> }
      @if (item.icon === 'calendar') { <svg><!-- ícono calendario --></svg> }
      <!-- ... más íconos ... -->

      <span class="pa-nav-label">{{ item.label }}</span>
    </button>
  }
</aside>
```

**`@for (item of navItems; track item.id)`** — itera sobre los 5 ítems de navegación.

**`[class.active]="seccionActiva() === item.id"`** — agrega la clase CSS `active` solo al botón cuyo `id` coincide con la sección activa:

| `seccionActiva()` | Botón "Inicio" | Botón "Calendario" |
|---|---|---|
| `'inicio'` | ✅ `active` (fondo azul) | Sin clase (gris) |
| `'calendario'` | Sin clase (gris) | ✅ `active` (fondo azul) |

---

## 2.4 Sección "Inicio" — Grid de cursos (líneas 110–266)

### Estado de carga (líneas 137–146)

```html
@if (cargando()) {
  <div class="pa-loading">
    <div class="pa-spinner"></div>
    <span>Cargando tus cursos...</span>
  </div>
}

@if (errorCarga()) {
  <div class="pa-error">{{ errorCarga() }}</div>
}
```

Los 3 estados del panel de cursos:

| Estado | `cargando()` | `errorCarga()` | `cursos()` | Qué se muestra |
|---|---|---|---|---|
| Cargando | `true` | `''` | `[]` | Spinner + "Cargando tus cursos..." |
| Error | `false` | `'No se pudieron...'` | `[]` | Mensaje de error rojo |
| Éxito | `false` | `''` | `[{...}, ...]` | Grid de tarjetas de cursos |

### Grid de tarjetas de cursos (líneas 148–225)

```html
<div class="pa-cursos-grid">
  @for (curso of cursos(); track curso.nombre) {
    <div class="pa-curso-card">

      <!-- Parte visual (color + ícono decorativo + badge horas) -->
      <div class="pa-card-visual" [style.background]="curso.color">
        <svg class="pa-card-deco">
          <!-- Formas decorativas (círculos, rectángulos) -->
          @if (curso.areaKey === 'mat') { <text>∑</text> }
          @if (curso.areaKey === 'com') { <text>Aa</text> }
          <!-- ... más íconos por área ... -->
        </svg>
        <div class="pa-horas-badge">{{ curso.horasSemana }} h/sem</div>
      </div>

      <!-- Información del curso -->
      <div class="pa-card-body">
        <h3>{{ curso.nombre }}</h3>
        <div>{{ curso.grado }} · Sección {{ curso.seccion }}</div>
        <div>Turno {{ curso.turno }}</div>
        <div>{{ curso.docente }}</div>
      </div>

    </div>
  }
</div>
```

**`[style.background]="curso.color"`** — aplica dinámicamente el color de fondo a cada tarjeta. Cada curso tiene su propio color pastel definido en `COLORES`.

**`@for (curso of cursos(); track curso.nombre)`**:
- `cursos()` → lee la señal (array de cursos)
- `track curso.nombre` → Angular usa el nombre como identificador único para optimizar el renderizado

### Panel de actividades (líneas 228–263)

```html
<aside class="pa-actividades-panel">
  <!-- Header -->
  <h3>Actividades semanales</h3>

  <!-- Lista de actividades -->
  @for (act of actividades; track act.titulo) {
    <div class="pa-actividad-item">
      <div class="pa-act-top">
        <div class="pa-act-tipo">{{ act.tipo }}</div>
        <span class="pa-act-estado" [class]="'estado-' + act.estado">
          {{ act.estado === 'pendiente' ? 'Por entregar' : act.estado === 'vencido' ? 'Vencido' : 'Entregado' }}
        </span>
      </div>
      <p class="pa-act-titulo">{{ act.titulo }}</p>
      <p class="pa-act-curso">{{ act.curso }}</p>
      <p class="pa-act-vence">Vence: {{ act.vence }}</p>
    </div>
  }
</aside>
```

**`[class]="'estado-' + act.estado"`** — genera clases CSS dinámicas:

| `act.estado` | Clase generada | Color |
|---|---|---|
| `'pendiente'` | `estado-pendiente` | 🟡 Amarillo |
| `'entregado'` | `estado-entregado` | 🟢 Verde |
| `'vencido'` | `estado-vencido` | 🔴 Rojo |

**Operador ternario anidado** para el texto del badge:
```
act.estado === 'pendiente' ? 'Por entregar'
                           : act.estado === 'vencido' ? 'Vencido'
                                                      : 'Entregado'
```

---

## 2.5 Secciones placeholder (líneas 268–316)

Las secciones Calendario, Kanban, Refuerzo y Recursos muestran un **placeholder** con un ícono grande y texto "próximamente":

```html
@if (seccionActiva() === 'calendario') {
  <div class="pa-placeholder">
    <svg><!-- ícono grande --></svg>
    <h3>Calendario</h3>
    <p>Vista de calendario académico próximamente</p>
  </div>
}
```

Todas siguen el mismo patrón, con diferentes íconos y textos.

---

# PARTE 3 — `portal-alumno.scss` (Estilos)

## 3.1 Variables SCSS (líneas 4–9)

```scss
$azul:      #0d1b2a;    // Azul oscuro principal
$azul-med:  #1b3a5c;    // Azul medio (para acentos)
$rojo:      #c1121f;    // Rojo institucional
$blanco:    #ffffff;    // Blanco
$fondo:     #e8f0fb;    // Azul muy claro (fondo de la página)
$sidebar-w: 210px;      // Ancho fijo del sidebar
```

> [!TIP]
> A diferencia de CSS normal donde repetirías `#0d1b2a` muchas veces, SCSS permite usar variables (`$azul`). Si cambias el color en un lugar, cambia en todo el archivo.

---

## 3.2 Reset global (línea 11)

```scss
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
```

- `*` → selecciona **todos** los elementos.
- `box-sizing: border-box` → el padding y border se incluyen dentro del ancho/alto total (evita sorpresas de tamaño).
- `margin: 0; padding: 0` → elimina márgenes y padding por defecto del navegador.

---

## 3.3 Layout principal (líneas 16–23 y 220–224)

```scss
.pa-wrapper {
  display: flex;
  flex-direction: column;    // Navbar arriba, contenido abajo
  height: 100vh;             // Ocupa toda la ventana
  overflow: hidden;          // Evita scroll en el wrapper
}

.pa-layout {
  display: flex;             // Sidebar y contenido en fila
  flex: 1;                   // Ocupa todo el espacio restante
  overflow: hidden;
}
```

**Visualización:**

```
┌──────────────── .pa-wrapper (column, 100vh) ────────────────┐
│ ┌──────────── .pa-navbar (flex-shrink: 0, 60px) ──────────┐ │
│ │                                                          │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ┌──────────── .pa-layout (flex, flex: 1) ─────────────────┐ │
│ │ ┌──────────┐ ┌─────────────────────────────────────────┐ │ │
│ │ │ sidebar  │ │           .pa-content                    │ │ │
│ │ │  210px   │ │         (flex: 1, overflow-y: auto)      │ │ │
│ │ │          │ │                                          │ │ │
│ │ └──────────┘ └─────────────────────────────────────────┘ │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## 3.4 Sidebar activo (líneas 264–268)

```scss
.pa-nav-item {
  &.active {
    background: $azul;     // Fondo azul oscuro
    color: $blanco;        // Texto blanco
    font-weight: 600;      // Más negrita
  }
}
```

El botón activo del sidebar se distingue con fondo azul oscuro, mientras los demás son transparentes con texto gris.

---

## 3.5 Grid de tarjetas de cursos (líneas 353–371)

```scss
.pa-cursos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.1rem;
}
```

| Propiedad | Significado |
|---|---|
| `repeat(auto-fill, ...)` | Crea tantas columnas como quepan automáticamente |
| `minmax(220px, 1fr)` | Cada columna mide mínimo 220px y máximo ocupa el espacio disponible |

**Ejemplo con un contenedor de 700px:**
```
700px ÷ 220px = 3.18 → 3 columnas de ~233px cada una
```

### Hover de las tarjetas (líneas 367–370)

```scss
.pa-curso-card:hover {
  transform: translateY(-4px);                    // Sube 4px
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);       // Sombra más grande
}
```

Crea un efecto de "elevación" al pasar el mouse.

---

## 3.6 Dropdown animado (líneas 158–215)

```scss
.pa-dropdown {
  position: absolute;
  top: calc(100% + 8px);    // 8px debajo del avatar
  right: 0;                  // Alineado a la derecha
  animation: paFadeDown 0.18s ease;
}

@keyframes paFadeDown {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

El dropdown aparece con una animación de "caída suave" — empieza 6px arriba e invisible, y baja a su posición final.

---

## 3.7 Badges de estado de actividades (líneas 534–543)

```scss
.pa-act-estado {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;       // Forma de píldora

  &.estado-pendiente { background: #eab308; color: #1a1200; }  // 🟡
  &.estado-entregado { background: #22c55e; color: #052e0f; }  // 🟢
  &.estado-vencido   { background: $rojo;   color: $blanco; }  // 🔴
}
```

---

## 3.8 Media queries — Diseño responsive (líneas 585–594)

```scss
@media (max-width: 1024px) {
  .pa-inicio { grid-template-columns: 1fr; }       // El panel de actividades va abajo
  .pa-actividades-panel { position: static; }       // Deja de ser sticky
}

@media (max-width: 768px) {
  .pa-sidebar { width: 60px; .pa-nav-label { display: none; } }  // Sidebar colapsado
  .pa-cursos-grid { grid-template-columns: 1fr; }                 // 1 tarjeta por fila
  .pa-user-info { display: none; }                                 // Oculta "Hola Juan"
}
```

| Pantalla | Sidebar | Grid de cursos | Actividades |
|---|---|---|---|
| > 1024px | 210px con texto | Auto-fill (2-3 columnas) | Al costado derecho |
| 768–1024px | 210px con texto | Auto-fill | Debajo de los cursos |
| < 768px | 60px solo íconos | 1 columna | Debajo de los cursos |

---

# PARTE 4 — Resumen completo

## Métodos/funciones del componente

| Función | Tipo | Descripción |
|---|---|---|
| `ngOnInit()` | Ciclo de vida | Verifica sesión + carga cursos del backend |
| `setSeccion(id)` | Navegación | Cambia la sección visible del sidebar |
| `toggleDropdown()` | UI | Abre/cierra el dropdown del avatar |
| `pendientes()` | Cálculo | Cuenta actividades con estado `'pendiente'` |
| `onDocClick(e)` | Evento DOM | Cierra el dropdown si se hace clic fuera |
| `logout()` | Sesión | Borra datos de localStorage y redirige a `/` |

## Servicios usados de `AuthService`

| Método/dato usado | Dónde se usa |
|---|---|
| `getToken()` | En `ngOnInit()` para verificar sesión y crear headers |
| `getNombre()` | Para mostrar el nombre y calcular iniciales |
| `getCodigo()` | Para mostrar el código en el dropdown |
| `logout()` | Para cerrar sesión |

## Flujo de datos completo

```mermaid
flowchart LR
    subgraph Backend
        API["GET /api/portal/alumno/mis-cursos"]
    end
    subgraph LocalStorage
        LS["pa_token, pa_nombre, pa_codigo"]
    end
    subgraph PortalAlumno
        ON["ngOnInit()"]
        TR["Transformar CursoApi → Curso"]
        S["Señales: cursos, periodo, cargando"]
    end
    subgraph Template
        GRID["Grid de tarjetas"]
        ACT["Panel actividades"]
        NAV["Sidebar"]
    end

    LS -- "token" --> ON
    ON -- "GET + Bearer token" --> API
    API -- "CursoApi[]" --> TR
    TR -- "Curso[]" --> S
    S -- "cursos()" --> GRID
    S -- "periodo()" --> GRID
    ON -- "actividades (hardcoded)" --> ACT
    ON -- "navItems" --> NAV
```
