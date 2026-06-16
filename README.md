# pm2-dash

Dashboard web para visualizar todos os serviços rodando no PM2 localmente.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green) ![PM2](https://img.shields.io/badge/PM2-required-blue)

<img width="2559" height="1389" alt="image" src="https://github.com/user-attachments/assets/96e3f57c-49d0-4cb9-b917-45389cb2a62c" />


## O que faz

- Lista todos os processos PM2 automaticamente
- Mostra status, CPU, memória, uptime e porta de cada serviço
- Detecta a porta mesmo em apps com porta dinâmica (via netstat)
- Atualização em tempo real via WebSocket
- Clique no card para abrir o serviço no navegador

## Requisitos

- Node.js 18+
- PM2 instalado globalmente

## Instalação

```bash
npm install
```

## Uso

```bash
# Rodar direto
npm start

# Rodar via PM2
npm run pm2:start
```

Acesse **http://localhost:3042**

## Scripts

| Comando | Descrição |
|---|---|
| `npm start` | Inicia o servidor |
| `npm run dev` | Inicia com hot-reload |
| `npm run pm2:start` | Inicia via PM2 |
| `npm run pm2:stop` | Para o processo PM2 |
| `npm run pm2:restart` | Reinicia o processo PM2 |
| `npm run pm2:logs` | Exibe os logs |
