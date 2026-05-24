# Estructura de la Base de Datos: Portal Académico

La base de datos del sistema está desarrollada en **PostgreSQL 16**. Sigue un modelo relacional altamente normalizado para evitar la redundancia y garantizar la integridad de los datos académicos.

---

## 🗺️ Diagrama de Relaciones e Integridad

A continuación se detallan las tablas que estructuran la base de datos, divididas por categorías lógicas.

### 1. Gestión de Seguridad y Usuarios
Centraliza las credenciales de acceso para los cuatro roles del sistema.

* #### `usuarios`
  * `id_usuario` (`SERIAL`, PK): Identificador único secuencial.
  * `codigo` (`VARCHAR(30)`, Unique, Not Null): Código institucional único (ej., `5B111808`, `PAD-2024-00142`, `OC16Mar26`, `ADM-001`).
  * `email` (`VARCHAR(120)`, Unique, Not Null): Correo electrónico.
  * `contrasena_hash` (`VARCHAR(255)`, Not Null): Contraseña cifrada en la base de datos usando **BCrypt**.
  * `rol` (`VARCHAR(20)`, Not Null): Roles permitidos (`alumno`, `padre`, `maestro`, `admin`).
  * `activo` (`BOOLEAN`, Default `TRUE`): Estado de la cuenta.
  * `ultimo_acceso` (`TIMESTAMP`): Fecha del último inicio de sesión exitoso.
  * `fecha_creacion` (`TIMESTAMP`, Default `NOW()`): Fecha de registro de la cuenta.

---

### 2. Información Personal y Perfiles
Cada perfil de usuario tiene datos específicos asociados a su cuenta mediante una relación `1:1` con la tabla `usuarios`.

* #### `alumnos`
  * `id_alumno` (`SERIAL`, PK): Código único del alumno.
  * `id_usuario` (`INT`, Unique, Not Null, FK → `usuarios`): Cuenta asociada.
  * `nombre` (`VARCHAR(80)`, Not Null): Nombre del estudiante.
  * `apellido` (`VARCHAR(80)`, Not Null): Apellido del estudiante.
  * `grado` (`VARCHAR(20)`, Not Null): Grado académico asignado (ej., `5to Secundaria`).
  * `seccion` (`VARCHAR(10)`, Not Null): Sección (ej., `B`).
  * `fecha_nacimiento` (`DATE`, Not Null): Fecha de nacimiento.

* #### `padres`
  * `id_padre` (`SERIAL`, PK): Código único del padre/madre.
  * `id_usuario` (`INT`, Unique, Not Null, FK → `usuarios`): Cuenta asociada.
  * `nombre` (`VARCHAR(80)`, Not Null): Nombre completo.
  * `apellido` (`VARCHAR(80)`, Not Null): Apellido.
  * `dni` (`VARCHAR(20)`, Unique, Not Null): Documento de Identidad.
  * `telefono` (`VARCHAR(20)`): Teléfono de contacto.

* #### `maestros`
  * `id_maestro` (`SERIAL`, PK): Código único del docente.
  * `id_usuario` (`INT`, Unique, Not Null, FK → `usuarios`): Cuenta asociada.
  * `nombre` (`VARCHAR(80)`, Not Null): Nombre.
  * `apellido` (`VARCHAR(80)`, Not Null): Apellido.
  * `especialidad` (`VARCHAR(100)`): Especialidad (ej., `Matemáticas`).
  * `dni` (`VARCHAR(20)`, Unique, Not Null): DNI del docente.
  * `telefono` (`VARCHAR(20)`): Teléfono.

* #### `padre_hijo` (Relación M:N)
  * Asocia a los padres con sus respectivos hijos en el campus.
  * `id` (`SERIAL`, PK).
  * `id_padre` (`INT`, Not Null, FK → `padres` con `ON DELETE CASCADE`).
  * `id_alumno` (`INT`, Not Null, FK → `alumnos` con `ON DELETE CASCADE`).
  * `parentesco` (`VARCHAR(20)`, Not Null): Ej. `madre`, `padre`, `apoderado`.
  * `es_principal` (`BOOLEAN`, Default `TRUE`): Identifica si es el tutor principal.
  * *Unicidad*: Clave compuesta implícita `UNIQUE(id_padre, id_alumno)`.

