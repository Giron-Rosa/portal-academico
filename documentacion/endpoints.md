# Listado Completo de Endpoints del Backend

El backend expone una API REST organizada en **12 controladores** bajo la ruta base `/api`. Todas las llamadas a recursos restringidos requieren la cabecera `Authorization: Bearer <JWT>`.

En total se exponen **33 endpoints**.

---

## 🔐 Autenticación
Controlador principal de acceso público.

### `AuthController` (`/api/auth`)
* **`POST /api/auth/login`**
  * **Descripción**: Valida el código o correo del usuario junto a su contraseña y devuelve el token JWT.
  * **Permisos**: Público.
  * **Cuerpo de solicitud (JSON)**:
    ```json
    {
      "identifier": "OC16Mar26",
      "contrasena": "Test1234!"
    }
    ```
  * **Respuesta exitosa (JSON)**: Devuelve el token JWT, el rol del usuario, código, email y su nombre completo.

---

## 👨‍🏫 Endpoints del Portal del Docente
Todos estos endpoints están protegidos por Spring Security y requieren el rol **`ROLE_MAESTRO`**.

### `DocenteController` (`/api/portal/docente`)
* **`GET /api/portal/docente/cursos`**
  * **Descripción**: Devuelve la lista de cursos asignados al docente autenticado con el total de alumnos activos.
* **`GET /api/portal/docente/horario`**
  * **Descripción**: Devuelve el horario de clases semanal del docente organizado por día y horas.

### `AsistenciaController` (`/api/portal/docente/cursos/{idAulaCurso}/asistencias`)
* **`GET /api/portal/docente/cursos/{idAulaCurso}/asistencias`**
  * **Descripción**: Obtiene el historial de asistencias registradas para un curso específico.
* **`POST /api/portal/docente/cursos/{idAulaCurso}/asistencia`**
  * **Descripción**: Registra o actualiza la asistencia de los alumnos para una fecha específica (incluye semana y clase).
  * **Cuerpo (JSON)**:
    ```json
    {
      "fecha": "2026-05-23",
      "semana": 11,
      "clase": 2,
      "alumnos": [
        { "idAlumno": 1, "estado": "asistio" },
        { "idAlumno": 2, "estado": "tardanza" }
      ]
    }
    ```
* **`GET /api/portal/docente/asistencias/clase/{fecha}`**
  * **Descripción**: Consulta el detalle de asistencia de un curso en una fecha determinada.

### `ComunicadoController` (`/api/portal/docente/comunicados`)
* **`GET /api/portal/docente/comunicados`**
  * **Descripción**: Lista todos los comunicados emitidos por el docente.
* **`GET /api/portal/docente/comunicados/mis-aulas`**
  * **Descripción**: Lista las aulas activas asignadas para llenar el formulario de creación.
* **`POST /api/portal/docente/comunicados`**
  * **Descripción**: Crea un nuevo comunicado (general o dirigido a un aula).
  * **Cuerpo (JSON)**:
    ```json
    {
      "idAula": 1,
      "titulo": "Examen Bimestral de Álgebra",
      "descripcion": "Estudiar ecuaciones cuadráticas",
      "tipo": "examen",
      "fechaEvento": "2026-05-28"
    }
    ```
* **`DELETE /api/portal/docente/comunicados/{id}`**
  * **Descripción**: Elimina un comunicado por su ID (siempre que pertenezca al docente).

### `ExamenController` (`/api/portal/docente`)
* **`GET /api/portal/docente/cursos/{idAulaCurso}/examenes`**
  * **Descripción**: Lista los exámenes creados para el curso con sus estadísticas de corrección.
* **`POST /api/portal/docente/cursos/{idAulaCurso}/examenes`**
  * **Descripción**: Crea una nueva evaluación (examen) y asocia filas de calificación vacías para todos los alumnos.
  * **Cuerpo (JSON)**:
    ```json
    {
      "numeroExamen": 3,
      "semana": 12,
      "clase": 1,
      "titulo": "Práctica Calificada N°3",
      "descripcion": "Resolución de matrices",
      "tipo": "practica",
      "fechaExamen": "2026-05-25",
      "duracionMinutos": 45,
      "notaMaxima": 20,
      "url": ""
    }
    ```
* **`DELETE /api/portal/docente/examenes/{idExamen}`**
  * **Descripción**: Elimina un examen y todas sus notas asociadas.
* **`GET /api/portal/docente/examenes/{idExamen}/notas`**
  * **Descripción**: Obtiene la planilla de notas de todos los alumnos de un examen.
* **`PATCH /api/portal/docente/examenes/notas/{idNota}`**
  * **Descripción**: Califica o modifica la asistencia y nota de un alumno para un examen.
  * **Cuerpo (JSON)**:
    ```json
    {
      "asistio": true,
      "nota": 18.5
    }
    ```

