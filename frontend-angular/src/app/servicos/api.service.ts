// Comunicação com a API da clínica (Node, porta 3000).
// O front só fala com ela: nunca direto com o banco, com o governo ou com o ViaCEP.
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

export const API_URL = 'http://localhost:3000/api';

export interface Sessao {
  token: string;
  veterinario: { id: number; nome: string; email: string; [campo: string]: any };
}

// Erro com a mensagem que a API devolveu (e o status/código para tratar casos especiais)
export class ErroApi extends Error {
  constructor(mensagem: string, public status = 0, public codigo: string | null = null) {
    super(mensagem);
  }
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private router = inject(Router);

  // ---------------- Sessão (token do login guardado no navegador) ----------------

  lerSessao(): Sessao | null {
    try {
      return JSON.parse(localStorage.getItem('sessao') || 'null');
    } catch {
      return null;
    }
  }

  salvarSessao(login: Sessao) {
    localStorage.setItem('sessao', JSON.stringify({ token: login.token, veterinario: login.veterinario }));
  }

  limparSessao() {
    localStorage.removeItem('sessao');
  }

  // ---------------- Chamadas ----------------

  get<T = any>(caminho: string) {
    return this.chamar<T>('GET', caminho);
  }
  post<T = any>(caminho: string, corpo?: any) {
    return this.chamar<T>('POST', caminho, corpo);
  }
  put<T = any>(caminho: string, corpo?: any) {
    return this.chamar<T>('PUT', caminho, corpo);
  }
  delete<T = any>(caminho: string) {
    return this.chamar<T>('DELETE', caminho);
  }

  // Faz a requisição e devolve o JSON. Em caso de erro lança ErroApi com a "mensagem" da API.
  async chamar<T = any>(metodo: string, caminho: string, corpo?: any): Promise<T> {
    const sessao = this.lerSessao();
    const cabecalhos: Record<string, string> = { 'Content-Type': 'application/json' };
    if (sessao) cabecalhos['Authorization'] = `Bearer ${sessao.token}`;

    let resposta: Response;
    try {
      resposta = await fetch(API_URL + caminho, {
        method: metodo,
        headers: cabecalhos,
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
      });
    } catch {
      throw new ErroApi('Não foi possível falar com a API da clínica (http://localhost:3000). Confira se ela está rodando com "npm start".');
    }

    const texto = await resposta.text();
    let dados: any = null;
    try {
      dados = texto ? JSON.parse(texto) : null;
    } catch {
      dados = null;
    }

    // Sessão expirou ou o veterinário foi inativado: volta para o login
    const rotaDeLogin = caminho.startsWith('/auth/login') || caminho.startsWith('/auth/confirmar') || caminho.startsWith('/auth/reenviar');
    if (!rotaDeLogin && (resposta.status === 401 || (resposta.status === 403 && dados?.codigo === 'VETERINARIO_INATIVO'))) {
      this.limparSessao();
      this.router.navigate(['/login'], { queryParams: { sessao: 'expirada' } });
      throw new ErroApi('Sessão encerrada. Faça login de novo.', resposta.status);
    }

    if (!resposta.ok) {
      const mensagem = dados?.mensagem || (resposta.status === 404 ? 'Rota não encontrada na API.' : `Erro ${resposta.status} na API.`);
      throw new ErroApi(mensagem, resposta.status, dados?.codigo || null);
    }
    return dados as T;
  }
}
