// Cadastro de tutores (teste 5) com busca de CEP pelo ViaCEP (teste 6)
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../servicos/api.service';
import { AvisoService } from '../../servicos/aviso.service';
import { Etiqueta } from '../../componentes/etiqueta';
import { Cabecalho } from '../../componentes/cabecalho';
import {
  UFS, cepValido, cpfValido, emailValido, formatarCep, formatarCpf, hojeISO, somenteNumeros, vazioParaNull,
} from '../../util/formatar';

function tutorVazio() {
  return {
    nome: '', cpf: '', dataNascimento: '', telefone: '', email: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', codigoIbge: '',
  };
}

@Component({
  selector: 'app-tutores',
  imports: [FormsModule, RouterLink, Etiqueta, Cabecalho],
  templateUrl: './tutores.html',
})
export class Tutores implements OnInit {
  private api = inject(ApiService);
  private aviso = inject(AvisoService);
  private rota = inject(ActivatedRoute);

  ufs = UFS;
  formatarCpf = formatarCpf;

  // lista
  busca = '';
  situacao = 'ativo';
  tutores: any[] = [];
  carregando = false;

  // formulário
  formAberto = false;
  idEmEdicao: number | null = null;
  form = tutorVazio();
  salvando = false;
  buscandoCep = false;
  avisoCep = 'Digite o CEP e clique em Buscar (ViaCEP).';
  avisoCepTipo: '' | 'ok' | 'erro' = '';

  ngOnInit() {
    this.carregar();
    if (this.rota.snapshot.queryParamMap.get('novo')) this.abrir(null);
  }

  async carregar() {
    const p = new URLSearchParams();
    if (this.busca.trim()) p.set('busca', this.busca.trim());
    if (this.situacao) p.set('situacao', this.situacao);
    this.carregando = true;
    try {
      this.tutores = await this.api.get(`/tutores?${p}`);
    } catch (e: any) {
      this.aviso.erro(e.message);
    } finally {
      this.carregando = false;
    }
  }

  abrir(tutor: any) {
    this.idEmEdicao = tutor ? tutor.id : null;
    this.form = tutorVazio();
    if (tutor) {
      const e = tutor.endereco || {};
      this.form = {
        nome: tutor.nome, cpf: formatarCpf(tutor.cpf), dataNascimento: tutor.dataNascimento || '',
        telefone: tutor.telefone || '', email: tutor.email || '',
        cep: formatarCep(e.cep), logradouro: e.logradouro || '', numero: e.numero || '', complemento: e.complemento || '',
        bairro: e.bairro || '', cidade: e.cidade || '', uf: e.uf || '', codigoIbge: e.codigoIbge || '',
      };
    }
    this.avisoCep = 'Digite o CEP e clique em Buscar (ViaCEP).';
    this.avisoCepTipo = '';
    this.formAberto = true;
  }

  // Busca o CEP na API da clínica (que consulta o ViaCEP) e preenche o endereço
  async buscarCep() {
    const cep = somenteNumeros(this.form.cep);
    if (!cepValido(cep)) {
      this.avisoCep = 'O CEP tem 8 números.';
      this.avisoCepTipo = 'erro';
      return;
    }
    this.buscandoCep = true;
    this.avisoCep = 'Buscando no ViaCEP...';
    this.avisoCepTipo = '';
    try {
      const end = await this.api.get(`/cep/${cep}`);
      this.form.cep = formatarCep(cep);
      this.form.logradouro = end.logradouro || '';
      this.form.bairro = end.bairro || '';
      this.form.cidade = end.localidade || '';
      this.form.uf = end.uf || '';
      this.form.codigoIbge = end.ibge || '';
      this.avisoCep = 'Endereço encontrado! Complete o número e o complemento.';
      this.avisoCepTipo = 'ok';
    } catch (e: any) {
      // CEP inexistente, timeout ou ViaCEP fora do ar: a pessoa preenche à mão
      this.form.codigoIbge = '';
      this.avisoCep = `${e.message} Você pode preencher o endereço à mão.`;
      this.avisoCepTipo = 'erro';
    } finally {
      this.buscandoCep = false;
    }
  }

  async salvar() {
    const d = this.form;
    const erros: string[] = [];
    if (d.nome.trim().length < 3) erros.push('nome com pelo menos 3 letras');
    if (!cpfValido(d.cpf)) erros.push('CPF válido');
    if (d.email && !emailValido(d.email)) erros.push('e-mail válido (ou deixe vazio)');
    if (d.dataNascimento && d.dataNascimento > hojeISO()) erros.push('data de nascimento que não esteja no futuro');
    if (!cepValido(d.cep)) erros.push('CEP com 8 números');
    if (!d.cidade.trim()) erros.push('cidade');
    if (!d.uf) erros.push('UF');
    if (erros.length) return this.aviso.alerta(`Confira: ${erros.join(', ')}.`);

    const corpo = {
      nome: d.nome.trim(),
      cpf: somenteNumeros(d.cpf),
      telefone: vazioParaNull(d.telefone),
      email: vazioParaNull(d.email),
      dataNascimento: vazioParaNull(d.dataNascimento),
      endereco: {
        cep: somenteNumeros(d.cep),
        logradouro: vazioParaNull(d.logradouro),
        numero: vazioParaNull(d.numero),
        complemento: vazioParaNull(d.complemento),
        bairro: vazioParaNull(d.bairro),
        cidade: d.cidade.trim(),
        uf: d.uf,
        codigoIbge: vazioParaNull(d.codigoIbge),
      },
    };
    this.salvando = true;
    try {
      const salvo = this.idEmEdicao
        ? await this.api.put(`/tutores/${this.idEmEdicao}`, corpo)
        : await this.api.post('/tutores', corpo);
      this.aviso.sucesso(`Tutor ${salvo.nome} salvo.`);
      this.formAberto = false;
      this.carregar();
    } catch (e: any) {
      this.aviso.erro(e.message);
    } finally {
      this.salvando = false;
    }
  }

  async inativar(tutor: any) {
    const ok = await this.aviso.confirmar('Inativar tutor?', `${tutor.nome} não some do sistema, só fica inativo.`, 'Inativar');
    if (!ok) return;
    try {
      await this.api.delete(`/tutores/${tutor.id}`);
      this.aviso.sucesso('Tutor inativado.');
      this.carregar();
    } catch (e: any) {
      this.aviso.erro(e.message);
    }
  }
}
