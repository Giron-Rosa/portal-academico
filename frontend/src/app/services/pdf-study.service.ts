import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PdfStudyService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private readonly API = 'http://localhost:8080/api/pdf-study';

  private getHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  analyzePdf(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(`${this.API}/analyze`, formData, {
      headers: this.getHeaders()
    });
  }

  chatWithPdf(file: File, question: string, history: any[]): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('question', question);
    formData.append('history', JSON.stringify(history));

    return this.http.post(`${this.API}/chat`, formData, {
      headers: this.getHeaders()
    });
  }
}
