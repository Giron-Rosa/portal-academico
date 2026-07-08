import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PadreService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private readonly API_BASE = 'http://localhost:8080/api/portal/padre';

  private getHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getResumenHijos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/resumen`, { headers: this.getHeaders() });
  }

  getHorarioHijo(codigoAlumno: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/horario/${codigoAlumno}`, { headers: this.getHeaders() });
  }

  getCursosHijo(codigoAlumno: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/cursos/${codigoAlumno}`, { headers: this.getHeaders() });
  }

  getAsistenciaHijo(codigoAlumno: string): Observable<any> {
    return this.http.get<any>(`${this.API_BASE}/asistencia/${codigoAlumno}`, { headers: this.getHeaders() });
  }

  getEventosHijo(codigoAlumno: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/eventos/${codigoAlumno}`, { headers: this.getHeaders() });
  }

  getPagosHijo(codigoAlumno: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/pagos/${codigoAlumno}`, { headers: this.getHeaders() });
  }

  procesarPago(body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/pagos/procesar`, body, { headers: this.getHeaders() });
  }

  getGamificacionHijo(codigoAlumno: string): Observable<any> {
    return this.http.get<any>(`${this.API_BASE}/gamificacion/${codigoAlumno}`, { headers: this.getHeaders() });
  }

  getMensajes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/mensajes`, { headers: this.getHeaders() });
  }

  getMensajeDetalle(id: number): Observable<any> {
    return this.http.get<any>(`${this.API_BASE}/mensajes/${id}`, { headers: this.getHeaders() });
  }

  getRespuestasMensaje(id: number, page: number, size: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/mensajes/${id}/respuestas-paginadas?page=${page}&size=${size}`, { headers: this.getHeaders() });
  }

  responderMensajeAudio(id: number, fd: FormData): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/mensajes/${id}/responder-audio`, fd, { headers: this.getHeaders() });
  }

  responderMensaje(id: number, body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/mensajes/${id}/responder`, body, { headers: this.getHeaders() });
  }

  refinarRespuestaIA(body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/mensajes/ia-redactar`, body, { headers: this.getHeaders() });
  }

  getDocentesDisponibles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/mensajes/docentes-disponibles`, { headers: this.getHeaders() });
  }

  crearNuevoMensaje(body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/mensajes/iniciar`, body, { headers: this.getHeaders() });
  }
}
