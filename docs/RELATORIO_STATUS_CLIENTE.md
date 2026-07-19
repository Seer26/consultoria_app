# Relatório de Status do Produto

**Projeto:** Plataforma de Consultoria Empresarial
**Data da revisão:** 11 de julho de 2026
**Base da análise:** código atual dos aplicativos Flutter, React e da API Node.js/TypeScript

## 1. Resumo executivo

O projeto já possui uma base funcional de MVP para executar o ciclo principal de uma consultoria empresarial:

1. autenticar usuários por perfil;
2. administrar empresas e usuários;
3. realizar uma pesquisa empresarial conversacional;
4. armazenar respostas e gerar um diagnóstico inicial;
5. criar e acompanhar um plano de ação;
6. acompanhar indicadores em dashboards;
7. consultar e exportar um relatório executivo em PDF.

Desde a avaliação anterior, os maiores avanços ocorreram na persistência da pesquisa, nos dashboards com dados do banco, na administração de empresas e usuários, no plano de ação integrado e na geração de relatórios executivos.

O produto ainda não deve ser apresentado como uma suíte completa de gestão empresarial. Recursos amplos de RH, recrutamento, processos, financeiro, comercial, marketing, treinamentos, integrações e WhatsApp continuam no roadmap. Para a apresentação ao cliente, a recomendação é posicionar a solução atual como um **MVP de diagnóstico empresarial e acompanhamento de ações**.

## 2. Legenda de status

| Status | Significado |
|---|---|
| ✅ Entregue | Implementação funcional e integrada encontrada no código atual. |
| 🟡 Parcial | Existe uma base utilizável, mas ainda há limitações, dados demonstrativos ou etapas pendentes. |
| ⬜ Planejado | Não foi encontrada implementação funcional suficiente no produto atual. |
| 🔴 Prioritário | Pendência que afeta segurança, confiabilidade, escopo ou apresentação ao cliente. |

## 3. Principais avanços desde o relatório anterior

| Item | Status atual | Evidência funcional |
|---|---|---|
| Cadastro de empresas | ✅ Entregue | API permite listar, consultar, criar, editar e ativar/inativar empresas. |
| Gestão de usuários por empresa | ✅ Entregue | API permite listar, criar, editar e ativar/inativar usuários vinculados às empresas. |
| Função e setor da pesquisa | ✅ Entregue | Função do respondente e departamento são exigidos e persistidos na submissão. |
| Respostas do chat | ✅ Entregue | Perguntas, respostas, usuário, empresa, pilar e pontuação são armazenados no banco. |
| Resultado da pesquisa | ✅ Entregue | Conclusão calcula score geral, scores por pilar, pontos críticos, oportunidades, recomendações e próximos passos. |
| Plano de ação | ✅ Entregue | Possui API e tela integradas para listar, criar, editar e atualizar status de tarefas. |
| Geração de ações | ✅ Entregue | A pesquisa concluída pode gerar tarefas iniciais para o plano de ação. |
| Dashboards com dados reais | ✅ Entregue | Existem endpoints e telas por perfil para administrador, dono e funcionário. |
| Relatório executivo | ✅ Entregue | Relatórios de pesquisa podem ser consultados e exportados em PDF. |
| Isolamento básico por empresa | 🟡 Parcial | Há filtros de acesso por empresa e usuário, mas ainda falta auditoria específica de segurança multi-tenant. |

## 4. Situação atual por módulo

### 4.1 Autenticação e perfis

**Status geral: 🟡 Parcial**

Entregue:

- login com senha armazenada de forma criptografada;
- autenticação com JWT;
- perfis `ADMIN`, `OWNER` e `EMPLOYEE`;
- proteção de rotas no aplicativo e na API;
- verificação de usuário ativo.

Pendente:

- refresh token;
- autenticação multifator;
- recuperação e redefinição de senha;
- política detalhada de sessão e expiração;
- auditoria de acessos e ações;
- consentimento, retenção de dados e demais requisitos de LGPD.

### 4.2 Administração do SaaS

**Status geral: 🟡 Parcial, com avanço relevante**

Entregue:

- cadastro, edição, consulta e ativação/inativação de empresas;
- cadastro, edição, consulta e ativação/inativação de usuários por empresa;
- acesso administrativo separado por perfil.

Pendente:

- gestão de consultores como entidade própria;
- permissões granulares além dos três perfis atuais;
- planos, cobrança e assinatura;
- white-label;
- auditoria e logs administrativos;
- feature flags, templates e monitoramento do sistema.

### 4.3 Pesquisa e diagnóstico empresarial

**Status geral: ✅ MVP funcional**

Entregue:

