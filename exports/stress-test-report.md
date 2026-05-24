# Relatorio de Stress - ALUMNI e FinOps

Gerado em: 2026-05-24T21:16:04.306Z

| Cenario | Requisicoes | Concorrencia | RPS | Erros | Media ms | P95 ms | P99 ms | CPU pico % | RAM pico MB |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Login | 80 | 15 | 87.3 | 0 | 161.26 | 228.96 | 229.69 | 289 | 73.9 |
| Vagas | 150 | 30 | 2064.49 | 0 | 13.82 | 28.33 | 36.39 | 289 | 74.79 |
| Grupos | 150 | 30 | 3745.42 | 0 | 7.36 | 9.61 | 10.91 | 277 | 79.64 |
| Mensagens de grupo | 100 | 20 | 3401.38 | 0 | 5.41 | 7.03 | 7.81 | 274 | 84.16 |
| FinOps comparacao | 4 | 2 | 0.62 | 0 | 3197.16 | 4515.33 | 4515.33 | 137 | 2599.39 |

## Observacao FinOps

Os cenarios de maior concorrencia elevam tempo de resposta, CPU e memoria. Esse aumento de consumo se conecta ao modulo FinOps porque a formula de custo usa CPU faturada e RAM faturada durante a execucao.

## Status HTTP

- Login: {"200":80}
- Vagas: {"200":150}
- Grupos: {"200":150}
- Mensagens de grupo: {"200":100}
- FinOps comparacao: {"200":4}
