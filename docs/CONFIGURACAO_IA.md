# Configuração de IA

A integração de IA é exclusiva do backend da API. Nenhuma chave, modelo ou
seleção de provider deve ser enviada ao Flutter.

## Gemini — provider padrão do beta

```env
AI_ENABLED=true
AI_PROVIDER=gemini
AI_MODEL=gemini-3.5-flash-lite
GEMINI_API_KEY=<secret-configurado-no-backend>
```

O adapter Gemini reutiliza o SDK OpenAI instalado, apontado para a camada
oficial de compatibilidade do Gemini. Internamente ele usa Chat Completions com
Structured Outputs. A aplicação sempre revalida o resultado antes de utilizá-lo.

## OpenAI — alternativa suportada

```env
AI_ENABLED=true
AI_PROVIDER=openai
AI_MODEL=<modelo-openai-compativel>
OPENAI_API_KEY=<secret-configurado-no-backend>
```

O adapter OpenAI mantém a Responses API implementada na Sprint 3.14.

Com `AI_ENABLED=false`, nenhuma chamada externa é realizada. Quando a IA é
obrigatória para readiness, a chave exigida é determinada por `AI_PROVIDER`.
Valores diferentes de `gemini` e `openai` são rejeitados na inicialização.

As chaves devem existir somente nas variáveis protegidas do serviço da API. Não
devem ser versionadas, registradas em logs ou configuradas no build Flutter.
