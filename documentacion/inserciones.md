# Inserciones y Datos de Prueba

El archivo `database/init.sql` contiene un lote completo de inserciones SQL para inicializar el sistema con un entorno real y funcional. A continuación, se detallan las cuentas y registros clave creados para propósitos de prueba e inspección.

---

## 🔑 Cuentas y Credenciales de Acceso

Todos los usuarios tienen la contraseña predeterminada **`Test1234!`** (excepto el administrador). Las contraseñas se cifran en el backend mediante **BCrypt**.

| Rol | Código (Login) | Nombre Completo | Correo Institucional | Contexto Académico |
| :--- | :--- | :--- | :--- | :--- |
| **Docente** | `OC16Mar26` | Oscar Castillo | `oscar.castillo@sanagustin.edu.pe` | Profesor de Matemáticas |
| **Padre** | `PAD-2024-00142` | Marisol Martínez | `marisol.martinez@gmail.com` | Madre de Juan, Sofía y Diego |
| **Alumno** | `5B111808` | Juan Martínez | `juan.martinez@alumnos.sanagustin.edu.pe` | 5to Secundaria - Sección B |
| **Alumno** | `5B111809` | Sofía Martínez | `sofia.martinez@alumnos.sanagustin.edu.pe` | 3ro Secundaria - Sección A |
| **Alumno** | `3A110045` | Diego Martínez | `diego.martinez@alumnos.sanagustin.edu.pe` | 1ro Primaria - Sección A |
| **Administrador** | `ADM-001` | Administración | `admin@sanagustin.edu.pe` | Gestión Global (Contraseña: `Admin1234!`) |

---

## 🏫 Estructura de Aulas y Matrículas Activas

Se insertan **12 aulas** representativas para el período académico **2026-I**:
1. **5to Secundaria B** (id_aula: 1) -> Matrícula: **Juan Martínez**.
2. **3ro Secundaria A** (id_aula: 2) -> Matrícula: **Sofía Martínez**.
3. **1ro Primaria A** (id_aula: 3) -> Matrícula: **Diego Martínez**.
4. **Otras 9 aulas adicionales** (desde 2do Primaria hasta 5to Secundaria A) para poblar el catálogo de aulas de la institución, cada una con un alumno de prueba asignado automáticamente (ej., Carlos Huanca, Lucía Quispe, Andrea Silva, Camila Rojas, etc.) para que la interfaz se muestre realista.

---

## 📚 Asignación de Materias y Docentes (aula_cursos)

Se establece una distribución de horas y cursos típica de la institución escolar:
* **Matemática** (id_curso: 1, 5 horas/semana): Dictado por el docente principal de pruebas **Oscar Castillo** (id_maestro: 1) en las aulas de 5to Sec B, 3ro Sec A y 1ro Prim A, así como en todas las aulas nuevas creadas.
* **Comunicación** (id_curso: 2, 5-6 horas/semana): Dictado por **María González**.
* **Ciencia y Tecnología** y **Historia** (id_curso: 3 y 4): Dictados por **Carlos Mendoza**.
* **Inglés** (id_curso: 5): Dictado por **Ana Flores**.
* **Educación Física** y **Religión** (id_curso: 7 y 9): Dictados por **Luis Ramírez**.
* **Arte y Cultura** y **Personal Social** (id_curso: 6 y 8): Dictados por **Patricia Salazar**.

---

## ⏰ Bloques Horarios de Clase

Se configuran bloques de horario específicos para el profesor **Oscar Castillo** (Matemática) en sus cursos activos:
* **5to Secundaria B**: Lunes de 07:30 a 09:00, Martes de 10:00 a 11:00 y Jueves de 07:30 a 09:00.
* **3ro Secundaria A**: Lunes de 10:00 a 11:30, Miércoles de 07:30 a 09:00 y Viernes de 10:00 a 11:00.
* **1ro Primaria A**: Martes de 07:30 a 09:00, Miércoles de 10:00 a 11:00 y Viernes de 07:30 a 08:30.

---

## 💬 Comunicados y Mensajes de Prueba

Para validar la comunicación institucional y la bandeja de entrada del docente, se incluyen datos de pre-llenado:
1. **Comunicados**:
   * "Evaluación de operaciones con decimales": Programado para 5to Sec B en los próximos días.
   * "Reunión de padres de familia – Fin de bimestre": Comunicado general programado para todas las aulas del docente.
   * "Paseo escolar al Parque de las Leyendas": Específico para 1ro Primaria A.
   * "No hay clases – Día del Maestro": Día festivo escolar general.
2. **Mensajes Directos**:
   * Mensaje de Marisol Martínez justificando la inasistencia de Juan Martínez por una cita médica (asunto: "Justificante de inasistencia - Juan Martínez", estado: *Sin leer*).
   * Consulta de Marisol sobre los temas y la fecha del examen de Sofía Martínez (estado: *Sin leer*).
   * Justificación por fiebre del menor Diego Martínez, con una **respuesta ya enviada** por el profesor Oscar Castillo indicando los temas a reforzar en casa (estado: *Leído y respondido*).

---

## 📂 Recursos de Aprendizaje (Materiales)

Se incluyen materiales didácticos cargados en la base de datos para simular semanas de avance reales en el curso de Matemática de Oscar Castillo:
* **Semana 1, Clase 1**: PDF "Números enteros: concepto y clasificación" y PDF "Ejercicios de práctica N°1".
* **Semana 1, Clase 2**: Video de YouTube "Operaciones con enteros" y Enlace interactivo "GeoGebra".
* **Semana 2, Clase 1**: PDF "Decimales: concepto, tipos y escritura" y Guía en formato Word.
* **Semana 3, Clase 1**: PDF "Fracciones" y un video explicativo.
* Adicionalmente, materiales similares para 3ro Secundaria A y 1ro Primaria A.
