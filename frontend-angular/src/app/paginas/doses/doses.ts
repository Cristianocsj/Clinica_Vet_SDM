// Próximas doses (teste 10): próximas doses previstas e vacinas agendadas
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../servicos/api.service';
import { AvisoService } from '../../servicos/aviso.service';
import { Etiqueta } from '../../componentes/etiqueta';
import { Cabecalho } from '../../componentes/cabecalho';
import { formatarData } from '../../util/formatar';

@Component({
  selector: 'app-doses',
  imports: [FormsModule, RouterLink, Etiqueta, Cabecalho],
  templateUrl: './doses.html',
})
export class Doses implements OnInit {
  private api = inject(ApiService);
  private aviso = inject(AvisoService);

  dias = 30;
  resposta: any = null;
  carregando = false;
  formatarData = formatarData;
  opcoesDias = [7, 15, 30, 60, 90, 180, 365];

  ngOnInit() {
    this.carregar();
  }

  async carregar() {
    this.carregando = true;
    try {
      this.resposta = await this.api.get(`/vacinas/proximas-doses?dias=${this.dias}`);
    } catch (e: any) {
      this.aviso.erro(e.message);
    } finally {
      this.carregando = false;
    }
  }
}
