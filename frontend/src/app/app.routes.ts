import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { PortalDocente } from './components/portal-docente/portal-docente';

export const routes: Routes = [
  { path: '',               component: Home         },
  { path: 'portal/docente', component: PortalDocente },
  { path: '**',             redirectTo: ''           },
];