- início de pesquisa com função e setor obrigatórios;
- conversa orientada por perguntas;
- persistência do histórico de perguntas e respostas;
- vínculo com usuário e empresa;
- uso de IA para geração de perguntas, com fluxo complementar de diagnóstico;
- conclusão da pesquisa com score geral e por pilar;
- geração de resumo, pontos críticos, oportunidades, recomendações e próximos passos;
- histórico e consulta de submissões;
- geração inicial de plano de ação.

Limitações atuais:

- o score inicial inclui regras heurísticas quando não existe pontuação explícita;
- ainda não há questionários especializados e completos para dono, líder, funcionário e candidato;
- não há análise consolidada de divergências entre perfis ou comparação avançada entre setores;
- proposta comercial, orçamento, previsão de impacto e estimativa de melhoria não são gerados;
- a API ainda permite que um `ADMIN` crie ou altere pesquisas, embora a experiência esperada seja administrativa. Essa regra precisa ser confirmada e restringida antes da produção.

### 4.4 Dashboard

**Status geral: 🟡 Parcial, integrado a dados reais**

Entregue:

- dashboard específico para administrador, dono e funcionário;
- totais de empresas, usuários e pesquisas conforme o perfil;
- quantidade de pesquisas concluídas;
- score médio;
- tarefas abertas, em andamento, concluídas e atrasadas;
- pesquisas recentes;
- tarefas prioritárias;
- scores por pilar e resumo por empresa.

Pendente:

- notificações persistidas;
- alertas críticos configuráveis;
- metas empresariais;
- comparativos mensais e anuais consolidados;
- evolução histórica visual do diagnóstico;
- previsão de crescimento;
- resumos financeiro, comercial, operacional e de clima alimentados por módulos próprios.

### 4.5 Plano de ação

**Status geral: ✅ MVP funcional**

Entregue:

- tela Flutter integrada à API;
- criação e edição de tarefas;
- prioridade, status, prazo, pilar e responsável;
- estados `TODO`, em andamento, concluído e cancelado;
- identificação de tarefas atrasadas;
- geração automática de ações a partir de uma pesquisa;
- indicadores de acompanhamento usados nos dashboards e relatórios.

Pendente:

- checklist interno por ação;
- ICE Score completo e editável;
- dependências entre tarefas;
- alertas automáticos de atraso;
- planejado versus realizado;
- histórico detalhado de alterações;
- reajuste automático do plano.

### 4.6 Relatórios

**Status geral: 🟡 Parcial, com relatório executivo funcional**

Entregue:

- listagem de relatórios de pesquisa;
- visão detalhada com identificação da empresa e respondente;
- score geral e por pilar;
- resumo, pontos críticos, oportunidades, recomendações e próximos passos;
- resumo das tarefas do plano de ação;
- exportação de relatório executivo em PDF.

Pendente:

- exportação Excel;
- relatórios consolidados por setor e colaborador;
- relatórios financeiro, comercial, operacional, de clima e estratégico;
- histórico/versionamento de relatórios;
- apresentação executiva automática em slides.

### 4.7 Pessoas, equipe e formulários

**Status geral: 🟡 Parcial/demonstrativo**

Existe uma experiência inicial de equipe/clientes e formulários no Flutter, mas parte dos dados ainda usa mocks ou fallback demonstrativo. Não deve ser apresentada como um módulo completo de RH.

Pendente:

- cadastro real completo de funcionários, setores e cargos;
- organograma e mapa de liderança;
- pesquisas de clima e satisfação consolidadas;
- avaliações de desempenho, 360°, emocional e comportamental;
- identificação de talentos, conflitos e risco de desligamento;
- plano de desenvolvimento e carreira;
- comparação entre equipes e setores.

### 4.8 Módulos ainda no roadmap

**Status geral: ⬜ Planejado**

Os temas abaixo podem aparecer como pilares ou perguntas do diagnóstico, mas ainda não existem como módulos operacionais completos:

- recrutamento e seleção;
- gestão e mapeamento de processos;
- funções e cargos;
- marketing e campanhas;
- comercial, CRM e pipeline de vendas;
- pós-vendas, NPS, retenção e churn;
- gestão financeira e fluxo de caixa;
- planejamento estratégico completo;
- cenário ideal e simulações;
- treinamentos e trilhas de aprendizado;
- integrações com ERP, CRM, Apolo, Syonet e Dílher;
- automações e comunicação via WhatsApp;
- IA preditiva baseada em histórico e benchmarking.

## 5. Pendências prioritárias antes da apresentação

