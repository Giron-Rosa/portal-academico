# Plan de Desarrollo de Software - Versión Inicial
**Proyecto**: Portal Académico San Agustín Campus
**Estado**: Inicial - Aprobado y Configurado

Este documento describe la planificación del desarrollo y la arquitectura base del **Portal Académico – San Agustín Campus**, estableciendo los cimientos técnicos, estructura de datos y el flujo inicial de información.

---

## 📋 1. Descripción del Proyecto y Objetivos

### Descripción General
El Portal Académico es una plataforma centralizada que integra la gestión académica (calificaciones, asistencia, horarios, materiales) y canales de comunicación (anuncios, mensajes de padres) para el Colegio San Agustín.

### Objetivos Principales
* Desarrollar un backend robusto basado en **Spring Boot 3.3.5** y Java 21.
* Configurar una base de datos relacional persistente en **PostgreSQL 16**.
* Implementar seguridad perimetral sin estado para proteger endpoints sensibles.
* Modelar el dominio académico mediante JPA/Hibernate y tablas bien estructuradas.
* Garantizar la portabilidad del entorno de desarrollo mediante contenedores de **Docker**.

---

## 🛠️ 2. Arquitectura de Datos y Relaciones

El sistema se cimenta sobre un modelo relacional altamente normalizado. En la fase inicial se han mapeado y establecido las siguientes tablas e integridad referencial:

1. **`usuarios`**: Centraliza las cuentas, contraseñas encriptadas y roles (`alumno`, `padre`, `maestro`, `admin`).
2. **`alumnos` / `maestros` / `padres`**: Perfiles de usuarios con relación `1:1` hacia la tabla `usuarios`.
3. **`padre_hijo`**: Mapeo Muchos-a-Muchos (`M:N`) entre padres y alumnos.
4. **`grados` / `secciones` / `cursos` / `periodos_academicos`**: Catálogos base de la organización escolar.
5. **`aulas`**: Vinculación de Grado + Sección + Periodo + Turno (`UNIQUE`).
6. **`aula_cursos`**: Asignación de materias específicas por salón de clase.
7. **`docente_asignaciones`**: Vincula al docente que dicta un curso específico.
8. **`matriculas`**: Vincula al alumno inscrito en un aula.

---

## ⚡ 3. Funcionamiento de Endpoints Iniciales (CRUD Cursos)

Se ha implementado el controlador `CursoController` (`/api/admin/cursos`) que proporciona operaciones CRUD completas sobre el catálogo de asignaturas académicas.

### Ejemplos de Funcionamiento y Pruebas (Curl)

#### A. Crear un nuevo Curso (Create)
* **Método**: `POST`
* **Ruta**: `/api/admin/cursos`
* **Comando Curl**:
  ```bash
  curl -X POST http://localhost:8080/api/admin/cursos \
    -H "Content-Type: application/json" \
    -d '{"nombre": "Educación Cívica", "area": "Sociales", "activo": true}'
  ```
* **Respuesta Esperada (201 Created)**:
  ```json
  {
    "idCurso": 10,
    "nombre": "Educación Cívica",
    "area": "Sociales",
    "activo": true
  }
  ```

#### B. Obtener Catálogo de Cursos Activos (Read)
* **Método**: `GET`
* **Ruta**: `/api/admin/cursos/activos`
* **Comando Curl**:
  ```bash
  curl -X GET http://localhost:8080/api/admin/cursos/activos
  ```
* **Respuesta Esperada (200 OK)**:
  ```json
  [
    { "idCurso": 1, "nombre": "Matemática", "area": "Matemática", "activo": true },
    { "idCurso": 2, "nombre": "Comunicación", "area": "Comunicación", "activo": true }
  ]
  ```

#### C. Actualizar Información de un Curso (Update)
* **Método**: `PUT`
* **Ruta**: `/api/admin/cursos/10`
* **Comando Curl**:
  ```bash
  curl -X PUT http://localhost:8080/api/admin/cursos/10 \
    -H "Content-Type: application/json" \
    -d '{"nombre": "Formación Cívica y Ciudadana", "area": "Sociales", "activo": true}'
  ```
* **Respuesta Esperada (200 OK)**:
  ```json
  {
    "idCurso": 10,
    "nombre": "Formación Cívica y Ciudadana",
    "area": "Sociales",
    "activo": true
  }
  ```

#### D. Desactivar un Curso (Delete Lógico)
* **Método**: `DELETE`
* **Ruta**: `/api/admin/cursos/10`
* **Comando Curl**:
  ```bash
  curl -X DELETE http://localhost:8080/api/admin/cursos/10
  ```
* **Respuesta Esperada (200 OK)**:
  ```json
  {
    "mensaje": "Curso desactivado exitosamente"
  }
  ```
