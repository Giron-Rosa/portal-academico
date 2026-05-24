# Detalles del Programa: Portal Académico - San Agustín Campus

**Portal Académico – San Agustín Campus** es una plataforma web integral diseñada para la gestión académica y la comunicación fluida dentro del Colegio San Agustín. Su propósito principal es conectar a los tres actores principales del entorno educativo (docentes, alumnos y padres de familia) bajo una misma interfaz intuitiva, segura y centralizada.

---

## 🛠️ Arquitectura y Tecnologías Utilizadas

El sistema utiliza una arquitectura desacoplada moderna:

* **Backend**: 
  * **Framework**: Spring Boot 3.3.5 (Java 21).
  * **Seguridad**: Spring Security + Autenticación basada en tokens sin estado (**JWT**).
  * **Acceso a Datos**: JPA / Hibernate (utilizado para el control de acceso y `Usuario`), junto con consultas SQL nativas ejecutadas mediante `EntityManager` para mayor control y optimización de reportes complejos.
* **Frontend**:
  * **Framework**: Angular 21 (v21.2.7), utilizando componentes reactivos y un diseño premium, responsivo y adaptado para dispositivos móviles y de escritorio.
* **Base de Datos**:
  * **Motor**: PostgreSQL 16.
  * **Estructura**: Modelo relacional altamente normalizado con soporte para integridad referencial (llaves foráneas, restricciones de unicidad, eliminaciones en cascada).
* **Contenerización**:
  * **Docker & Docker Compose**: Permite levantar todo el entorno (Base de datos PostgreSQL, Backend de Spring Boot y Frontend de Angular) de manera automática con un solo comando.

---

## 👥 Roles de Usuario y Funcionalidades Principales

El sistema define 4 roles principales con permisos y vistas totalmente restringidos mediante **Spring Security**:

### 1. 👨‍🏫 Portal del Docente
Es la capa más robusta del sistema, permitiendo al profesor gestionar todo el ciclo del aula:
* **Mis Cursos**: Vista general de las asignaturas dictadas, indicando el grado, la sección, el turno y el número actual de alumnos matriculados.
* **Horarios**: Bloques de clase semanales ordenados cronológicamente por día.
* **Control de Asistencia**: Registro diario de asistencia (asistió, tardanza, falta justificada/injustificada) para cada curso asignado.
* **Materiales de Clase**: Organización semanal y por sesiones de materiales didácticos (PDFs, Word, Videos de YouTube o enlaces web).
* **Gestión de Evaluaciones (Exámenes y Tareas)**:
  * Creación y eliminación de exámenes y tareas por curso.
  * Registro y actualización de calificaciones en tiempo real.
* **Alertas de Pendientes**: Un panel inteligente que avisa al docente si tiene tareas o exámenes pendientes por calificar.
* **Mensajería**: Bandeja de entrada para recibir consultas y justificantes de los padres de familia, con la capacidad de responder y generar un hilo de conversación.
* **Reportes Académicos**: Emisión de libretas o reportes bimestrales por curso para los alumnos matriculados, controlando la visibilidad del reporte hacia los padres.

### 2. 👨‍👩‍👦 Portal del Padre de Familia
Enfocado en el seguimiento cercano del rendimiento del alumno:
* **Mis Hijos**: Panel centralizado si el padre tiene varios hijos en el colegio. Muestra el grado y sección de cada uno.
* **Seguimiento de Calificaciones**: Consulta en tiempo real de las notas obtenidas por sus hijos en tareas y exámenes.
* **Comunicación Directa**: Envío de mensajes con asunto, cuerpo y tipo (ej., justificante médico o consulta académica) directamente a los docentes correspondientes de cada materia.
* **Reportes Oficiales**: Descarga o visualización de reportes y libretas de calificaciones bimestrales una vez que el docente los hace visibles.

### 3. 🎓 Portal del Alumno
Diseñado para que el estudiante acceda a sus recursos de aprendizaje:
* **Mis Asignaturas**: Visualización de los cursos en los que está matriculado durante el período académico activo, indicando el nombre del docente que la dicta.
* **Recursos**: Acceso rápido a los materiales didácticos subidos por sus profesores organizados por semana.

### 4. ⚙️ Portal de Administración (Admin)
Maneja la configuración global del campus:
* Carga de datos base (grados, secciones, periodos académicos, cursos).
* Administración de cuentas de usuario, asignación manual de credenciales y roles.
* Creación de aulas y asignación de docentes a cursos específicos (`docente_asignaciones`).
* Matrícula de alumnos en aulas correspondientes.
