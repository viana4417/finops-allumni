# Dashboard Financeiro FinOps

Projeto reduzido para exibir apenas o dashboard financeiro do trabalho da faculdade, usando como fonte analítica a cópia local do sistema `allumni-main` dentro desta pasta.

## O que ele faz

- mede tempo de execução, CPU e memória RAM no backend Node.js
- calcula custo estimado como se o Allumni estivesse hospedado em um servidor na nuvem
- compara uma versão otimizada com uma não otimizada
- grava o histórico das execuções no SQLite
- mostra os resultados em um dashboard web simples
- exporta os dados coletados em CSV para apoiar a etapa de Análise de Dados

## Estrutura principal

- `index.html`: interface do dashboard
- `finops.js`: consumo da API e renderização dos gráficos e tabelas
- `finops.css`: estilo da página
- `server.js`: backend com as rotas FinOps
- `finops/monitor.js`: coleta de métricas reais do processo
- `finops/pricing.js`: fórmula de custo
- `finops/allumni-report-service.js`: rotina analítica baseada nas tabelas `usuarios`, `vagas`, `grupos`, `candidaturas` e `mensagens` do `allumni-main`

## Como rodar

1. Instale dependências:
   `npm install`
2. Inicie o servidor:
   `npm start`
3. Abra no navegador:
   `http://localhost:3000`
4. Para baixar o arquivo de dados:
   `http://localhost:3000/api/finops/dados-csv`

## Fórmula usada

`Custo = (CPU em segundos x Preço_vCPU) + (RAM média em GB x Tempo da operação x Preço_RAM)`

## Premissa de FinOps

O custo não representa a sua máquina local literalmente. Ele simula o custo de uma operação do Allumni em um cenário de hospedagem em nuvem, no qual o sistema estaria rodando em um servidor de aplicação com cobrança por uso de CPU e memória RAM.
