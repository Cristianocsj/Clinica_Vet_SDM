// Tela de login (testes 1 a 4): só entra veterinário ativo e com a senha confirmada
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, ErroApi, Sessao } from '../../servicos/api.service';
import { emailValido } from '../../util/formatar';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  private api = inject(ApiService);
  private router = inject(Router);

  email = '';
  senha = '';
  verSenha = false;
  carregando = false;
  erro = '';
  tipoErro: 'erro' | 'alerta' = 'erro';

  constructor() {
    if (this.api.lerSessao()) this.router.navigate(['/painel']);
    if (inject(ActivatedRoute).snapshot.queryParamMap.get('sessao') === 'expirada') {
      this.mostrarErro('Sua sessão terminou. Faça login de novo.', 'alerta');
    }
  }

  mostrarErro(texto: string, tipo: 'erro' | 'alerta' = 'erro') {
    this.erro = texto;
    this.tipoErro = tipo;
  }

  async entrar() {
    this.erro = '';
    if (!emailValido(this.email.trim()) || !this.senha) {
      return this.mostrarErro('Informe um e-mail válido e a senha.');
    }
    this.carregando = true;
    try {
      const resposta = await this.api.post<Sessao>('/auth/login', { email: this.email.trim(), senha: this.senha });
      this.api.salvarSessao(resposta);
      this.router.navigate(['/painel']);
    } catch (e) {
      const erro = e as ErroApi;
      if (erro.codigo === 'SENHA_NAO_CONFIRMADA') {
        this.mostrarErro(`${erro.message} Use "Confirmar senha" (o código aparece no terminal da API).`, 'alerta');
      } else {
        this.mostrarErro(erro.message);
      }
    } finally {
      this.carregando = false;
    }
  }
}
