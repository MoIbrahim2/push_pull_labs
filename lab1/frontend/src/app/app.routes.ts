import { Routes } from '@angular/router';
import { ShortPolling } from './pages/short-polling.component';
import { LongPolling } from './pages/long-polling.component';

export const routes: Routes = [
  { path: 'short-polling', component: ShortPolling },
  { path: 'long-polling', component: LongPolling },
  { path: '', redirectTo: 'short-polling', pathMatch: 'full' }
];

