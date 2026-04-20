import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  isLoginOpen = signal(false);

  openLogin()  { this.isLoginOpen.set(true);  }
  closeLogin() { this.isLoginOpen.set(false); }
}
