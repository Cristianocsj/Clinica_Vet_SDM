// Cadastro de animais: tutor obrigatório, raça da mesma espécie, data OU idade estimada
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../servicos/api.service';
import { AvisoService } from '../../servicos/aviso.service';
import { Etiqueta } from '../../componentes/etiqueta';
import { Cabecalho } from '../../componentes/cabecalho';
import { formatarCpf, hojeISO, imagemEspecie, numeroOuNull, textoSexo, vazioParaNull } from '../../util/formatar';

function animalVazio() {
  return {
    nome: '', tutorId: '' as any, especieId: '' as any, racaId: '' as any, sexo: '', cor: '', peso: '' as any,
    tipoNascimento: 'data', dataNascimento: '', idadeAnos: '' as any, idadeMeses: '' as any,
  };
}

@Component({
  selector: 'app-animais',
  imports: [FormsModule, RouterLink, Etiqueta, Cabecalho],
  templateUrl: './animais.html',
})
export class Animais implements OnInit {
  private api = inject(ApiService);
  private aviso = inject(AvisoService);
  private rota = inject(ActivatedRoute);
  private router = inject(Router);

  imagemEspecie = imagemEspecie;
  textoSexo = textoSexo;
  formatarCpf = formatarCpf;

  // filtros e lista
  busca = '';
  especieFiltro = '';
  situacao = 'ativo';
  tutorDaUrl = this.rota.snapshot.queryParamMap.get('tutorId');
  tutorDoFiltro: any = null;
  animais: any[] = [];
  carregando = false;

  // escolhas do formulário
  tutores: any[] = [];
  especies: any[] = [];
  racas: any[] = [];

  // formulário
  formAberto = false;
  animalEmEdicao: any = null;
  form = animalVazio();
  salvando = false;

  async ngOnInit() {
    try {
      const [tutores, especies] = await Promise.all([
        this.api.get<any[]>('/tutores?situacao=ativo'),
        this.api.get<any[]>('/especies?situacao=ativo'),
      ]);
      this.tutores = tutores;
      this.especies = especies;
      if (this.tutorDaUrl) this.tutorDoFiltro = await this.api.get(`/tutores/${this.tutorDaUrl}`);
      await this.carregar();
      if (this.rota.snapshot.queryParamMap.get('novo')) this.abrir(null);
    } catch (e: any) {
      this.aviso.erro(e.message);
    }
  }

  async carregar() {
    const p = new URLSearchParams();
    if (this.busca.trim()) p.set('busca', this.busca.trim());
    if (this.especieFiltro) p.set('especieId', this.especieFiltro);
    if (this.situacao) p.set('situacao', this.situacao);
    if (this.tutorDaUrl) p.set('tutorId', this.tutorDaUrl);
    this.carregando = true;
    try {
      this.animais = await this.api.get(`/animais?${p}`);
    } catch (e: any) {
      this.aviso.erro(e.message);
    } finally {
      this.carregando = false;
    }
  }

  verTodos() {
    this.tutorDaUrl = null;
    this.tutorDoFiltro = null;
    this.router.navigate(['/animais']);
    this.carregar();
  }

  // As raças dependem da espécie escolhida
  async carregarRacas(especieId: any, racaSelecionada: any = '') {
    this.racas = [];
    this.form.racaId = '';
    if (!especieId) return;
    try {
      this.racas = await this.api.get(`/racas?especieId=${especieId}&situacao=ativo`);
      this.form.racaId = racaSelecionada || '';
    } catch (e: any) {
      this.aviso.erro(e.message);
    }
  }

  async abrir(animal: any) {
    this.animalEmEdicao = animal;
    this.form = animalVazio();
    this.racas = [];
    if (animal) {
      // tutor inativo não aparece na lista de escolha: mostra o atual mesmo assim
      if (!this.tutores.some((t) => t.id === animal.tutorId)) {
        this.tutores = [...this.tutores, { id: animal.tutorId, nome: animal.tutorNome, cpf: '' }];
      }
      Object.assign(this.form, {
        nome: animal.nome, tutorId: animal.tutorId, especieId: animal.especieId, sexo: animal.sexo || '',
        cor: animal.cor || '', peso: animal.peso ?? '', dataNascimento: animal.dataNascimento || '',
      });
      await this.carregarRacas(animal.especieId, animal.racaId);
    } else if (this.tutorDaUrl) {
      this.form.tutorId = Number(this.tutorDaUrl);
    }
    this.formAberto = true;
  }

  async salvar() {
    const d = this.form;
    const porIdade = d.tipoNascimento === 'idade';
    const peso = numeroOuNull(d.peso);
    const erros: string[] = [];
    if (!d.nome.trim()) erros.push('nome');
    if (!d.tutorId) erros.push('tutor');
    if (!d.especieId) erros.push('espécie');
    if (peso !== null && !(peso > 0)) erros.push('peso maior que zero');
    if (!porIdade && !d.dataNascimento) erros.push('data de nascimento (ou marque "Idade estimada")');
    if (!porIdade && d.dataNascimento > hojeISO()) erros.push('data de nascimento que não esteja no futuro');
    if (porIdade && !(Number(d.idadeAnos) > 0 || Number(d.idadeMeses) > 0)) erros.push('idade em anos e/ou meses');
    if (erros.length) return this.aviso.alerta(`Confira: ${erros.join(', ')}.`);

    const corpo: any = {
      nome: d.nome.trim(),
      tutorId: Number(d.tutorId),
      especieId: Number(d.especieId),
      racaId: d.racaId ? Number(d.racaId) : null,
      sexo: vazioParaNull(d.sexo),
      cor: vazioParaNull(d.cor),
      peso,
    };
    if (porIdade) {
      corpo.idadeAnos = Number(d.idadeAnos || 0);
      corpo.idadeMeses = Number(d.idadeMeses || 0);
    } else if (!this.animalEmEdicao || d.dataNascimento !== this.animalEmEdicao.dataNascimento) {
      // na alteração só manda a data se ela mudou (assim uma data estimada continua estimada)
      corpo.dataNascimento = d.dataNascimento;
    }

    this.salvando = true;
    try {
      const salvo = this.animalEmEdicao
        ? await this.api.put(`/animais/${this.animalEmEdicao.id}`, corpo)
        : await this.api.post('/animais', corpo);
      this.aviso.sucesso(this.animalEmEdicao && salvo.microchip
        ? `${salvo.nome} salvo. A alteração foi enviada ao governo.`
        : `${salvo.nome} salvo.`);
      this.formAberto = false;
      this.carregar();
    } catch (e: any) {
      this.aviso.erro(e.message);
    } finally {
      this.salvando = false;
    }
  }

  async inativar(animal: any) {
    const ok = await this.aviso.confirmar('Inativar animal?', `O histórico de ${animal.nome} continua guardado.`, 'Inativar');
    if (!ok) return;
    try {
      await this.api.delete(`/animais/${animal.id}`);
      this.aviso.sucesso('Animal inativado.');
      this.carregar();
    } catch (e: any) {
      this.aviso.erro(e.message);
    }
  }
}
