// Ficha do animal: dados, microchip (testes 7 e 8), consultas (teste 9),
// vacinas (teste 10) e envios ao governo (testes 11 a 15)
import { Component, inject, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../servicos/api.service';
import { AvisoService } from '../../servicos/aviso.service';
import { Etiqueta } from '../../componentes/etiqueta';
import { NOMES_OPERACAO } from '../governo/governo';
import {
  formatarCpf, formatarData, formatarDataHora, hojeISO, imagemEspecie, microchipValido, numeroOuNull, textoSexo, vazioParaNull,
} from '../../util/formatar';

type Aba = 'consultas' | 'vacinas' | 'microchip' | 'governo';

function consultaVazia() {
  return { status: 'realizada', dataHora: '', motivo: '', anamnese: '', sintomas: '', diagnostico: '', tratamento: '', prescricao: '', peso: '', temperatura: '', observacoes: '' };
}
function vacinaVazia() {
  return { situacao: 'aplicada', nome: '', tipo: '', antirrabica: false, dataAplicacao: hojeISO(), fabricante: '', lote: '', validadeLote: '', dose: '', via: '', proximaDose: '', observacoes: '' };
}

@Component({
  selector: 'app-ficha-animal',
  imports: [FormsModule, RouterLink, Etiqueta],
  templateUrl: './ficha-animal.html',
})
export class FichaAnimal implements OnInit {
  private api = inject(ApiService);
  private aviso = inject(AvisoService);

  @Input() id = ''; // vem da rota /animais/:id

  formatarData = formatarData;
  formatarDataHora = formatarDataHora;
  formatarCpf = formatarCpf;
  textoSexo = textoSexo;
  imagemEspecie = imagemEspecie;
  nomes = NOMES_OPERACAO;

  animal: any = null;
  consultas: any[] = [];
  vacinas: any[] = [];
  aba: Aba = 'consultas';
  enviando: number | null = null;

  // formulários (um painel lateral por vez)
  formAberto: '' | 'consulta' | 'vacina' | 'microchip' | 'editarVacina' = '';
  alterando: number | null = null;
  edicao: any = {};
  salvando = false;
  consulta = consultaVazia();
  vacina = vacinaVazia();
  chip = { microchip: '', motivo: '' };

  ngOnInit() {
    this.carregar();
  }

  get pendencias() {
    return (this.animal?.integracoesGov || []).filter((i: any) => i.situacao !== 'confirmada').length;
  }

  async carregar() {
    try {
      const [ficha, consultas, vacinas] = await Promise.all([
        this.api.get(`/animais/${this.id}`),
        this.api.get(`/animais/${this.id}/consultas`),
        this.api.get(`/animais/${this.id}/vacinas`),
      ]);
      this.animal = ficha;
      this.consultas = consultas.consultas;
      this.vacinas = vacinas.vacinas;
    } catch (e: any) {
      this.aviso.erro(e.message);
    }
  }

  abrir(qual: 'consulta' | 'vacina' | 'microchip') {
    this.consulta = consultaVazia();
    this.vacina = vacinaVazia();
    this.chip = { microchip: '', motivo: '' };
    this.formAberto = qual;
  }

  // ---------------- Microchip: POST /api/animais/:id/microchip ----------------
  async salvarMicrochip() {
    const microchip = this.chip.microchip.replace(/[\s-]/g, '');
    if (!microchipValido(microchip)) return this.aviso.alerta('O microchip precisa ter exatamente 15 números.');
    if (this.animal.microchip && !this.chip.motivo.trim()) return this.aviso.alerta('Este animal já tem microchip: informe o motivo da troca.');
    const corpo: any = { microchip };
    if (this.chip.motivo.trim()) corpo.motivo = this.chip.motivo.trim();
    this.salvando = true;
    try {
      await this.api.post(`/animais/${this.id}/microchip`, corpo);
      this.formAberto = '';
      await this.carregar();
      const ultimo = (this.animal.integracoesGov || [])[0];
      if (ultimo?.situacao === 'confirmada') this.aviso.sucesso(`Microchip vinculado e animal registrado no governo (protocolo ${ultimo.protocolo}).`);
      else this.aviso.alerta('Microchip vinculado. O envio ao governo ficou pendente e será tentado de novo.');
      this.aba = 'microchip';
    } catch (e: any) {
      this.aviso.erro(e.message);
    } finally {
      this.salvando = false;
    }
  }

  // ---------------- Consulta ----------------
  async salvarConsulta() {
    const d = this.consulta;
    const peso = numeroOuNull(d.peso);
    const temperatura = numeroOuNull(d.temperatura);
    const erros: string[] = [];
    if (!d.motivo.trim()) erros.push('motivo');
    if (d.status === 'agendada' && !d.dataHora) erros.push('data e hora da consulta agendada');
    if (peso !== null && !(peso > 0)) erros.push('peso maior que zero');
    if (temperatura !== null && !(temperatura >= 30 && temperatura <= 45)) erros.push('temperatura entre 30 e 45 °C');
    if (d.status !== 'realizada' && (peso !== null || temperatura !== null)) erros.push('peso e temperatura só em consulta realizada');
    if (erros.length) return this.aviso.alerta(`Confira: ${erros.join(', ')}.`);

    const corpo = {
      animalId: Number(this.id), status: d.status, dataHora: vazioParaNull(d.dataHora), motivo: d.motivo.trim(),
      anamnese: vazioParaNull(d.anamnese), sintomas: vazioParaNull(d.sintomas), diagnostico: vazioParaNull(d.diagnostico),
      tratamento: vazioParaNull(d.tratamento), prescricao: vazioParaNull(d.prescricao), peso, temperatura,
      observacoes: vazioParaNull(d.observacoes),
    };
    this.salvando = true;
    try {
      await this.api.post('/consultas', corpo);
      this.aviso.sucesso('Consulta registrada no histórico.');
      this.formAberto = '';
      this.aba = 'consultas';
      this.carregar();
    } catch (e: any) {
      this.aviso.erro(e.message);
    } finally {
      this.salvando = false;
    }
  }

  // ---------------- Vacina ----------------
  async salvarVacina() {
    const d = this.vacina;
    const aplicada = d.situacao === 'aplicada';
    const hoje = hojeISO();
    const erros: string[] = [];
    if (!d.nome.trim()) erros.push('nome da vacina');
    if (!d.tipo.trim()) erros.push('tipo');
    if (aplicada && (!d.fabricante.trim() || !d.lote.trim() || !d.validadeLote || !d.dose.trim())) erros.push('fabricante, lote, validade do lote e dose (vacina aplicada)');
    if (aplicada && d.dataAplicacao > hoje) erros.push('data de aplicação que não esteja no futuro');
    if (!aplicada && (!d.dataAplicacao || d.dataAplicacao < hoje)) erros.push('data da vacina agendada (de hoje em diante)');
    if (!aplicada && d.proximaDose) erros.push('próxima dose só para vacina aplicada');
    const dataBase = d.dataAplicacao || hoje;
    if (d.validadeLote && d.validadeLote < dataBase) erros.push('lote que não esteja vencido');
    if (d.proximaDose && d.proximaDose <= dataBase) erros.push('próxima dose depois da aplicação');
    if (erros.length) return this.aviso.alerta(`Confira: ${erros.join(', ')}.`);

    const corpo: any = {
      animalId: Number(this.id), situacao: d.situacao, nome: d.nome.trim(), tipo: d.tipo.trim(),
      fabricante: vazioParaNull(d.fabricante), lote: vazioParaNull(d.lote), validadeLote: vazioParaNull(d.validadeLote),
      dataAplicacao: vazioParaNull(d.dataAplicacao), dose: vazioParaNull(d.dose), via: vazioParaNull(d.via),
      proximaDose: vazioParaNull(d.proximaDose), observacoes: vazioParaNull(d.observacoes),
    };
    // Marcado = antirrábica. Desmarcado: a API decide pelo nome/tipo ("Antirrábica", "raiva").
    if (d.antirrabica) corpo.antirrabica = true;

    this.salvando = true;
    try {
      const v = await this.api.post('/vacinas', corpo);
      const envio = v.integracaoGov;
      if (!envio) this.aviso.sucesso('Vacina registrada.');
      else if (envio.situacao === 'confirmada') this.aviso.sucesso(`Antirrábica registrada e confirmada pelo governo (protocolo ${envio.protocolo}).`);
      else this.aviso.alerta('Antirrábica registrada. O envio ao governo ficou PENDENTE (governo fora do ar ou animal sem microchip). Ela será reenviada.');
      this.formAberto = '';
      this.aba = 'vacinas';
      this.carregar();
    } catch (e: any) {
      this.aviso.erro(e.message);
    } finally {
      this.salvando = false;
    }
  }

  // ---------------- Encerrar consulta agendada: PUT /api/consultas/:id/situacao ----------------
  async encerrarConsulta(c: any, status: 'realizada' | 'nao_compareceu' | 'cancelada') {
    const textos = { realizada: 'marcar como realizada', nao_compareceu: 'marcar que o tutor não compareceu', cancelada: 'cancelar' };
    const ok = await this.aviso.confirmar('Encerrar agendamento', `Deseja ${textos[status]} a consulta "${c.motivo}" de ${formatarDataHora(c.dataHora)}?`, 'Sim');
    if (!ok) return;
    this.alterando = c.id;
    try {
      await this.api.put(`/consultas/${c.id}/situacao`, { status });
      this.aviso.sucesso('Situação da consulta atualizada.');
      await this.carregar();
    } catch (e: any) {
      this.aviso.erro(e.message);
    } finally {
      this.alterando = null;
    }
  }

  // ---------------- Editar / cancelar vacina: PUT /api/vacinas/:id e /cancelar ----------------
  abrirEdicaoVacina(v: any) {
    const envio = v.integracaoGov;
    this.edicao = {
      ...v, via: v.via || '', proximaDose: v.proximaDose || '', observacoes: v.observacoes || '', motivo: '',
      bloqueada: !!envio && (envio.situacao === 'enviada' || envio.situacao === 'confirmada'),
    };
    this.formAberto = 'editarVacina';
  }

  async salvarEdicaoVacina() {
    const d = this.edicao;
    if (d.proximaDose && d.proximaDose <= d.dataAplicacao) return this.aviso.alerta('Confira: próxima dose depois da aplicação.');
    const corpo: any = { via: vazioParaNull(d.via), observacoes: vazioParaNull(d.observacoes) };
    if (d.situacao === 'aplicada') corpo.proximaDose = vazioParaNull(d.proximaDose);
    this.salvando = true;
    try {
      await this.api.put(`/vacinas/${d.id}`, corpo);
      this.aviso.sucesso('Vacina atualizada.');
      this.formAberto = '';
      await this.carregar();
    } catch (e: any) {
      this.aviso.erro(e.message);
    } finally {
      this.salvando = false;
    }
  }

  async cancelarVacina() {
    const d = this.edicao;
    if (!d.motivo?.trim()) return this.aviso.alerta('Informe o motivo do cancelamento.');
    const ok = await this.aviso.confirmar('Cancelar vacina', `Cancelar "${d.nome}" de ${formatarData(d.dataAplicacao)}? Ela sai das próximas doses.`, 'Cancelar vacina');
    if (!ok) return;
    this.salvando = true;
    try {
      await this.api.put(`/vacinas/${d.id}/cancelar`, { motivo: d.motivo.trim() });
      this.aviso.sucesso('Vacina cancelada.');
      this.formAberto = '';
      await this.carregar();
    } catch (e: any) {
      this.aviso.erro(e.message);
    } finally {
      this.salvando = false;
    }
  }

  // ---------------- Enviar / reenviar ao governo ----------------
  async enviar(item: any) {
    this.enviando = item.id;
    try {
      const r = await this.api.post(`/integracoes/${item.id}/enviar`);
      const texto = `Situação do envio: ${r.situacao}.${r.protocolo ? ` Protocolo ${r.protocolo}.` : ''} ${r.mensagem || ''}`;
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
