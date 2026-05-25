# Entidades JPA y Flujo de Datos

Este documento describe detalladamente el estado actual del modelo de persistencia del programa, la forma en que los servicios interactúan con la base de datos, y los flujos críticos de información.

---

## 🏗️ Modelo de Persistencia Actual: Entidades JPA

En la versión actual del proyecto, **solo existe una clase anotada como entidad JPA**:

### 1. `Usuario.java` (en el paquete `pe.sanagustin.portal.entity`)
Mapea directamente la tabla `usuarios` en PostgreSQL.
* **Anotaciones clave**:
  * `@Entity` y `@Table(name = "usuarios")`.
  * `@Getter` y `@Setter` (Lombok) para evitar métodos repetitivos.
  * `@Id` y `@GeneratedValue(strategy = GenerationType.IDENTITY)`.
  * `@Enumerated(EnumType.STRING)` para mapear el rol (`RolUsuario`) directamente como texto.
  * `@PrePersist` en el método `onCreate()` para autodefinir la fecha de creación al persistir el objeto.

### ⚠️ Limitación en el Modelado JPA
El resto de los datos en la base de datos (alumnos, docentes, cursos, notas, asistencias, comunicados, etc.) **no tienen entidades JPA ni clases mapeadas correspondientes**. Tampoco existen repositorios de Spring Data JPA para interactuar con ellas, excepto `UsuarioRepository.java`.

---

## 🔄 Mecanismo de Consulta a la Base de Datos

Para interactuar con las más de 18 tablas restantes de la base de datos, los servicios de Spring Boot utilizan un enfoque de **consultas SQL nativas** gestionadas a través del contexto de persistencia directa:

1. **Inyección de `EntityManager`**:
   Los servicios tienen anotado un `@PersistenceContext` o `@RequiredArgsConstructor` que inyecta la interfaz estándar `EntityManager` de JPA.
2. **Consultas SQL directas**:
   Se escriben consultas complejas de PostgreSQL utilizando bloques de texto de Java (Text Blocks `"""..."""`).
3. **Mapeo manual**:
   Se llama a `entityManager.createNativeQuery(sql)` pasando parámetros mediante `.setParameter("name", value)`.
   Los resultados se reciben en formato de lista de arreglos de objetos (`List<Object[]>`), donde cada celda del arreglo representa una columna de la base de datos.
   Posteriormente, se utiliza la API Stream de Java (`rows.stream().map(...)`) para castear manualmente los tipos primitivos a objetos DTO (Data Transfer Objects) que son los que finalmente se devuelven al controlador.

### Ejemplo de flujo (Lectura de Cursos de un Alumno):
```java
// 1. Ejecutar consulta nativa con joins en 10 tablas relacionadas
List<Object[]> rows = em.createNativeQuery(sql)
        .setParameter("codigo", codigo)
        .getResultList();

// 2. Mapear fila por fila de forma manual a un DTO estructurado
return rows.stream().map(r -> new CursoAlumnoDto(
        (String)  r[0], // Curso
        (String)  r[1], // Área
        ((Number) r[2]).intValue(), // Horas
        (String)  r[3], // Grado
        (String)  r[4], // Sección
        (String)  r[5], // Turno
        (String)  r[6], // Periodo
        (String)  r[7]  // Docente
)).toList();
```

---

## ⚡ Flujos Críticos de Datos del Sistema

### A. Registro y Carga de Notas ante Nuevas Evaluaciones
1. El docente llama al endpoint para crear un examen o tarea (`POST /api/portal/docente/cursos/{id}/examenes`).
2. Se ejecuta un `INSERT` en la tabla `examenes_curso` o `tareas_curso`, el cual devuelve el ID autogenerado mediante `RETURNING id_examen`.
3. Utilizando el nuevo ID, el sistema realiza una inserción masiva en la tabla `notas_examen` o `notas_tarea` seleccionando a todos los alumnos que tienen una matrícula activa en dicha aula.
4. Las calificaciones quedan inicializadas en `NULL` y la asistencia en `TRUE` (para exámenes) o entregado en `FALSE` (para tareas), listas para ser rellenadas en el panel del profesor.
5. Todo esto ocurre dentro de una transacción única protegida por la anotación `@Transactional`.

### B. Control de Asistencia Diario
1. El docente solicita la planilla de asistencia del día.
2. Al registrar el envío (`POST`), el sistema realiza una operación **UPSERT** (`INSERT ON CONFLICT DO UPDATE`) en la tabla `asistencias` y su detalle `asistencia_alumnos`.
3. Esto garantiza que si el docente se equivoca y vuelve a guardar la asistencia del mismo curso para la misma fecha, los registros anteriores no se dupliquen, sino que se sobrescriban atómicamente con los nuevos estados.

### C. Mensajería Directa Padre-Docente
1. El padre de familia escribe un mensaje que contiene el destinatario (`id_maestro`), el alumno en cuestión y el tipo de mensaje.
2. Se inserta en la tabla `mensajes` con `leido = FALSE`.
3. Cuando el docente inicia sesión y consulta el detalle del mensaje, el sistema ejecuta un `UPDATE mensajes SET leido = TRUE WHERE id_mensaje = :id` marcándolo como leído al instante.
4. El docente puede responder, lo cual realiza un insert en la tabla `mensajes_respuestas` que comparte un hilo bidireccional mediante `id_mensaje`.
