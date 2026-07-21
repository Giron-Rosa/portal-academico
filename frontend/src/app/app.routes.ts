import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { PortalDocente } from './components/portal-docente/portal-docente';
import { PortalPadre } from './components/portal-padre/portal-padre';
import { PortalAlumno } from './components/portal-alumno/portal-alumno';
import { PortalAdmin } from './components/portal-admin/portal-admin';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '',               component: Home          },
  { 
    path: 'portal/docente', 
    component: PortalDocente,
    canActivate: [authGuard(['maestro'])]
  },
  { 
    path: 'portal/padre',   
    component: PortalPadre,
    canActivate: [authGuard(['padre'])]
  },
  { 
    path: 'portal/alumno',  
    component: PortalAlumno,
    canActivate: [authGuard(['alumno'])]
  },
  { 
    path: 'portal/admin',   
    component: PortalAdmin,
    canActivate: [authGuard(['admin'])]
  },
  { path: '**',             redirectTo: ''           },
];
