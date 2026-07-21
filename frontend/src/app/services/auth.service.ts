import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  isLoginOpen = signal(false);

  private readonly K_TOKEN  = 'pa_token';
  private readonly K_ROL    = 'pa_rol';
  private readonly K_CODIGO = 'pa_codigo';
  private readonly K_NOMBRE = 'pa_nombre';
  private readonly K_EMAIL  = 'pa_email';

  openLogin()  { this.isLoginOpen.set(true);  }
  closeLogin() { this.isLoginOpen.set(false); }

  saveSession(token: string, rol: string, codigo: string, nombre: string, email: string, remember = false) {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(this.K_TOKEN,  token);
    storage.setItem(this.K_ROL,    rol);
    storage.setItem(this.K_CODIGO, codigo);
    storage.setItem(this.K_NOMBRE, nombre);
    storage.setItem(this.K_EMAIL,  email);
  }

  logout() {
    [this.K_TOKEN, this.K_ROL, this.K_CODIGO, this.K_NOMBRE, this.K_EMAIL]
      .forEach(k => {
        sessionStorage.removeItem(k);
        localStorage.removeItem(k);
      });
  }

  getToken():   string | null { return sessionStorage.getItem(this.K_TOKEN) || localStorage.getItem(this.K_TOKEN);  }
  getRol():     string | null { return sessionStorage.getItem(this.K_ROL) || localStorage.getItem(this.K_ROL);    }
  getCodigo():  string | null { return sessionStorage.getItem(this.K_CODIGO) || localStorage.getItem(this.K_CODIGO); }
  getNombre():  string | null { return sessionStorage.getItem(this.K_NOMBRE) || localStorage.getItem(this.K_NOMBRE); }
  getEmail():   string | null { return sessionStorage.getItem(this.K_EMAIL) || localStorage.getItem(this.K_EMAIL);  }
  isLoggedIn(): boolean       { return !!this.getToken(); }

  getPortalRoute(): string {
    switch (this.getRol()) {
      case 'maestro': return '/portal/docente';
      case 'alumno':  return '/portal/alumno';
      case 'padre':   return '/portal/padre';
      case 'admin':   return '/portal/admin';
      default:        return '/';
    }
  }
}
