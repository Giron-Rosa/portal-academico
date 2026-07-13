import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { StudentNote, SaveNoteRequest } from '../shared/models/alumno.models';

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

  getNotes(): Observable<StudentNote[]> {
    return this.http.get<StudentNote[]>(`${this.API_BASE}/notes`, { headers: this.getHeaders() });
  }

  crearNote(body: SaveNoteRequest): Observable<StudentNote> {
    return this.http.post<StudentNote>(`${this.API_BASE}/notes`, body, { headers: this.getHeaders() });
  }

  updateNote(idNota: number, body: SaveNoteRequest): Observable<StudentNote> {
    return this.http.put<StudentNote>(`${this.API_BASE}/notes/${idNota}`, body, { headers: this.getHeaders() });
  }

  deleteNote(idNota: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE}/notes/${idNota}`, { headers: this.getHeaders() });
  }

  generarResumenIa(idNota: number): Observable<StudentNote> {
    return this.http.post<StudentNote>(`${this.API_BASE}/notes/${idNota}/resumen-ia`, {}, { headers: this.getHeaders() });
  }

  subirDocumentoNota(file: File): Observable<StudentNote> {
    const formData = new FormData();
    formData.append('file', file);
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.auth.getToken()}`
    });
    return this.http.post<StudentNote>(`${this.API_BASE}/notes/upload`, formData, { headers });
  }

  generarPodcast(idNota: number): Observable<StudentNote> {
    return this.http.post<StudentNote>(`${this.API_BASE}/notes/${idNota}/generar-podcast`, {}, { headers: this.getHeaders() });
  }

  importarMaterialANota(idMaterial: number): Observable<StudentNote> {
    return this.http.post<StudentNote>(`${this.API_BASE}/notes/importar-material/${idMaterial}`, {}, { headers: this.getHeaders() });
  }
}
