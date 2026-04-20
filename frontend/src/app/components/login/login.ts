import { Component, inject, signal, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private auth = inject(AuthService);

  isOpen    = this.auth.isLoginOpen;
  codigo    = signal('');
  password  = signal('');
  remember  = signal(false);
  showPass  = signal(false);
  loading   = signal(false);

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
    this.loading.set(true);
    setTimeout(() => this.loading.set(false), 1500);
  }
}
