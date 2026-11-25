// Avisos na tela (os "toasts" do canto) e a janelinha de confirmação.
import { Injectable } from '@angular/core';

export type TipoAviso = 'sucesso' | 'erro' | 'alerta' | 'info';

export interface Aviso {
  id: number;
  tipo: TipoAviso;
  texto: string;
}

export interface Pergunta {
  titulo: string;
  texto: string;
  botao: string;
  responder: (sim: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class AvisoService {
  avisos: Aviso[] = [];
  pergunta: Pergunta | null = null;
  private proximoId = 1;

  mostrar(texto: string, tipo: TipoAviso = 'erro') {
    const aviso = { id: this.proximoId++, tipo, texto };
    this.avisos.push(aviso);
    // some sozinho depois de alguns segundos (erros ficam mais tempo)
    setTimeout(() => this.fechar(aviso.id), tipo === 'erro' || tipo === 'alerta' ? 9000 : 5000);
  }

  sucesso(texto: string) { this.mostrar(texto, 'sucesso'); }
  erro(texto: string) { this.mostrar(texto, 'erro'); }
  alerta(texto: string) { this.mostrar(texto, 'alerta'); }

  fechar(id: number) {
    this.avisos = this.avisos.filter((a) => a.id !== id);
  }

  // Substitui o confirm() do navegador por uma janela no tema do site
  confirmar(titulo: string, texto: string, botao = 'Confirmar'): Promise<boolean> {
    return new Promise((resolve) => {
      this.pergunta = {
        titulo, texto, botao,
        responder: (sim) => {
          this.pergunta = null;
          resolve(sim);
        },
      };
    });
  }
}
