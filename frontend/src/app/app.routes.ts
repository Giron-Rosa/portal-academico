import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { PortalDocente } from './components/portal-docente/portal-docente';
import { PortalPadre } from './components/portal-padre/portal-padre';

export const routes: Routes = [
  { path: '',               component: Home          },
  { path: 'portal/docente', component: PortalDocente },
  { path: 'portal/padre',   component: PortalPadre  },
  { path: '**',             redirectTo: ''           },
];
