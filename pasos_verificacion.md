# 📋 Guía de Verificación Manual — Portal Padre (Fases 1 a 4)

Este documento detalla los pasos para probar de manera manual las funcionalidades implementadas en el **Portal del Padre** (desde el Login, pasando por Mensajes, Cursos, Asistencia, hasta Eventos y Pagos).

---

## 🔐 0. Preparativos e Inicio de Sesión
1. **Credenciales de prueba:**
   * **Usuario Apoderado:** `PAD-2024-00142`
   * **Contraseña:** `password`
2. Abre tu navegador e ingresa a `http://localhost:4200/`.
3. Selecciona la pestaña **PADRE**, ingresa las credenciales y haz clic en **Ingresar**.
4. Deberás ver el dashboard de inicio con el resumen de tus hijos (por ejemplo, el alumno `5B111808` - *Carlos Andrés*).

---

## 💬 Fase 1: Mensajería en Tiempo Real (STOMP + Paginación)
1. **Ver Bandeja de Hilos:**
   * En el menú lateral izquierdo, haz clic en **Mensajes**.
   * Deberá cargar la lista de conversaciones del padre (columna izquierda) y una vista vacía a la derecha.
2. **Crear Nuevo Chat:**
   * Haz clic en el botón **+ Nuevo** de la columna izquierda.
   * Se abrirá un modal animado que lista los docentes del alumno.
   * Selecciona un docente/curso (ej. *Oscar Castillo - Matemática*), ingresa un asunto (ej. *Consulta de Tarea*) y escribe un mensaje en el cuerpo.
   * Haz clic en **Enviar mensaje**. El modal se cerrará y se abrirá automáticamente el chat de este hilo en la columna derecha.
3. **Conversar en Tiempo Real (WebSocket):**
   * En otra pestaña o navegador incógnito, inicia sesión como el docente respectivo (ej: `OC16Mar26` / `password`).
   * Abre la sección de Mensajes del docente y responde al hilo recién creado por el padre.
   * Verifica que la respuesta del docente aparezca instantáneamente en la pantalla del padre sin recargar la página.
4. **Scroll Paginado e Historial:**
   * Si una conversación tiene más de 10 mensajes, verifica que al abrirla solo se carguen las 10 respuestas más recientes.
   * Haz clic en **↑ Cargar mensajes anteriores** al tope del chat y verifica que cargue los siguientes bloques de 10 respuestas en orden cronológico correcto.

---

## 📚 Fase 2: Cursos y Notas Detalladas
1. En el menú lateral izquierdo, haz clic en **Cursos**.
2. **Selector de Alumno:** Si el padre tiene más de un hijo matriculado, verifica que aparezcan pestañas al tope para alternar entre estudiantes y actualizar el listado.
3. **Lista de Cursos Acordeón:**
   * Deberás ver las tarjetas de cada curso con su área, nombre del docente, promedio final actual, porcentaje de asistencia y barra de progreso de tareas.
   * Haz clic en un curso (ej. *Matemática*) para expandirlo.
4. **Tabs de Tareas y Exámenes:**
   * En la sección expandida, alterna entre las pestañas **📋 Tareas** y **📝 Exámenes**.
   * Verifica que las notas aparezcan en semáforo de colores:
     * **Verde:** Notas mayores o iguales a 11 (Aprobado).
     * **Rojo:** Notas menores a 11 o desaprobados.
     * **Gris:** Tareas sin calificar o pendientes.

---

## 📅 Fase 3: Asistencia Detallada
1. En el menú lateral izquierdo, haz clic en **Asistencia**.
2. **Métricas Generales:**
   * Deberás ver una tarjeta principal con el porcentaje global de asistencia del alumno en un anillo de progreso de color dinámico (verde si es >90%, amarillo si es >80% y rojo si está en riesgo).
   * Verás también tarjetas estadísticas con el conteo de: **Asistencias**, **Tardanzas**, **Inasistencias** y **Justificados**.
3. **Historial de Clases:**
   * Abajo se listará la tabla de cada fecha registrada de asistencia con el nombre del curso, el estado (presente/tardanza/inasistencia/justificado) coloreado respectivamente, y el justificante si corresponde.

---

## 📢 Fase 4: Eventos, Comunicados y Pagos
1. **Eventos (Comunicados del Aula):**
   * Haz clic en **Eventos** en el menú lateral.
   * Deberá listar las publicaciones de los docentes para el aula de tu hijo (ej: "Evaluación de operaciones con decimales" o "Reunión de padres de familia").
   * Cada tarjeta mostrará el emoji tipo de evento (Examen, Reunión, Actividad, Paseo, General), la fecha/hora del evento, y el nombre del docente que lo publicó.
2. **Pagos (Pensiones y Matrículas):**
   * Haz clic en **Pagos** en el menú lateral.
   * Si existe alguna cuota morosa vencida (ej. *Pensión Junio 2026*), deberá mostrarse un banner de advertencia color ámbar pidiendo regularizar los pagos.
   * Verás KPI cards con: **Total Pagado**, **Total Pendiente** y **Pensiones Vencidas**.
3. **Pagar en Línea (Simulado):**
   * En la tabla de pensiones, busca una cuota con estado `PENDIENTE` o `VENCIDO` y haz clic en el botón **Pagar en línea**.
   * El botón cambiará temporalmente a "Procesando..." y tras unos segundos simulará la pasarela de pagos exitosa: el estado cambiará a `PAGADO` en color verde, se registrará la fecha actual de pago y se autogenerará un número de comprobante digital (ej. `B002-XXXXXX`).
