// Envios ao governo (testes 11 a 16): cadastro/atualização do animal e antirrábicas.
// Botão Enviar/Reenviar. O reenvio usa a mesma chave de idempotência: o governo não duplica.
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../servicos/api.service';
import { AvisoService } from '../../servicos/aviso.service';
import { Etiqueta } from '../../componentes/etiqueta';
import { Cabecalho } from '../../componentes/cabecalho';
import { formatarData, formatarDataHora } from '../../util/formatar';

export const NOMES_OPERACAO: Record<string, string> = {
  CADASTRO_ANIMAL: 'Cadastro do animal',
  ATUALIZACAO_ANIMAL: 'Atualização do animal',
  VACINACAO_ANTIRRABICA: 'Vacina antirrábica',
};

@Component({
  selector: 'app-governo',
  imports: [FormsModule, RouterLink, Etiqueta, Cabecalho],
  templateUrl: './governo.html',
})
export class Governo implements OnInit {
  private api = inject(ApiService);
  private aviso = inject(AvisoService);

  situacao = '';
  lista: any[] = [];
  carregando = false;
  enviando: number | null = null;
  formatarData = formatarData;
  formatarDataHora = formatarDataHora;
  nomes = NOMES_OPERACAO;
  filtros = [
    { valor: '', nome: 'Todos' },
    { valor: 'pendente', nome: 'Pendentes' },
    { valor: 'com_falha', nome: 'Com falha' },
    { valor: 'enviada', nome: 'Enviados' },
    { valor: 'confirmada', nome: 'Confirmados' },
  ];

  ngOnInit() {
    this.carregar();
  }

  async carregar() {
    this.carregando = true;
    try {
      this.lista = await this.api.get(`/integracoes${this.situacao ? `?situacao=${this.situacao}` : ''}`);
    } catch (e: any) {
      this.aviso.erro(e.message);
    } finally {
      this.carregando = false;
    }
  }

  async enviar(item: any) {
    this.enviando = item.id;
    try {
      const r = await this.api.post(`/integracoes/${item.id}/enviar`);
      const texto = `Envio nº ${item.id}: ${r.situacao}.${r.protocolo ? ` Protocolo ${r.protocolo}.` : ''} ${r.mensagem || ''}`;
      if (r.situacao === 'confirmada') this.aviso.sucesso(texto);
      else this.aviso.alerta(texto);
      await this.carregar();
    } catch (e: any) {
      this.aviso.erro(e.message);
    } finally {
      this.enviando = null;
    }
  }
}
