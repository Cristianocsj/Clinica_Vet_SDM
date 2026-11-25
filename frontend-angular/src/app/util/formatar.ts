// Funções de formatação e validação usadas em várias telas
// (as mesmas regras da API: o navegador avisa antes de enviar, e a API valida de novo).

export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

export function somenteNumeros(valor: any): string {
  return String(valor ?? '').replace(/\D/g, '');
}

export function formatarData(data?: string | null): string {
  if (!data) return '';
  const [ano, mes, dia] = data.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

export function formatarDataHora(dataHora?: string | null): string {
  if (!dataHora) return '';
  return `${formatarData(dataHora)} ${dataHora.slice(11, 16)}`;
}

export function formatarCpf(cpf?: string | null): string {
  const n = somenteNumeros(cpf);
  return n.length === 11 ? `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}` : (cpf || '');
}

export function formatarCep(cep?: string | null): string {
  const n = somenteNumeros(cep);
  return n.length === 8 ? `${n.slice(0, 5)}-${n.slice(5)}` : (cep || '');
}

export function cpfValido(cpf: string): boolean {
  const n = somenteNumeros(cpf);
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
  for (const tamanho of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(n[i]) * (tamanho + 1 - i);
    const digito = (soma * 10) % 11 % 10;
    if (digito !== Number(n[tamanho])) return false;
  }
  return true;
}

export function cepValido(cep: string): boolean {
  return somenteNumeros(cep).length === 8;
}

export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
}

// Microchip ISO 11784: exatamente 15 números
export function microchipValido(codigo: string): boolean {
  return /^\d{15}$/.test(String(codigo || '').replace(/[\s-]/g, ''));
}

export function hojeISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Texto vazio vira null (para a API entender "sem valor")
export function vazioParaNull(valor: any) {
  if (typeof valor === 'string') valor = valor.trim();
  return valor === '' || valor === undefined ? null : valor;
}

export function numeroOuNull(valor: any): number | null {
  if (valor === null || valor === undefined || String(valor).trim() === '') return null;
  return Number(String(valor).replace(',', '.'));
}

export function textoSexo(sexo?: string | null): string {
  return sexo === 'M' ? 'Macho' : sexo === 'F' ? 'Fêmea' : 'Não informado';
}

// Imagem de cada espécie (ilustrações Fluent Emoji 3D, licença MIT - ver public/img/CREDITOS.md)
export function imagemEspecie(especie?: string | null): string {
  const nome = (especie || '').toLowerCase();
  if (nome.includes('gat')) return 'img/gato.webp';
  if (nome.includes('ave') || nome.includes('pássar') || nome.includes('passar')) return 'img/passaro.webp';
  if (nome.includes('coelh')) return 'img/coelho.webp';
  return 'img/cachorro.webp';
}
