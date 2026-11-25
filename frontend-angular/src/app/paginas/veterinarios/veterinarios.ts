// Cadastro de veterinários (quem pode entrar no sistema)
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../servicos/api.service';
import { AvisoService } from '../../servicos/aviso.service';
import { Etiqueta } from '../../componentes/etiqueta';
import { Cabecalho } from '../../componentes/cabecalho';
import { UFS, cpfValido, emailValido, formatarCpf, formatarDataHora, somenteNumeros, vazioParaNull } from '../../util/formatar';

function vetVazio() {
  return { nome: '', cpf: '', crmv: '', ufCrmv: '', email: '', telefone: '', senha: '' };
}

@Component({
  selector: 'app-veterinarios',
  imports: [FormsModule, RouterLink, Etiqueta, Cabecalho],
  templateUrl: './veterinarios.html',
})
export class Veterinarios implements OnInit {
  private api = inject(ApiService);
  private aviso = inject(AvisoService);

  idLogado = this.api.lerSessao()?.veterinario.id;
  ufs = UFS;
  formatarDataHora = formatarDataHora;

  status = '';
  lista: any[] = [];
  formAberto = false;
  idEmEdicao: number | null = null;
  form = vetVazio();
  salvando = false;

  ngOnInit() {
    this.carregar();
  }

  iniciais(nome: string) {
    return nome.split(' ').filter((p) => p.length > 2).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  }

  async carregar() {
    try {
      this.lista = await this.api.get(`/veterinarios${this.status ? `?status=${this.status}` : ''}`);
    } catch (e: any) {
      this.aviso.erro(e.message);
    }
  }

  abrir(vet: any) {
    this.idEmEdicao = vet ? vet.id : null;
    this.form = vet
      ? { nome: vet.nome, cpf: formatarCpf(vet.cpf), crmv: vet.crmv, ufCrmv: vet.ufCrmv, email: vet.email, telefone: vet.telefone || '', senha: '' }
      : vetVazio();
    this.formAberto = true;
  }

  async salvar() {
    const d = this.form;
    const erros: string[] = [];
    if (d.nome.trim().length < 3) erros.push('nome com pelo menos 3 letras');
    if (!cpfValido(d.cpf)) erros.push('CPF válido');
    if (!/^\d{1,10}$/.test(somenteNumeros(d.crmv))) erros.push('CRMV (só números)');
    if (!d.ufCrmv) erros.push('UF do CRMV');
    if (!emailValido(d.email)) erros.push('e-mail válido');
    if ((!this.idEmEdicao || d.senha) && d.senha.length < 8) erros.push('senha com pelo menos 8 caracteres');
    if (erros.length) return this.aviso.alerta(`Confira: ${erros.join(', ')}.`);

    const corpo: any = {
      nome: d.nome.trim(), cpf: somenteNumeros(d.cpf), crmv: somenteNumeros(d.crmv), ufCrmv: d.ufCrmv,
      email: d.email.trim(), telefone: vazioParaNull(d.telefone),
    };
    if (d.senha) corpo.senha = d.senha;
    this.salvando = true;
    try {
      const salvo = this.idEmEdicao
        ? await this.api.put(`/veterinarios/${this.idEmEdicao}`, corpo)
        : await this.api.post('/veterinarios', corpo);
      this.aviso.sucesso(salvo.senhaConfirmada
        ? `Veterinário ${salvo.nome} salvo.`
        : `Veterinário ${salvo.nome} salvo. Antes de entrar, ele confirma a senha com o código que apareceu no terminal da API.`);
      this.formAberto = false;
      this.carregar();
    } catch (e: any) {
      this.aviso.erro(e.message);
    } finally {
      this.salvando = false;
    }
  }

  async inativar(vet: any) {
    const ok = await this.aviso.confirmar('Inativar veterinário?', `${vet.nome} não conseguirá mais entrar no sistema.`, 'Inativar');
    if (!ok) return;
    try {
      await this.api.delete(`/veterinarios/${vet.id}`);
      this.aviso.sucesso('Veterinário inativado.');
      this.carregar();
    } catch (e: any) {
      this.aviso.erro(e.message);
    }
  }
}
