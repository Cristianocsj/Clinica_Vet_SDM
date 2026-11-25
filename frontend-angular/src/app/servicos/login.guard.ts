// Telas internas só abrem com login. Sem sessão, volta para a tela de login.
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ApiService } from './api.service';

export const loginGuard: CanActivateFn = () => {
  const api = inject(ApiService);
  if (api.lerSessao()) return true;
  return inject(Router).createUrlTree(['/login']);
};
