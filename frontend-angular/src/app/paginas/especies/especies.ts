// Catálogo de espécies e raças ("sem raça definida" e raça compatível com a espécie)
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../servicos/api.service';
import { AvisoService } from '../../servicos/aviso.service';
import { Etiqueta } from '../../componentes/etiqueta';
import { Cabecalho } from '../../componentes/cabecalho';
import { imagemEspecie, vazioParaNull } from '../../util/formatar';

@Component({
  selector: 'app-especies',
  imports: [FormsModule, Etiqueta, Cabecalho],
  templateUrl: './especies.html',
})
export class Especies implements OnInit {
  private api = inject(ApiService);
  private aviso = inject(AvisoService);
  imagemEspecie = imagemEspecie;

  especies: any[] = [];
  racas: any[] = [];
  filtroRacas: any = '';

  especie = { id: null as number | null, nome: '', descricao: '' };
  raca = { id: null as number | null, especieId: '' as any, nome: '', descricao: '', especieNome: '' };

  get especiesAtivas() {
    return this.especies.filter((e) => e.situacao === 'ativo');
  }

  ngOnInit() {
    this.recarregar();
  }

  async recarregar() {
    try {
      this.especies = await this.api.get('/especies');
      await this.carregarRacas();
    } catch (e: any) {
      this.aviso.erro(e.message);
    }
  }

  async carregarRacas() {
    try {
      this.racas = await this.api.get(`/racas${this.filtroRacas ? `?especieId=${this.filtroRacas}` : ''}`);
    } catch (e: any) {
      this.aviso.erro(e.message);
    }
  }

  // ---------------- Espécie ----------------
  limparEspecie() {
    this.especie = { id: null, nome: '', descricao: '' };
  }

  editarEspecie(e: any) {
    this.especie = { id: e.id, nome: e.nome, descricao: e.descricao || '' };
  }

  async salvarEspecie() {
    if (!this.especie.nome.trim()) return this.aviso.alerta('Informe o nome da espécie.');
    const corpo = { nome: this.especie.nome.trim(), descricao: vazioParaNull(this.especie.descricao) };
    try {
      if (this.especie.id) await this.api.put(`/especies/${this.especie.id}`, corpo);
      else await this.api.post('/especies', corpo);
      this.aviso.sucesso('Espécie salva.');
      this.limparEspecie();
      this.recarregar();
    } catch (e: any) {
      this.aviso.erro(e.message);
    }
  }

  async inativarEspecie(e: any) {
    if (!(await this.aviso.confirmar('Inativar espécie?', `${e.nome} não aparece mais em animais novos.`, 'Inativar'))) return;
    try {
      await this.api.delete(`/especies/${e.id}`);
      this.aviso.sucesso('Espécie inativada.');
      this.recarregar();
    } catch (erro: any) {
      this.aviso.erro(erro.message);
    }
  }

  // ---------------- Raça ----------------
  limparRaca() {
    this.raca = { id: null, especieId: '', nome: '', descricao: '', especieNome: '' };
  }

  editarRaca(r: any) {
    this.raca = { id: r.id, especieId: r.especieId, nome: r.nome, descricao: r.descricao || '', especieNome: r.especieNome };
  }

  async salvarRaca() {
    if (!this.raca.id && !this.raca.especieId) return this.aviso.alerta('Escolha a espécie da raça.');
    if (!this.raca.nome.trim()) return this.aviso.alerta('Informe o nome da raça.');
    const corpo = { nome: this.raca.nome.trim(), descricao: vazioParaNull(this.raca.descricao) };
    try {
      if (this.raca.id) await this.api.put(`/racas/${this.raca.id}`, corpo);
      else await this.api.post('/racas', { ...corpo, especieId: Number(this.raca.especieId) });
      this.aviso.sucesso('Raça salva.');
      this.limparRaca();
      this.carregarRacas();
    } catch (e: any) {
      this.aviso.erro(e.message);
    }
  }

  async inativarRaca(r: any) {
    if (!(await this.aviso.confirmar('Inativar raça?', `${r.nome} não aparece mais em animais novos.`, 'Inativar'))) return;
    try {
      await this.api.delete(`/racas/${r.id}`);
      this.aviso.sucesso('Raça inativada.');
      this.carregarRacas();
    } catch (e: any) {
      this.aviso.erro(e.message);
    }
  }
}
