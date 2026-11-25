// Título de cada tela, com a ilustração e um subtítulo
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-cabecalho',
  template: `
    <header class="cabecalho-pagina">
      <img [src]="imagem" alt="" class="cabecalho-imagem" width="64" height="64">
      <div class="flex-grow-1">
        <h1>{{ titulo }}</h1>
        @if (subtitulo) { <p>{{ subtitulo }}</p> }
      </div>
      <div class="cabecalho-acoes"><ng-content /></div>
    </header>`,
})
export class Cabecalho {
  @Input() titulo = '';
  @Input() subtitulo = '';
  @Input() imagem = 'img/patinhas.webp';
}
