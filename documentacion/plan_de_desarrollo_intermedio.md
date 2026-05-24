# Plan de Desarrollo de Software - Versión Intermedia
**Proyecto**: Portal Académico San Agustín Campus
**Estado**: Intermedio - Integrado con Seguridad JWT y Spring Security

Este documento detalla la implementación del control de acceso perimetral en el backend del **Portal Académico**, abarcando el cifrado de contraseñas, asignación de roles jerárquicos y la autenticación basada en JSON Web Tokens (JWT).

---

## 🔒 1. Mecanismo de Seguridad y Almacenamiento

### Cifrado de Contraseñas
Para proteger la integridad de las cuentas del campus, las contraseñas nunca se almacenan en texto plano en la base de datos PostgreSQL. Se procesan en el backend a través de la clase `BCryptPasswordEncoder` (Spring Security), aplicando un algoritmo robusto de hash unidireccional con sal aleatoria.

### Roles Jerárquicos de Acceso
El sistema implementa seguridad basada en roles (`hasRole` de Spring Security):
* **`ROLE_ADMIN`**: Acceso total al catálogo escolar, creación de asignaturas e inicialización de cuentas.
* **`ROLE_MAESTRO`**: Permisos exclusivos para registrar asistencias, calificar tareas/exámenes y subir materiales en sus asignaturas.
* **`ROLE_ALUMNO`**: Vista restringida de cursos y descarga de materiales asignados a su grado.
* **`ROLE_PADRE`**: Consulta de calificaciones de sus hijos y mensajería directa con los docentes.

---

## 🔑 2. Flujo de Autenticación con JWT

El flujo para realizar peticiones autenticadas y autorizadas comprende las siguientes etapas:

```
[Cliente Angular] -----> 1. POST /api/auth/login (Credenciales) -----> [Spring Boot]
[Cliente Angular] <----- 2. Return JWT (Token con claims de Rol) <----- [Spring Boot]
[Cliente Angular] -----> 3. GET /api/portal/docente/cursos + Auth header -> [Spring Boot]
                                                                        (Filtro valida JWT)
```

1. **Autenticación Inicial**: El cliente envía un `POST` con credenciales de usuario (código o email y contraseña).
2. **Generación del Token**: El backend valida los hashes de contraseña en la base de datos relacional y genera un token JWT firmado digitalmente con un secreto BASE64 seguro. El token lleva en su payload (claims) la identidad del usuario y su rol.
3. **Petición Protegida**: En cada petición subsiguiente, el cliente incluye la cabecera `Authorization: Bearer <JWT>`.
4. **Filtro de Seguridad (`JwtAuthFilter`)**: El backend intercepta la petición, verifica la firma del token, extrae los permisos y configura el contexto de seguridad en `SecurityContextHolder`.

---

## ⚡ 3. Demostración de Endpoints y Capturas de Flujo (Curl)

### A. Registro de un nuevo Usuario (Register)
* **Método**: `POST`
* **Ruta**: `/api/auth/register`
* **Comando Curl**:
  ```bash
  curl -X POST http://localhost:8080/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"codigo": "ADM-002", "email": "soporte@sanagustin.edu.pe", "contrasena": "Soporte2026*", "rol": "admin"}'
  ```
* **Respuesta Esperada (201 Created)**:
  ```json
  {
    "mensaje": "Usuario registrado exitosamente"
  }
  ```

### B. Inicio de Sesión de Prueba (Login)
* **Método**: `POST`
* **Ruta**: `/api/auth/login`
* **Comando Curl**:
  ```bash
  curl -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"identifier": "ADM-002", "contrasena": "Soporte2026*"}'
  ```
* **Respuesta Esperada (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJBRE0tMDAyIiwicm9sIjoiYWRtaW4iLCJpYXQiOjE3NDg5NTY0MDB9...",
    "rol": "admin",
    "codigo": "ADM-002",
    "email": "soporte@sanagustin.edu.pe",
    "nombre": "ADM-002"
  }
  ```

### C. Llamar a Endpoint Protegido con JWT (Ejemplo: Cursos de Admin)
* **Método**: `GET`
* **Ruta**: `/api/admin/cursos`
* **Comando Curl**:
  ```bash
  curl -X GET http://localhost:8080/api/admin/cursos \
    -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJBRE0tMDAyIiwicm9sIjoiYWRtaW4i..."
  ```
* **Respuesta Esperada (200 OK)**:
  ```json
  [
    { "idCurso": 1, "nombre": "Matemática", "area": "Matemática", "activo": true }
  ]
  ```

### D. Llamada Rechazada por Token Inválido o Ausente
* **Método**: `GET`
* **Ruta**: `/api/admin/cursos`
* **Comando Curl**:
  ```bash
  curl -X GET http://localhost:8080/api/admin/cursos
  ```
* **Respuesta Esperada (401 Unauthorized)**:
  * El sistema deniega el acceso y devuelve un código de estado `401 Unauthorized` bloqueando la llamada.
