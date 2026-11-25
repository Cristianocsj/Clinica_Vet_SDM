// Rotas (telas) do sistema. As telas internas exigem login (loginGuard).
import { Routes } from '@angular/router';
import { loginGuard } from './servicos/login.guard';
import { Layout } from './componentes/layout';
import { Login } from './paginas/login/login';
import { ConfirmarSenha } from './paginas/confirmar-senha/confirmar-senha';
import { Painel } from './paginas/painel/painel';
import { Tutores } from './paginas/tutores/tutores';
import { Animais } from './paginas/animais/animais';
import { FichaAnimal } from './paginas/ficha-animal/ficha-animal';
import { Doses } from './paginas/doses/doses';
import { Governo } from './paginas/governo/governo';
import { Veterinarios } from './paginas/veterinarios/veterinarios';
import { Especies } from './paginas/especies/especies';

export const routes: Routes = [
  { path: 'login', component: Login, title: 'Entrar · Clínica Vet' },
  { path: 'confirmar-senha', component: ConfirmarSenha, title: 'Confirmar senha · Clínica Vet' },
  {
    path: '',
    component: Layout,
    canActivate: [loginGuard],
    children: [
      { path: 'painel', component: Painel, title: 'Início · Clínica Vet' },
      { path: 'tutores', component: Tutores, title: 'Tutores · Clínica Vet' },
      { path: 'animais', component: Animais, title: 'Animais · Clínica Vet' },
      { path: 'animais/:id', component: FichaAnimal, title: 'Ficha do animal · Clínica Vet' },
      { path: 'doses', component: Doses, title: 'Próximas doses · Clínica Vet' },
      { path: 'governo', component: Governo, title: 'Envios ao governo · Clínica Vet' },
      { path: 'veterinarios', component: Veterinarios, title: 'Veterinários · Clínica Vet' },
      { path: 'especies', component: Especies, title: 'Espécies e raças · Clínica Vet' },
      { path: '', pathMatch: 'full', redirectTo: 'painel' },
    ],
  },
  { path: '**', redirectTo: 'painel' },
];
