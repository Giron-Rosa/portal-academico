import { Component, inject, signal, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface LoginResp {
  token: string; rol: string; codigo: string; email: string; nombre: string;
}

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private auth   = inject(AuthService);
  private router = inject(Router);
  private http   = inject(HttpClient);

  private readonly API = 'http://localhost:8080/api/auth/login';

  isOpen   = this.auth.isLoginOpen;
  codigo   = signal('');
  password = signal('');
  remember = signal(false);
  showPass = signal(false);
  loading  = signal(false);
  error    = signal('');

  @HostListener('document:keydown.escape')
  onEsc() { this.close(); }

  close() { this.auth.closeLogin(); }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('login-backdrop')) {
      this.close();
    }
  }

  onSubmit() {
    if (!this.codigo() || !this.password()) return;
    this.error.set('');
    this.loading.set(true);

    this.http.post<LoginResp>(this.API, {
      identifier: this.codigo(),
      contrasena: this.password()
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.auth.saveSession(res.token, res.rol, res.codigo, res.nombre, res.email);
        this.auth.closeLogin();
        this.router.navigate([this.auth.getPortalRoute()]);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 0) {
          this.error.set('No se pudo conectar al servidor.');
        } else if (err.status === 401 || err.status === 403) {
          this.error.set('Código o contraseña incorrectos.');
        } else {
          this.error.set('Error inesperado. Intenta de nuevo.');
        }
      }
    });
  }
}
