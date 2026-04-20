import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

export interface Curso {
  nombre: string;
  grado: string;
  seccion: string;
  color: string;
  iconType: string;
  badge: string;
}

export interface Pendiente {
  grado: string;
  curso: string;
  titulo: string;
  tema: string;
}

@Component({
  selector: 'app-portal-docente',
  imports: [],
  templateUrl: './portal-docente.html',
  styleUrl: './portal-docente.scss',
})
export class PortalDocente {
  private router = inject(Router);
  private auth   = inject(AuthService);

  activeSection = signal('inicio');
  activeGrade   = signal('Todos');
  selectedYear  = signal('2026');
  dropdownOpen  = signal(false);

  nombre    = this.auth.getNombre() ?? 'Docente';
  codigo    = this.auth.getCodigo() ?? '';
  iniciales = this.nombre.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();

  navItems = [
    { id: 'inicio',      label: 'Inicio'     },
    { id: 'calendario',  label: 'Calendario' },
    { id: 'mensajes',    label: 'Mensajes'   },
    { id: 'refuerzos',   label: 'Refuerzos'  },
  ];

  years = ['2024', '2025', '2026'];

  cursos: Curso[] = [
    { nombre: 'Álgebra',                 grado: '1ro Secundaria', seccion: 'A', color: '#dce8f7', iconType: 'algebra',  badge: '1ro Sec' },
    { nombre: 'Trigonometría',           grado: '3ro Secundaria', seccion: 'A', color: '#fde8e8', iconType: 'trigo',    badge: '3ro Sec' },
    { nombre: 'Razonamiento Matemático', grado: '3ro Secundaria', seccion: 'C', color: '#d5e5f5', iconType: 'razon',    badge: '3ro Sec' },
    { nombre: 'Historia del Perú',       grado: '4to Secundaria', seccion: 'A', color: '#fdd8d8', iconType: 'historia', badge: '4to Sec' },
    { nombre: 'Comunicación',            grado: '5to Primaria',   seccion: 'A', color: '#e8f0fc', iconType: 'comunica', badge: '5to Prim'},
    { nombre: 'Geografía',               grado: '5to Secundaria', seccion: 'B', color: '#fce8e8', iconType: 'geo',      badge: '5to Sec' },
  ];

  pendientes: Pendiente[] = [
    { grado: '1ro Secundaria', curso: 'Álgebra',       titulo: 'Tarea semana 1', tema: 'Expresiones algebraicas' },
    { grado: '3ro Secundaria', curso: 'Trigonometría', titulo: 'Tarea semana 1', tema: 'Ángulos y razones'       },
    { grado: '4to Secundaria', curso: 'Historia del Perú', titulo: 'Actividad 3', tema: 'Independencia del Perú' },
  ];

  grades = computed(() => {
    const base = ['Todos'];
    const unique = [...new Set(this.cursos.map(c => c.grado))];
    return [...base, ...unique];
  });

  filteredCursos = computed(() => {
    if (this.activeGrade() === 'Todos') return this.cursos;
    return this.cursos.filter(c => c.grado === this.activeGrade());
  });

  setSection(id: string)   { this.activeSection.set(id);   this.dropdownOpen.set(false); }
  setGrade(grado: string)  { this.activeGrade.set(grado);  }
  setYear(year: string)    { this.selectedYear.set(year);  }
  toggleDropdown()         { this.dropdownOpen.update(v => !v); }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.pd-avatar-wrapper')) {
      this.dropdownOpen.set(false);
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
