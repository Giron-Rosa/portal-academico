# Guía de Docker para Desarrollo en Node.js/NestJS: Sincronización en Tiempo Real y Gestión de `node_modules`

Esta guía aborda de forma profesional y práctica cómo resolver uno de los dolores de cabeza más comunes en entornos de desarrollo con Docker: la sincronización de código en tiempo real, la gestión eficiente de la caché de dependencias (`node_modules`), y cómo actualizar librerías al cambiar de rama de Git en menos de 5 segundos sin tocar la base de datos (PostgreSQL).

---

## 1. Sincronización en Tiempo Real con Docker Volumes (Bind Mounts)

Para lograr que los cambios en tu código local se reflejen inmediatamente dentro del contenedor sin reconstruir la imagen, utilizamos **Bind Mounts**.

### A. El archivo `Dockerfile.dev` (Optimizado para desarrollo)
Es fundamental estructurar el `Dockerfile` de desarrollo de modo que separe la instalación de dependencias del copiado del código. Esto permite aprovechar al máximo el sistema de capas de Docker.

```dockerfile
# Dockerfile.dev
FROM node:20-alpine

WORKDIR /usr/src/app

# Copiamos package.json y package-lock.json primero para aprovechar la caché de Docker
COPY package*.json ./

# Instalamos las dependencias
RUN npm install

# Copiamos el resto del código fuente (se sobrescribirá en desarrollo por el volumen, pero es buena práctica para fallback)
COPY . .

# Exponemos el puerto de la aplicación (por ejemplo, 3000 para NestJS)
EXPOSE 3000

# Iniciamos la aplicación en modo desarrollo (con hot-reload activado, ej. nest start --watch o nodemon)
CMD ["npm", "run", "start:dev"]
```

### B. El archivo `docker-compose.yml`
En el archivo de composición, configuramos el volumen para mapear nuestra carpeta local al contenedor.

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: nest_app_dev
    ports:
      - "3000:3000"
    volumes:
      # 1. Bind Mount: Sincroniza todo tu código local con el contenedor
      - .:/usr/src/app
      # 2. Anonymous Volume: Evita que los node_modules de tu host (local)
      # sobrescriban o borren los node_modules que se instalaron dentro del contenedor.
      - /usr/src/app/node_modules
    environment:
      - NODE_ENV=development
    depends_on:
      - db
    command: npm run start:dev

  db:
    image: postgres:15-alpine
    container_name: postgres_db_dev
    ports:
      - "5432:5432"
    volumes:
      # Volumen persistente para no perder tus datos de prueba
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=mi_base_de_datos

volumes:
  pgdata:
```

> [!IMPORTANT]
> **¿Por qué el volumen `- /usr/src/app/node_modules` es clave?**
> Al mapear `- .:/usr/src/app`, Docker monta tu carpeta local (que podría no tener `node_modules` o tener una versión de Windows/macOS no compatible con Alpine Linux del contenedor). Al declarar el volumen anónimo `/usr/src/app/node_modules`, Docker le dice al contenedor: *"Mantén la carpeta `node_modules` del contenedor aislada y no la sobrescribas con lo que haya en el host local"*.

---

## 2. La Estrategia Profesional para el Caché de `node_modules`

Cuando cambias de rama en Git, suceden dos escenarios problemáticos:
1. **La rama tiene paquetes nuevos/diferentes:** Tu entorno local cambia el `package.json`, pero el volumen anónimo del contenedor sigue teniendo los `node_modules` antiguos del momento en que se construyó la imagen.
2. **Conflicto de versiones:** Si ejecutas `npm install` localmente, se instala en tu host, pero el contenedor no se entera porque tiene su propia carpeta de `node_modules` aislada.

### Estrategia recomendada:
En lugar de reconstruir todo el contenedor con `--build` (que recrea capas y detiene la base de datos), debes **inyectar la instalación directamente en el contenedor en ejecución** o **reiniciar quirúrgicamente el contenedor de la aplicación**.

---

## 3. Aplicado a tu Proyecto Actual (`portal-academico`)

Hemos analizado tu estructura y vemos que tu servicio de frontend en [docker-compose.yml](file:///c:/Users/ale10/.gemini/antigravity/scratch/portal-academico/docker-compose.yml) ya tiene configurado el volumen anónimo:
```yaml
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    volumes:
      - ./frontend:/app
      - /app/node_modules
```

Para tu caso específico (donde el servicio se llama `frontend` y las dependencias están bajo la carpeta `/app`), las soluciones rápidas son las siguientes:

### Opción A: Script de Bash Quirúrgico (`docker-sync.sh`)
Crea un archivo llamado `docker-sync.sh` en la raíz de tu proyecto para ejecutarlo al cambiar de rama:

```bash
#!/bin/bash

# Nombre del servicio en docker-compose.yml
SERVICE_NAME="frontend"

echo "🔄 Sincronizando dependencias del Frontend en Docker..."

# 1. Comprobamos si el contenedor del frontend está corriendo
if [ "$(docker compose ps -q $SERVICE_NAME)" ]; then
  echo "⚡ El contenedor del frontend está corriendo. Instalando dependencias nuevas dentro del contenedor..."
  
  # Ejecuta npm install en segundo plano en el contenedor (sin crear pseudo-TTY con -T)
  # Esto actualizará SOLO los paquetes nuevos/cambiados en menos de 5 segundos gracias a la caché interna del volumen de node_modules.
  docker compose exec -T $SERVICE_NAME npm install
  
  echo "🚀 Reiniciando únicamente el contenedor del frontend para aplicar cambios en memoria..."
  docker compose restart $SERVICE_NAME
  
  echo "✅ ¡Frontend sincronizado con éxito sin tocar la base de datos ni detener otros servicios!"
else
  echo "⚠️ El contenedor del frontend no está corriendo. Iniciando servicios en segundo plano..."
  docker compose up -d $SERVICE_NAME
fi
```

### Opción B: Comandos rápidos en tu `package.json` raíz
Puedes agregar esta sección de scripts en tu [package.json](file:///c:/Users/ale10/.gemini/antigravity/scratch/portal-academico/package.json) raíz para lanzarlo cómodamente desde la terminal:

```json
  "scripts": {
    "docker:sync-front": "docker compose exec -T frontend npm install && docker compose restart frontend",
    "docker:rebuild-front": "docker compose up -d --build frontend"
  }
```

- **`npm run docker:sync-front`**: Ejecuta `npm install` dentro del contenedor del frontend y lo reinicia. Demora **menos de 5 segundos** si los cambios de dependencias son menores o nulos. No toca el servicio `db` (PostgreSQL), por lo que **no pierdes tus datos ni tus tablas de prueba**.
- **`npm run docker:rebuild-front`**: Si la instalación interna falla por cambios extremos, este comando reconstruye únicamente la imagen del frontend sin afectar a la base de datos.
