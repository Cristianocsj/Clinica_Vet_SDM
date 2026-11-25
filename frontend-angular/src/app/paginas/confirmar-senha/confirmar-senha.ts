// Confirmação de senha com o código "enviado por e-mail" (aparece no terminal da API)
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService, ErroApi } from '../../servicos/api.service';
import { emailValido } from '../../util/formatar';

@Component({
  selector: 'app-confirmar-senha',
  imports: [FormsModule, RouterLink],
  templateUrl: './confirmar-senha.html',
})
export class ConfirmarSenha {
  private api = inject(ApiService);

  email = inject(ActivatedRoute).snapshot.queryParamMap.get('email') || '';
  codigo = '';
  carregando = false;
  mensagem = '';
  tipo: 'erro' | 'sucesso' | 'info' = 'info';

  avisar(texto: string, tipo: 'erro' | 'sucesso' | 'info') {
    this.mensagem = texto;
    this.tipo = tipo;
  }

  async confirmar() {
    if (!emailValido(this.email)) return this.avisar('Informe um e-mail válido.', 'erro');
    if (!/^\d{6}$/.test(this.codigo)) return this.avisar('O código tem 6 números.', 'erro');
    this.carregando = true;
    try {
      const r = await this.api.post('/auth/confirmar-senha', { email: this.email.trim(), codigo: this.codigo });
      this.avisar(`${r.mensagem} Agora é só entrar.`, 'sucesso');
    } catch (e) {
      this.avisar((e as ErroApi).message, 'erro');
    } finally {
      this.carregando = false;
    }
  }

  async reenviar() {
    if (!emailValido(this.email)) return this.avisar('Informe o e-mail para receber o código.', 'erro');
    try {
      const r = await this.api.post('/auth/reenviar-codigo', { email: this.email.trim() });
      this.avisar(`${r.mensagem} Olhe o terminal da API.`, 'info');
    } catch (e) {
      this.avisar((e as ErroApi).message, 'erro');
    }
  }
}
