// Etiqueta colorida com a situação (ativo, pendente, confirmada...)
import { Component, Input } from '@angular/core';

const CORES: Record<string, string> = {
  ativo: 'verde', inativo: 'cinza',
  realizada: 'verde', agendada: 'azul', cancelada: 'cinza', nao_compareceu: 'amarelo',
  aplicada: 'verde',
  pendente: 'amarelo', enviada: 'azul', confirmada: 'verde', com_falha: 'vermelho',
  prevista: 'azul', atrasada: 'vermelho', substituido: 'cinza',
};
const TEXTOS: Record<string, string> = { nao_compareceu: 'não compareceu', com_falha: 'com falha', substituido: 'substituído' };

@Component({
  selector: 'app-etiqueta',
  template: `<span class="etiqueta etiqueta-{{ cor }}">{{ texto }}</span>`,
})
export class Etiqueta {
  @Input() situacao: string | null | undefined = '';

  get cor() {
    return CORES[this.situacao || ''] || 'cinza';
  }
  get texto() {
    return TEXTOS[this.situacao || ''] || this.situacao || '-';
  }
}
