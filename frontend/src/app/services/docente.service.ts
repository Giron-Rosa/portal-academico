import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class DocenteService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private readonly API_BASE = 'http://localhost:8080/api/portal/docente';

  private getHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getEspaciosDisponibles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/reservas/espacios-disponibles`, { headers: this.getHeaders() });
  }

  getReservas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/reservas`, { headers: this.getHeaders() });
  }

  verificarDisponibilidad(body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/reservas/verificar`, body, { headers: this.getHeaders() });
  }

  crearReserva(body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/reservas`, body, { headers: this.getHeaders() });
  }

  actualizarReserva(id: number, body: any): Observable<any> {
    return this.http.put<any>(`${this.API_BASE}/reservas/${id}`, body, { headers: this.getHeaders() });
  }

  eliminarReserva(id: number): Observable<any> {
    return this.http.delete<any>(`${this.API_BASE}/reservas/${id}`, { headers: this.getHeaders() });
  }

  getMisCursos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/mis-cursos`, { headers: this.getHeaders() });
  }

  getMensajes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/mensajes`, { headers: this.getHeaders() });
  }

  getMensajeDetalle(id: number): Observable<any> {
    return this.http.get<any>(`${this.API_BASE}/mensajes/${id}`, { headers: this.getHeaders() });
  }

  getAlumnoContexto(idAlumno: number): Observable<any> {
    return this.http.get<any>(`${this.API_BASE}/mensajes/alumno-contexto/${idAlumno}`, { headers: this.getHeaders() });
  }

  getAlumnosDisponibles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/mensajes/alumnos-disponibles`, { headers: this.getHeaders() });
  }

  crearNuevoMensaje(body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/mensajes/iniciar`, body, { headers: this.getHeaders() });
  }

  responderMensajeAudio(id: number, fd: FormData): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/mensajes/${id}/responder-audio`, fd, { headers: this.getHeaders() });
  }

  sugerirRespuesta(id: number): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/mensajes/${id}/sugerir-respuesta`, {}, { headers: this.getHeaders() });
  }

  responderMensaje(id: number, body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/mensajes/${id}/responder`, body, { headers: this.getHeaders() });
  }

  refinarRespuestaIA(body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/mensajes/ia-redactar`, body, { headers: this.getHeaders() });
  }

  getComunicados(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/comunicados`, { headers: this.getHeaders() });
  }

  getMisAulasComunicados(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/comunicados/mis-aulas`, { headers: this.getHeaders() });
  }

  getTiposEventos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/comunicados/tipos-evento`, { headers: this.getHeaders() });
  }

  crearTipoEvento(body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/comunicados/tipos-evento`, body, { headers: this.getHeaders() });
  }

  crearComunicado(body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/comunicados`, body, { headers: this.getHeaders() });
  }

  eliminarComunicado(id: number): Observable<any> {
    return this.http.delete<any>(`${this.API_BASE}/comunicados/${id}`, { headers: this.getHeaders() });
  }

  getMiHorario(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/mi-horario`, { headers: this.getHeaders() });
  }

  getUnidades(idAulaCurso: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/cursos/${idAulaCurso}/temario`, { headers: this.getHeaders() });
  }

  crearUnidad(idAulaCurso: number, body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/cursos/${idAulaCurso}/temario`, body, { headers: this.getHeaders() });
  }

  actualizarUnidad(idUnidad: number, body: any): Observable<any> {
    return this.http.put<any>(`${this.API_BASE}/temario/${idUnidad}`, body, { headers: this.getHeaders() });
  }

  getMateriales(idAulaCurso: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/cursos/${idAulaCurso}/materiales`, { headers: this.getHeaders() });
  }

  crearMaterial(idAulaCurso: number, body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/cursos/${idAulaCurso}/materiales`, body, { headers: this.getHeaders() });
  }

  eliminarMaterial(idMaterial: number): Observable<any> {
    return this.http.delete<any>(`${this.API_BASE}/cursos/materiales/${idMaterial}`, { headers: this.getHeaders() });
  }

  getTareas(idAulaCurso: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/cursos/${idAulaCurso}/tareas`, { headers: this.getHeaders() });
  }

  crearTarea(idAulaCurso: number, body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/cursos/${idAulaCurso}/tareas`, body, { headers: this.getHeaders() });
  }

  eliminarTarea(idTarea: number): Observable<any> {
    return this.http.delete<any>(`${this.API_BASE}/tareas/${idTarea}`, { headers: this.getHeaders() });
  }

  getNotasTarea(idTarea: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/tareas/${idTarea}/notas`, { headers: this.getHeaders() });
  }

  guardarNotaTarea(idNota: number, body: any): Observable<any> {
    return this.http.patch<any>(`${this.API_BASE}/tareas/notas/${idNota}`, body, { headers: this.getHeaders() });
  }

  registrarRetroalimentacionTarea(idNota: number, body: any): Observable<any> {
    return this.http.patch<any>(`${this.API_BASE}/tareas/notas/${idNota}/retroalimentacion`, body, { headers: this.getHeaders() });
  }

  getExamenes(idAulaCurso: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/cursos/${idAulaCurso}/examenes`, { headers: this.getHeaders() });
  }

  crearExamen(idAulaCurso: number, body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/cursos/${idAulaCurso}/examenes`, body, { headers: this.getHeaders() });
  }

  eliminarExamen(idExamen: number): Observable<any> {
    return this.http.delete<any>(`${this.API_BASE}/examenes/${idExamen}`, { headers: this.getHeaders() });
  }

  getNotasExamen(idExamen: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/examenes/${idExamen}/notas`, { headers: this.getHeaders() });
  }

  guardarNotaExamen(idNota: number, body: any): Observable<any> {
    return this.http.patch<any>(`${this.API_BASE}/examenes/notas/${idNota}`, body, { headers: this.getHeaders() });
  }

  registrarAsistenciaExamen(idNota: number, body: any): Observable<any> {
    return this.http.patch<any>(`${this.API_BASE}/examenes/notas/${idNota}`, body, { headers: this.getHeaders() });
  }

  getAlumnosReportes(idAulaCurso: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/cursos/${idAulaCurso}/reportes`, { headers: this.getHeaders() });
  }

  crearReporte(idAulaCurso: number, body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/cursos/${idAulaCurso}/reportes`, body, { headers: this.getHeaders() });
  }

  eliminarReporte(idReporte: number): Observable<any> {
    return this.http.delete<any>(`${this.API_BASE}/reportes/${idReporte}`, { headers: this.getHeaders() });
  }

  toggleVisibilidadReporte(idReporte: number): Observable<any> {
    return this.http.patch<any>(`${this.API_BASE}/reportes/${idReporte}/visibilidad`, {}, { headers: this.getHeaders() });
  }

  getReportePdfBlob(idAulaCurso: number, formato: string): Observable<Blob> {
    return this.http.get(`http://localhost:8080/api/admin/export/reportes/${formato}?idAulaCurso=${idAulaCurso}`, { headers: this.getHeaders(), responseType: 'blob' });
  }

  exportarCursoBlob(idAulaCurso: number, formato: string): Observable<Blob> {
    return this.http.get(`${this.API_BASE}/export/curso/${idAulaCurso}/${formato}`, { headers: this.getHeaders(), responseType: 'blob' });
  }

  getSesionAsistencia(idAulaCurso: number, fecha: string): Observable<any> {
    return this.http.get<any>(`${this.API_BASE}/cursos/${idAulaCurso}/asistencia?fecha=${fecha}`, { headers: this.getHeaders() });
  }

  getFechasAsistencias(idAulaCurso: number): Observable<string[]> {
    return this.http.get<string[]>(`${this.API_BASE}/cursos/${idAulaCurso}/asistencia/fechas`, { headers: this.getHeaders() });
  }

  registrarAsistencias(idAulaCurso: number, body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/cursos/${idAulaCurso}/asistencia`, body, { headers: this.getHeaders() });
  }

  generarPredicciones(idAulaCurso: number): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/cursos/${idAulaCurso}/predicciones/generar`, {}, { headers: this.getHeaders() });
  }

  getPredicciones(idAulaCurso: number): Observable<any> {
    return this.http.get<any>(`${this.API_BASE}/cursos/${idAulaCurso}/predicciones`, { headers: this.getHeaders() });
  }

  getPrediccionesGlobales(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/predicciones`, { headers: this.getHeaders() });
  }

  getIaAdvisory(idAlumno: number, params: any): Observable<any> {
    return this.http.get<any>(`${this.API_BASE}/predicciones/${idAlumno}/ia-advisory`, { headers: this.getHeaders(), params });
  }

  postFeedbackPlan(body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/predicciones/feedback-plan`, body, { headers: this.getHeaders() });
  }

  getPendientes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/pendientes`, { headers: this.getHeaders() });
  }

  getAsistenciaConsolidado(idAulaCurso: number, mes: string): Observable<any> {
    return this.http.get<any>(`${this.API_BASE}/cursos/${idAulaCurso}/asistencia/consolidado?mes=${mes}`, { headers: this.getHeaders() });
  }
}
