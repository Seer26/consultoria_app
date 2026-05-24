# Arquitetura

Aplicacao organizada por camadas e por features, seguindo Clean Architecture e separacao de responsabilidades.

## Estrutura de pastas

```
lib/
  core/
    constants/          # Constantes globais (ex: baseUrl)
    di/                 # Providers de dependencia (Dio, storage)
    errors/             # Falhas/erros compartilhados
    http/               # Cliente Dio e interceptors
    router/             # GoRouter com guardas e shell
    theme/              # Tema e paleta
    utils/              # Result helpers, extensoes
    widgets/            # Shell e componentes base

  features/
    auth/
      data/             # DataSources, repositorios concretos
      domain/           # Entidades, contratos, use cases
      presentation/     # Pages, controllers/providers
    clients/
      data/
      domain/
      presentation/
    diagnosis/
      data/
      domain/
      presentation/
    action_plan/
      data/
      domain/
      presentation/
    reports/
      data/
      domain/
      presentation/
    chat/
      data/
      domain/
      presentation/

  main.dart             # Bootstrap de tema, estado e router
```

## Fluxo de dados

UI (pages/widgets) -> Controllers/Providers (Riverpod) -> Use cases (domain) -> Repositorios -> DataSources (HTTP/Cache) -> API/Storage.

## Principios adotados

- Navegacao declarativa com go_router + shell e redirecionamento por autenticacao.
- Estado imutavel com StateNotifier e AsyncValue.
- Camada HTTP centralizada (DioClient) com interceptor de token e refresh.
- Tokens em FlutterSecureStorage.
- Entidades de dominio simples e prontas para serializacao por DTOs.
- Temas claros e cards como base visual; tipografia Manrope.

## Evolucoes planejadas

- Substituir mocks por chamadas reais de API nos DataSources.
- Adicionar testes unitarios para use cases, repositories e interceptors.
- Caching local (Hive/Drift) para clientes e diagnosticos.
- Guardas de rota por perfil (consultor/cliente/colaborador).
