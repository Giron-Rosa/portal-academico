import { Routes } from '@angular/router';
import { Home } from './components/public/home/home';
import { PortalDocente } from './components/portales/portal-docente/portal-docente';
import { PortalPadre } from './components/portales/portal-padre/portal-padre';
import { PortalAlumno } from './components/portales/portal-alumno/portal-alumno';

export const routes: Routes = [
  { path: '',               component: Home          },
  { path: 'portal/docente', component: PortalDocente },
  { path: 'portal/padre',   component: PortalPadre  },
  { path: 'portal/alumno',  component: PortalAlumno },
  { path: '**',             redirectTo: ''           },
];
