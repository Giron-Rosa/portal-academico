# Portal Académico – San Agustín Campus

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Angular 21 (v21.2.7) |
| Backend | Spring Boot 3.3.5 + JWT |
| Base de datos | PostgreSQL 16 |
| Contenerización | Docker / Docker Compose |

## Puertos

| Servicio  | URL |
|-----------|-----|
| Frontend  | http://localhost:4200 |
| Backend   | http://localhost:8080 |
| PostgreSQL | localhost:5432 |

## Levantar el proyecto

```bash
docker compose up -d
```

> Primera vez: `docker compose up -d --build`

## Usuarios de prueba (contraseña: `Test1234!`)

| Rol | Código | Nombre | Portal |
|-----|--------|--------|--------|
| Alumno | `5B111808` | Juan Martínez | 5to Sec B |
| Alumno | `5B111809` | Sofía Martínez | 3ro Sec A |
| Alumno | `3A110045` | Diego Martínez | 1ro Prim A |
| Alumno | `1S261006` | Camila Rojas | 1ro Sec A |
| Alumno | `2S261007` | Renzo Méndez | 2do Sec A |
| Padre | `PAD-2024-00142` | Marisol Martínez | — |
| Docente | `OC16Mar26` | Oscar Castillo | — |
| Admin | `ADM-001` | — | — |

Admin password: `Admin1234!`

## Estructura de la BD (`database/init.sql`)

Un solo archivo SQL crea todas las tablas e inserta los datos de prueba:
tablas, grados, secciones, cursos, aulas (12 aulas – todos los grados),
docente_asignaciones y matrículas.