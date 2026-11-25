# Telas da Clínica Vet (Angular)

Front-end do projeto, feito em **Angular 21** com Bootstrap 5.3 e um tema próprio
(clínica veterinária, ilustrações de cães e gatos). Funciona no computador e no celular.

## Como rodar

Com a API da clínica (`npm start`, porta 3000) e a do governo (porta 8001) rodando:

```bash
npm run front:instalar   # só na primeira vez (na raiz do projeto)
npm run front            # abre http://localhost:8080
```

Login de demonstração: `ativo@clinica.test` / `Senha@123`.

## Onde está cada coisa

```text
src/app/
  app.routes.ts            rotas (telas) e a proteção por login
  servicos/api.service.ts  única porta de saída: fala só com a API da clínica (fetch + token)
  servicos/aviso.service.ts avisos no canto da tela e a janela "tem certeza?"
  servicos/login.guard.ts  sem login, volta para a tela de login
  util/formatar.ts         formatação (CPF, CEP, datas) e validações (CPF, e-mail, microchip)
  componentes/             menu lateral (layout), cabeçalho das telas e etiqueta de situação
  paginas/                 uma pasta por tela: login, confirmar-senha, painel, tutores,
                           animais, ficha-animal, doses, governo, veterinarios, especies
src/styles.css             cores e estilo do tema
public/img/                ilustrações (créditos em public/img/CREDITOS.md)
```

Cada tela é um componente com um `.ts` (o que a tela faz) e um `.html` (o que aparece).
Os formulários usam `[(ngModel)]` e validam no navegador antes de chamar a API,
que valida de novo.
