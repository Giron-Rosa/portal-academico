import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AlumnoService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private readonly API_BASE = 'http://localhost:8080/api/portal/alumno';

  private getHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getCursos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/mis-cursos`, { headers: this.getHeaders() });
  }

  getTareas(idAulaCurso: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/cursos/${idAulaCurso}/tareas`, { headers: this.getHeaders() });
  }

  getActividades(idAulaCurso: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/cursos/${idAulaCurso}/actividades`, { headers: this.getHeaders() });
  }

  getMateriales(idAulaCurso: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/cursos/${idAulaCurso}/contenido`, { headers: this.getHeaders() });
  }

  getCalificacionesGlobales(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/calificaciones-globales`, { headers: this.getHeaders() });
  }

  getAsistenciaGlobal(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/asistencia-global`, { headers: this.getHeaders() });
  }

  entregarTarea(idAulaCurso: number, idTarea: number): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/cursos/${idAulaCurso}/tareas/${idTarea}/entregar`, {}, { headers: this.getHeaders() });
  }

  anularTarea(idAulaCurso: number, idTarea: number): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/cursos/${idAulaCurso}/tareas/${idTarea}/anular`, {}, { headers: this.getHeaders() });
  }

  getHorario(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/horario`, { headers: this.getHeaders() });
  }

  getRecursos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/recursos`, { headers: this.getHeaders() });
  }

  enviarMensajeIaChat(body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/ia-chat`, body, { headers: this.getHeaders() });
  }

  getTemario(idAulaCurso: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/cursos/${idAulaCurso}/temario`, { headers: this.getHeaders() });
  }

  getAsistenciaCurso(idAulaCurso: number): Observable<any> {
    return this.http.get<any>(`${this.API_BASE}/cursos/${idAulaCurso}/asistencia`, { headers: this.getHeaders() });
  }

  getReportes(idAulaCurso: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/cursos/${idAulaCurso}/reportes`, { headers: this.getHeaders() });
  }

  chatMaterialIa(idAulaCurso: number, idMaterial: number, body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/cursos/${idAulaCurso}/materiales/${idMaterial}/chat-ia`, body, { headers: this.getHeaders() });
  }
}
