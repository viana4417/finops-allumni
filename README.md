# Dashboard Financeiro FinOps

Projeto reduzido para exibir apenas o dashboard financeiro do trabalho da faculdade, usando como fonte analítica a cópia local do sistema `allumni-main` dentro desta pasta.

## O que ele faz

- mede tempo de execução, CPU e memória RAM no backend Node.js
- calcula custo estimado como se o Allumni estivesse hospedado em um servidor na nuvem
- compara uma versão otimizada com uma não otimizada
- grava o histórico das execuções no SQLite
- mostra os resultados em um dashboard web simples
- exporta os dados coletados em CSV para apoiar a etapa de Análise de Dados
- gera um gráfico PNG com Matplotlib em `exports/grafico_custos.png`

## Estrutura principal

- `index.html`: interface do dashboard
- `finops.js`: consumo da API e renderização dos gráficos e tabelas
- `finops.css`: estilo da página
- `server.js`: backend com as rotas FinOps
- `finops/monitor.js`: coleta de métricas reais do processo
- `finops/pricing.js`: fórmula de custo
- `finops/generate-cost-chart.py`: geração do gráfico PNG com Matplotlib
- `finops/allumni-report-service.js`: rotina analítica baseada nas tabelas `usuarios`, `vagas`, `grupos`, `candidaturas` e `mensagens` do `allumni-main`

## Como rodar

1. Instale dependências:
   `npm install`
2. Instale a dependência Python do gráfico:
   `python3 -m pip install -r requirements.txt`
3. Inicie o servidor:
   `npm start`
4. Abra no navegador:
   `http://localhost:3000`
5. Para baixar o arquivo de dados:
   `http://localhost:3000/api/finops/dados-csv`

## Teste de stress

Para executar testes reais de carga no backend ALUMNI e na rota FinOps:

`npm run stress`

O script sobe o ALUMNI na porta `3100`, o FinOps na porta `3101`, dispara requisições concorrentes em rotas de login, vagas, grupos, mensagens e comparação FinOps, e salva os resultados em `exports/stress-test-report.json` e `exports/stress-test-report.md`.

Também há um exemplo opcional com Selenium, conforme o enunciado:

`python3 scripts/selenium-stress-example.py`

Ele abre navegadores em modo headless para simular usuários acessando a interface. Para um teste de carga mais preciso no backend, use `npm run stress`.

## Fórmula usada

Tabela fictícia usada pelo Monitor de Custos Simulado:

- 1 GB de RAM: R$ 0,10 por segundo
- 1 hora de CPU: R$ 1,00
- 1 GB de armazenamento: R$ 0,05 por hora

`Custo_RAM = Quantidade_RAM_GB x 0,10 x Tempo_segundos`

`Custo_CPU = Tempo_CPU_horas x 1,00`

`Custo_Total = Custo_RAM + Custo_CPU`

Exemplo do enunciado: 2 GB de RAM por 10 segundos e 2 horas de CPU resultam em `R$ 2,00 + R$ 2,00 = R$ 4,00`.

## Premissa de FinOps

O custo não representa a sua máquina local literalmente. Ele simula o custo de uma operação do Allumni em um cenário de hospedagem em nuvem, no qual o sistema estaria rodando em um servidor de aplicação com cobrança por uso de CPU e memória RAM.