### `TareaController` (`/api/portal/docente`)
* **`GET /api/portal/docente/cursos/{idAulaCurso}/tareas`**
  * **Descripción**: Lista las tareas escolares asignadas en el curso.
* **`POST /api/portal/docente/cursos/{idAulaCurso}/tareas`**
  * **Descripción**: Crea una nueva tarea y genera las filas de entrega vacías para los alumnos.
  * **Cuerpo (JSON)**:
    ```json
    {
      "numeroTarea": 4,
      "semana": 12,
      "clase": 2,
      "titulo": "Resolver ejercicios pág. 100",
      "descripcion": "Desarrollar problemas en el cuaderno",
      "fechaEntrega": "2026-05-27",
      "notaMaxima": 20,
      "url": ""
    }
    ```
* **`DELETE /api/portal/docente/tareas/{idTarea}`**
  * **Descripción**: Elimina una tarea y sus entregas.
* **`GET /api/portal/docente/tareas/{idTarea}/notas`**
  * **Descripción**: Obtiene la planilla de entregas y notas de la tarea para calificar.
* **`PATCH /api/portal/docente/tareas/notas/{idNota}`**
  * **Descripción**: Registra si el alumno entregó y califica su tarea.
  * **Cuerpo (JSON)**:
    ```json
    {
      "entregado": true,
      "nota": 16.0
    }
    ```

### `MaterialController` (`/api/portal/docente/cursos`)
* **`GET /api/portal/docente/cursos/{idAulaCurso}/materiales`**
  * **Descripción**: Lista los materiales cargados en el aula virtual.
* **`POST /api/portal/docente/cursos/{idAulaCurso}/materiales`**
  * **Descripción**: Carga una nueva referencia o material didáctico.
  * **Cuerpo (JSON)**:
    ```json
    {
      "semana": 12,
      "clase": 1,
      "titulo": "Lectura sobre polinomios",
      "tipo": "pdf",
      "url": "polinomios_intro.pdf"
    }
    ```
* **`DELETE /api/portal/docente/materiales/{idMaterial}`**
  * **Descripción**: Elimina el material didáctico del aula virtual.

### `MensajeController` (`/api/portal/docente/mensajes`)
* **`GET /api/portal/docente/mensajes`**
  * **Descripción**: Lista los mensajes recibidos por el docente de parte de los padres.
* **`GET /api/portal/docente/mensajes/{id}`**
  * **Descripción**: Muestra el detalle del mensaje y su hilo de respuestas. Marca el mensaje como leido automáticamente.
* **`POST /api/portal/docente/mensajes/{id}/responder`**
  * **Descripción**: Agrega una respuesta al hilo del mensaje.
  * **Cuerpo (JSON)**:
    ```json
    {
      "cuerpo": "Estimado padre, su hijo ya justificó su inasistencia..."
    }
    ```

### `ReporteController` (`/api/portal/docente`)
* **`GET /api/portal/docente/cursos/{idAulaCurso}/reportes`**
  * **Descripción**: Obtiene los reportes bimestrales generados para los alumnos matriculados en el curso.
* **`POST /api/portal/docente/cursos/{idAulaCurso}/reportes`**
  * **Descripción**: Genera o calcula las calificaciones finales del bimestre para un alumno.
  * **Cuerpo (JSON)**:
    ```json
    {
      "idAlumno": 1,
      "bimestre": 1,
      "notaPromedio": 16.5,
      "comentario": "Excelente rendimiento académico en el bimestre."
    }
    ```
* **`DELETE /api/portal/docente/reportes/{idReporte}`**
  * **Descripción**: Elimina un reporte bimestral generado.
* **`PATCH /api/portal/docente/reportes/{idReporte}/visibilidad`**
  * **Descripción**: Activa o desactiva la visibilidad del reporte hacia el portal del padre de familia.
  * **Cuerpo (JSON)**:
    ```json
    {
      "visiblePadre": true
    }
    ```

### `PendienteController` (`/api/portal/docente/pendientes`)
* **`GET /api/portal/docente/pendientes`**
  * **Descripción**: Devuelve contadores y listados de actividades pendientes por calificar (ej. exámenes o tareas sin nota).

---

## 🎓 Endpoints del Alumno
Requieren rol **`ROLE_ALUMNO`**.

### `AlumnoController` (`/api/portal/alumno`)
* **`GET /api/portal/alumno/cursos`**
  * **Descripción**: Devuelve la lista de cursos en los que está matriculado el alumno autenticado junto a los nombres de sus respectivos profesores.

---

## 👨‍👩‍👦 Endpoints del Padre de Familia
Requieren rol **`ROLE_PADRE`**.

### `PadreController` (`/api/portal/padre`)
* **`GET /api/portal/padre/hijos`**
  * **Descripción**: Obtiene la lista de hijos asociados al padre autenticado para realizar el seguimiento escolar.
