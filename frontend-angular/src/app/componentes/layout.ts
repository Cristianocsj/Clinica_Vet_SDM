// Moldura das telas internas: menu lateral (vira menu "sanduíche" no celular) + conteúdo
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiService } from '../servicos/api.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.html',
})
export class Layout {
  private api = inject(ApiService);
  private router = inject(Router);

  menuAberto = false;
  sessao = this.api.lerSessao();

  links = [
    { rota: '/painel', nome: 'Início', icone: 'bi-house-heart' },
    { rota: '/tutores', nome: 'Tutores', icone: 'bi-people' },
    { rota: '/animais', nome: 'Animais', icone: 'bi-heart-pulse' },
    { rota: '/doses', nome: 'Próximas doses', icone: 'bi-calendar2-heart' },
    { rota: '/governo', nome: 'Envios ao governo', icone: 'bi-bank' },
    { rota: '/veterinarios', nome: 'Veterinários', icone: 'bi-person-badge' },
    { rota: '/especies', nome: 'Espécies e raças', icone: 'bi-tags' },
  ];

  get iniciais() {
    const nome = this.sessao?.veterinario.nome || '?';
    return nome.split(' ').filter((p) => p.length > 2).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  }

  async sair() {
    try {
      await this.api.post('/auth/logout');
    } catch {
      // mesmo se a API não responder, sai do navegador
    }
    this.api.limparSessao();
    this.router.navigate(['/login']);
  }
}