---

### 3. Estructura Académica (Cursos, Grados, Aulas)
Define los catálogos y grupos donde se dictan las clases.

* #### `grados`
  * `id_grado` (`SERIAL`, PK): Ej. `1`, `2`.
  * `nombre` (`VARCHAR(30)`, Unique, Not Null): Ej., `1ro Primaria`, `5to Secundaria`.
  * `nivel` (`VARCHAR(20)`, Not Null): Nivel educativo (`Primaria` / `Secundaria`).
  * `orden` (`INT`, Not Null): Orden lógico (1 al 11) para ordenar los listados en los menús.

* #### `secciones`
  * `id_seccion` (`SERIAL`, PK).
  * `nombre` (`VARCHAR(5)`, Unique, Not Null): Letras identificadoras (`A`, `B`, `C`).

* #### `cursos`
  * `id_curso` (`SERIAL`, PK).
  * `nombre` (`VARCHAR(80)`, Not Null): Nombre de la materia (ej. `Matemática`).
  * `area` (`VARCHAR(60)`): Área curricular (ej. `Matemática`, `Comunicación`).
  * `activo` (`BOOLEAN`, Default `TRUE`).

* #### `periodos_academicos`
  * `id_periodo` (`SERIAL`, PK).
  * `nombre` (`VARCHAR(20)`, Unique, Not Null): Ej., `2026-I`.
  * `fecha_inicio` (`DATE`, Not Null).
  * `fecha_fin` (`DATE`, Not Null).
  * `activo` (`BOOLEAN`, Default `FALSE`): Controla cuál periodo está en curso.

* #### `aulas` (Relación Cruzada: Grado + Sección + Periodo)
  * Representa un grupo escolar activo de alumnos en un año y turno determinado.
  * `id_aula` (`SERIAL`, PK).
  * `id_grado` (`INT`, Not Null, FK → `grados`).
  * `id_seccion` (`INT`, Not Null, FK → `secciones`).
  * `id_periodo` (`INT`, Not Null, FK → `periodos_academicos`).
  * `turno` (`VARCHAR(15)`, Default `'mañana'`).
  * *Unicidad*: Clave compuesta `UNIQUE(id_grado, id_seccion, id_periodo)`.

* #### `aula_cursos`
  * Relaciona las materias específicas que se dictan en cada salón.
  * `id_aula_curso` (`SERIAL`, PK).
  * `id_aula` (`INT`, Not Null, FK → `aulas` con `ON DELETE CASCADE`).
  * `id_curso` (`INT`, Not Null, FK → `cursos` con `ON DELETE RESTRICT`).
  * `horas_semana` (`INT`, Default `4`).
  * *Unicidad*: Clave compuesta `UNIQUE(id_aula, id_curso)`.

* #### `docente_asignaciones`
  * Vincula a un maestro con un curso de un aula específica.
  * `id_asignacion` (`SERIAL`, PK).
  * `id_aula_curso` (`INT`, Not Null, FK → `aula_cursos` con `ON DELETE CASCADE`).
  * `id_maestro` (`INT`, Not Null, FK → `maestros` con `ON DELETE RESTRICT`).
  * `fecha_asignacion` (`DATE`, Default `CURRENT_DATE`).
  * `activo` (`BOOLEAN`, Default `TRUE`).
  * *Unicidad*: Clave compuesta `UNIQUE(id_aula_curso, id_maestro)`.

* #### `matriculas`
  * Vincula al estudiante con su aula física para el año en curso.
  * `id_matricula` (`SERIAL`, PK).
  * `id_alumno` (`INT`, Not Null, FK → `alumnos` con `ON DELETE RESTRICT`).
  * `id_aula` (`INT`, Not Null, FK → `aulas` con `ON DELETE RESTRICT`).
  * `fecha_matricula` (`DATE`, Default `CURRENT_DATE`).
  * `estado` (`VARCHAR(15)`, Default `'activa'`): Ej. `activa`, `retirado`, `trasladado`.
  * *Unicidad*: Clave compuesta `UNIQUE(id_alumno, id_aula)`.

