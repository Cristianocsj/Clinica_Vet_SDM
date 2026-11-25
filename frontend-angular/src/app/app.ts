// Componente raiz: as telas (router-outlet), os avisos e a janela de confirmação
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AvisoService } from './servicos/aviso.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  aviso = inject(AvisoService);

  icone(tipo: string) {
    return { sucesso: 'bi-check-circle-fill', erro: 'bi-x-octagon-fill', alerta: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' }[tipo];
  }
}