| Prioridade | Ação recomendada | Motivo |
|---|---|---|
| 🔴 P0 | Definir oficialmente o Flutter como frontend principal do MVP | Hoje Flutter e React coexistem; o React ainda usa dados simulados e pode gerar expectativa incorreta. |
| 🔴 P0 | Preparar uma base de demonstração controlada | A apresentação precisa de empresa, usuários, pesquisas, tarefas e relatório previamente validados. |
| 🔴 P0 | Confirmar e restringir o papel do `ADMIN` nas pesquisas | A API atual permite atuação do administrador no fluxo de pesquisa. |
| 🔴 P0 | Fazer um teste completo do fluxo em ambiente limpo | Validar login → pesquisa → diagnóstico → plano de ação → dashboard → PDF. |
| 🔴 P0 | Revisar textos e nomenclaturas da interface | Padronizar para “Pesquisa Empresarial” na experiência do cliente, mantendo nomes técnicos internos quando necessário. |
| 🟡 P1 | Corrigir os 12 avisos do `flutter analyze` | Há APIs depreciadas e um alerta de uso de contexto após operação assíncrona. |
| 🟡 P1 | Remover mocks/fallbacks das telas apresentadas | Chat antigo, formulários, clientes e áreas de negócio ainda possuem trechos demonstrativos. |
| 🟡 P1 | Organizar o repositório e a entrega | `node_modules`, artefatos compilados, banco local e `.dart_tool` não devem fazer parte do pacote de entrega. |
| 🟡 P1 | Criar testes automatizados do fluxo crítico | A cobertura atual não comprova os módulos centrais do MVP. |
| 🟡 P1 | Revisar segurança e isolamento entre empresas | Necessário antes de dados reais de múltiplos clientes. |

## 6. Validação técnica realizada

| Verificação | Resultado em 11/07/2026 |
|---|---|
| Build do domínio TypeScript | ✅ Sucesso |
| Build da API Node.js/TypeScript | ✅ Sucesso |
| Build do frontend React/Vite | ✅ Sucesso |
| Análise estática Flutter | 🟡 Sem erros graves, com 12 avisos informativos/depreciações |
| Testes automatizados do fluxo principal | 🔴 Não há cobertura suficiente para atestar o fluxo completo |

Observação: sucesso de build confirma consistência de compilação, mas não substitui testes funcionais, de segurança e de usabilidade.

## 7. Escopo recomendado para a demonstração ao cliente

### O que demonstrar

1. Login com separação por perfil.
2. Administração de empresas e usuários.
3. Início de uma pesquisa com função e setor.
4. Conversa e registro das respostas.
5. Resultado com score, pontos críticos e oportunidades.
6. Geração e acompanhamento do plano de ação.
7. Dashboard alimentado pelos dados registrados.
8. Relatório executivo e exportação em PDF.

### Como posicionar

> A versão atual é o núcleo funcional da plataforma: ela coleta informações da empresa, transforma respostas em um diagnóstico inicial, organiza ações prioritárias e oferece acompanhamento gerencial. Os módulos especializados serão adicionados em fases posteriores conforme a prioridade de negócio.

### O que não apresentar como concluído

- sistema completo de RH;
- CRM ou gestão comercial completa;
- sistema financeiro;
- recrutamento e seleção;
- integrações externas;
- WhatsApp automatizado;
- análises preditivas avançadas;
- todos os indicadores executivos descritos na visão final do produto.

## 8. Roadmap sugerido

### Fase 1 — Preparação da demonstração

- estabilizar o fluxo principal;
- corrigir permissões e avisos técnicos prioritários;
- padronizar nomenclaturas e textos;
- criar dados de demonstração confiáveis;
- executar teste ponta a ponta;
- revisar visualmente o PDF executivo.

### Fase 2 — MVP piloto

- remover mocks das áreas incluídas no piloto;
- adicionar recuperação de senha, refresh token e auditoria básica;
- consolidar comparativos por setor e perfil;
- criar alertas e histórico do plano de ação;
- adicionar testes automatizados e rotina de backup;
- adequar o tratamento de dados à LGPD.

### Fase 3 — Expansão do produto

- priorizar módulos especializados conforme validação comercial;
- adicionar integrações e automações;
- evoluir relatórios e análises históricas;
- incorporar modelos preditivos somente após existir volume e qualidade de dados suficientes.

## 9. Conclusão

O projeto evoluiu de uma base majoritariamente demonstrativa para um MVP com fluxo central integrado. Pesquisa, diagnóstico inicial, plano de ação, dashboards, administração e relatório executivo já formam uma narrativa coerente para uma apresentação.

A melhor estratégia comercial é demonstrar esse núcleo com clareza e transparência, evitando enquadrar como concluídos os módulos especializados ainda planejados. Após estabilização, teste ponta a ponta e revisão de segurança, o sistema estará em melhor condição para um piloto controlado com cliente real.
