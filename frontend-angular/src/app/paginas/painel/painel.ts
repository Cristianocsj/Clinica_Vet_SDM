// Tela inicial: números rápidos, próximas doses e atalhos
import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../servicos/api.service';
import { AvisoService } from '../../servicos/aviso.service';
import { Etiqueta } from '../../componentes/etiqueta';
import { formatarData } from '../../util/formatar';

@Component({
  selector: 'app-painel',
  imports: [RouterLink, Etiqueta],
  templateUrl: './painel.html',
})
export class Painel implements OnInit {
  private api = inject(ApiService);
  private aviso = inject(AvisoService);

  nome = (this.api.lerSessao()?.veterinario.nome || '').split(' ')[0];
  carregando = true;
  qtdTutores = 0;
  qtdAnimais = 0;
  qtdAtrasadas = 0;
  qtdPendencias = 0;
  doses: any[] = [];
  formatarData = formatarData;

  get saudacao() {
    const hora = new Date().getHours();
    return hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  }

  async ngOnInit() {
    try {
      const [tutores, animais, doses, integracoes] = await Promise.all([
        this.api.get<any[]>('/tutores?situacao=ativo'),
        this.api.get<any[]>('/animais?situacao=ativo'),
        this.api.get<any>('/vacinas/proximas-doses?dias=30'),
        this.api.get<any[]>('/integracoes'),
      ]);
      this.qtdTutores = tutores.length;
      this.qtdAnimais = animais.length;
      this.doses = doses.doses;
      this.qtdAtrasadas = doses.doses.filter((d: any) => d.status === 'atrasada').length;
      this.qtdPendencias = integracoes.filter((i) => i.situacao === 'pendente' || i.situacao === 'com_falha').length;
    } catch (e: any) {
      this.aviso.erro(e.message);
    } finally {
      this.carregando = false;
    }
  }
}