* #### `horarios`
  * Horas y días de dictado para cada curso.
  * `id_horario` (`SERIAL`, PK).
  * `id_aula_curso` (`INT`, Not Null, FK → `aula_cursos` con `ON DELETE CASCADE`).
  * `dia_semana` (`SMALLINT`, Check entre 1 y 5): 1=Lunes, 2=Martes, ..., 5=Viernes.
  * `hora_inicio` (`TIME`, Not Null).
  * `hora_fin` (`TIME`, Not Null).
  * *Validación*: `hora_fin > hora_inicio`.

---

### 4. Flujo Diario y Gestión Académica
Tablas creadas y utilizadas por los docentes para administrar clases, calificaciones, materiales y asistencia.

* #### `comunicados`
  * `id_comunicado` (`SERIAL`, PK).
  * `id_maestro` (`INT`, Not Null, FK → `maestros` con `ON DELETE CASCADE`).
  * `id_aula` (`INT`, FK → `aulas` con `ON DELETE SET NULL`): `NULL` indica que es general para todos los alumnos del docente.
  * `titulo` (`VARCHAR(200)`, Not Null).
  * `descripcion` (`TEXT`).
  * `tipo` (`VARCHAR(30)`, Default `'general'`): `examen`, `actividad`, `reunion_padres`, `paseo`, `dia_festivo`, `general`.
  * `fecha_evento` (`DATE`): Fecha del evento; `NULL` si no aplica.
  * `fecha_creacion` (`TIMESTAMP`, Default `NOW()`).

* #### `materiales_curso`
  * `id_material` (`SERIAL`, PK).
  * `id_aula_curso` (`INT`, Not Null, FK → `aula_cursos` con `ON DELETE CASCADE`).
  * `semana` (`SMALLINT`, Default `1`).
  * `clase` (`SMALLINT`, Default `1`).
  * `titulo` (`VARCHAR(200)`, Not Null).
  * `tipo` (`VARCHAR(20)`, Default `'pdf'`): `pdf`, `word`, `video`, `url`, `youtube`.
  * `url` (`TEXT`): Enlace o nombre de archivo.
  * `fecha_creacion` (`TIMESTAMP`, Default `NOW()`).

* #### `examenes_curso`
  * `id_examen` (`SERIAL`, PK).
  * `id_aula_curso` (`INT`, Not Null, FK → `aula_cursos` con `ON DELETE CASCADE`).
  * `numero_examen` (`INT`, Not Null).
  * `semana` (`INT`, Not Null).
  * `clase` (`INT`, Not Null).
  * `titulo` (`VARCHAR(150)`, Not Null).
  * `descripcion` (`TEXT`).
  * `tipo` (`VARCHAR(20)`, Not Null): `mensual`, `bimestral`, `practica`, `proyecto`.
  * `fecha_examen` (`DATE`, Not Null).
  * `duracion_minutos` (`INT`).
  * `nota_maxima` (`INT`, Default `20`).
  * `url` (`TEXT`).
  * `fecha_creacion` (`TIMESTAMP`, Default `NOW()`).

* #### `notas_examen` (Relación M:N entre Alumnos y Exámenes)
  * `id_nota_examen` (`SERIAL`, PK).
  * `id_examen` (`INT`, Not Null, FK → `examenes_curso` con `ON DELETE CASCADE`).
  * `id_alumno` (`INT`, Not Null, FK → `alumnos` con `ON DELETE CASCADE`).
  * `asistio` (`BOOLEAN`, Default `TRUE`).
  * `nota` (`DECIMAL(4,2)`): Calificación (rango usual 0.0 a 20.0); `NULL` si aún no se califica.
  * *Unicidad*: Clave compuesta `UNIQUE(id_examen, id_alumno)`.

* #### `tareas_curso`
  * `id_tarea` (`SERIAL`, PK).
  * `id_aula_curso` (`INT`, Not Null, FK → `aula_cursos` con `ON DELETE CASCADE`).
  * `numero_tarea` (`INT`, Not Null).
  * `semana` (`INT`, Not Null).
  * `clase` (`INT`, Not Null).
  * `titulo` (`VARCHAR(150)`, Not Null).
  * `descripcion` (`TEXT`).
  * `fecha_entrega` (`DATE`, Not Null).
  * `nota_maxima` (`INT`, Default `20`).
  * `url` (`TEXT`).
  * `fecha_creacion` (`TIMESTAMP`, Default `NOW()`).

