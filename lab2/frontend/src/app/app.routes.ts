import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'chat', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent) },
  { path: 'signup', loadComponent: () => import('./pages/signup/signup').then(m => m.SignupComponent) },
  { path: 'chat', loadComponent: () => import('./pages/chat/chat').then(m => m.ChatComponent), canActivate: [authGuard] },
  { path: '**', redirectTo: 'chat' }
];
