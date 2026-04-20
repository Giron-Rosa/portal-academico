import { Component, inject, signal, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private auth   = inject(AuthService);
  private router = inject(Router);

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

    // TODO: reemplazar con llamada HTTP al backend Spring Boot
    setTimeout(() => {
      this.loading.set(false);
      const rol = this.mockResolveRol(this.codigo());
      if (!rol) {
        this.error.set('Código o contraseña incorrectos.');
        return;
      }
      this.auth.saveSession('mock-token', rol, this.codigo(), this.mockNombre(rol), '');
      this.auth.closeLogin();
      this.router.navigate([this.auth.getPortalRoute()]);
    }, 900);
  }

  private mockResolveRol(codigo: string): string | null {
    if (codigo === 'OC16Mar26')    return 'maestro';
    if (codigo.startsWith('PAD-')) return 'padre';
    if (codigo.startsWith('ADM-')) return 'admin';
    if (/^\d/.test(codigo))        return 'alumno';
    return null;
  }

  private mockNombre(rol: string): string {
    const nombres: Record<string, string> = {
      maestro: 'Oscar Castillo',
      padre:   'Marisol Martínez',
      alumno:  'Juan Martínez',
      admin:   'Administrador',
    };
    return nombres[rol] ?? 'Usuario';
  }
}