* #### `notas_tarea` (Relación M:N entre Alumnos y Tareas)
  * `id_nota` (`SERIAL`, PK).
  * `id_tarea` (`INT`, Not Null, FK → `tareas_curso` con `ON DELETE CASCADE`).
  * `id_alumno` (`INT`, Not Null, FK → `alumnos` con `ON DELETE CASCADE`).
  * `entregado` (`BOOLEAN`, Default `FALSE`).
  * `fecha_entrega` (`TIMESTAMP`).
  * `nota` (`DECIMAL(4,2)`): Calificación; `NULL` si aún no se califica.
  * *Unicidad*: Clave compuesta `UNIQUE(id_tarea, id_alumno)`.

* #### `asistencias`
  * `id_asistencia` (`SERIAL`, PK).
  * `id_aula_curso` (`INT`, Not Null, FK → `aula_cursos` con `ON DELETE CASCADE`).
  * `fecha` (`DATE`, Not Null).
  * `semana` (`INT`, Not Null).
  * `clase` (`INT`, Not Null).
  * `fecha_creacion` (`TIMESTAMP`, Default `NOW()`).
  * *Unicidad*: Clave compuesta `UNIQUE(id_aula_curso, fecha)`.

* #### `asistencia_alumnos` (Relación M:N entre Matrículas y Asistencias)
  * `id_asistencia_alumno` (`SERIAL`, PK).
  * `id_asistencia` (`INT`, Not Null, FK → `asistencias` con `ON DELETE CASCADE`).
  * `id_alumno` (`INT`, Not Null, FK → `alumnos` con `ON DELETE CASCADE`).
  * `estado` (`VARCHAR(15)`, Default `'asistio'`): `asistio`, `tardanza`, `falta_justificada`, `falta_injustificada`.
  * *Unicidad*: Clave compuesta `UNIQUE(id_asistencia, id_alumno)`.

---

### 5. Canales de Comunicación Directa
Permite mensajería e intercambio de información sensible.

* #### `mensajes`
  * `id_mensaje` (`SERIAL`, PK).
  * `id_padre` (`INT`, Not Null, FK → `padres` con `ON DELETE CASCADE`).
  * `id_maestro` (`INT`, Not Null, FK → `maestros` con `ON DELETE RESTRICT`).
  * `id_alumno` (`INT`, FK → `alumnos` con `ON DELETE SET NULL`).
  * `id_aula_curso` (`INT`, FK → `aula_cursos` con `ON DELETE SET NULL`).
  * `asunto` (`VARCHAR(200)`, Not Null).
  * `cuerpo` (`TEXT`, Not Null).
  * `tipo` (`VARCHAR(20)`, Default `'consulta'`): `justificante` / `consulta` / `otro`.
  * `leido` (`BOOLEAN`, Default `FALSE`): Estado de lectura del maestro.
  * `fecha_envio` (`TIMESTAMP`, Default `NOW()`).

* #### `mensajes_respuestas` (Hilo de respuestas)
  * `id_respuesta` (`SERIAL`, PK).
  * `id_mensaje` (`INT`, Not Null, FK → `mensajes` con `ON DELETE CASCADE`).
  * `id_usuario` (`INT`, Not Null, FK → `usuarios` con `ON DELETE RESTRICT`): Identifica si responde el docente o el padre.
  * `cuerpo` (`TEXT`, Not Null).
  * `fecha` (`TIMESTAMP`, Default `NOW()`).

* #### `reportes_alumno` (Boletas / Libretas Bimestrales)
  * `id_reporte` (`SERIAL`, PK).
  * `id_aula_curso` (`INT`, Not Null, FK → `aula_cursos` con `ON DELETE CASCADE`).
  * `id_alumno` (`INT`, Not Null, FK → `alumnos` con `ON DELETE CASCADE`).
  * `bimestre` (`INT`, Not Null CHECK (bimestre BETWEEN 1 AND 4)).
  * `nota_promedio` (`DECIMAL(4,2)`).
  * `comentario` (`TEXT`).
  * `visible_padre` (`BOOLEAN`, Default `FALSE`).
  * `fecha_creacion` (`TIMESTAMP`, Default `NOW()`).
  * *Unicidad*: Clave compuesta `UNIQUE(id_aula_curso, id_alumno, bimestre)`.
