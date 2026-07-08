import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private readonly API_BASE = 'http://localhost:8080/api/admin';

  private getHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getIaAnalisis(): Observable<{ resultado: string }> {
    return this.http.get<{ resultado: string }>(`${this.API_BASE}/bi/ia-analisis`, { headers: this.getHeaders() });
  }

  getIaAlertasEfectividad(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/bi/ia-alertas-efectividad`, { headers: this.getHeaders() });
  }

  getIaTutorScores(): Observable<any> {
    return this.http.get<any>(`${this.API_BASE}/bi/ia-tutor-scores`, { headers: this.getHeaders() });
  }

  getKpis(): Observable<any> {
    return this.http.get<any>(`${this.API_BASE}/dashboard/kpis`, { headers: this.getHeaders() });
  }

  getEstudiantes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/estudiantes`, { headers: this.getHeaders() });
  }

  getDocentes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/docentes`, { headers: this.getHeaders() });
  }

  getPadres(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/padres`, { headers: this.getHeaders() });
  }

  getNotasKanban(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/notas-kanban`, { headers: this.getHeaders() });
  }

  crearEstudiante(body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/estudiantes`, body, { headers: this.getHeaders() });
  }

  actualizarEstudiante(id: number, body: any): Observable<any> {
    return this.http.put<any>(`${this.API_BASE}/estudiantes/${id}`, body, { headers: this.getHeaders() });
  }

  crearDocente(body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/docentes`, body, { headers: this.getHeaders() });
  }

  actualizarDocente(id: number, body: any): Observable<any> {
    return this.http.put<any>(`${this.API_BASE}/docentes/${id}`, body, { headers: this.getHeaders() });
  }

  crearPadre(body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/padres`, body, { headers: this.getHeaders() });
  }

  actualizarPadre(id: number, body: any): Observable<any> {
    return this.http.put<any>(`${this.API_BASE}/padres/${id}`, body, { headers: this.getHeaders() });
  }

  crearNotaKanban(body: any): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/notas-kanban`, body, { headers: this.getHeaders() });
  }

  actualizarNotaKanban(id: number, body: any): Observable<any> {
    return this.http.put<any>(`${this.API_BASE}/notas-kanban/${id}`, body, { headers: this.getHeaders() });
  }

  exportarEstudiantesBlob(formato: string): Observable<Blob> {
    const url = `${this.API_BASE}/export/estudiantes/${formato === 'excel' ? 'excel' : 'pdf'}`;
    return this.http.get(url, { headers: this.getHeaders(), responseType: 'blob' });
  }

  eliminar(ruta: string, id: number): Observable<any> {
    return this.http.delete<any>(`${this.API_BASE}/${ruta}/${id}`, { headers: this.getHeaders() });
  }
}
