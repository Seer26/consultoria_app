# Status jurídico do beta

Data da revisão técnica: 18/07/2026.

**Status: REPROVADO PARA BETA EXTERNO — documentos permanecem rascunhos.**

Esta é uma conferência de completude técnica, não revisão jurídica.

| Documento | Versão técnica atual | Status | Pendências principais |
|---|---|---|---|
| `TERMOS_DE_USO_BETA_RASCUNHO.md` | `beta-draft-v1` | RASCUNHO | fornecedora, contato, suporte, exportação/exclusão, aviso, responsabilidade e garantias |
| `POLITICA_DE_PRIVACIDADE_RASCUNHO.md` | `beta-draft-v1` | RASCUNHO | controlador/operador/encarregado, bases legais, fornecedores, região, retenção, direitos e contato |
| `POLITICA_USO_IA_RASCUNHO.md` | sem aprovação; alinhada ao ciclo `beta-draft-v1` | RASCUNHO | fornecedor, contrato, retenção, treinamento, região, subprocessadores, canal e transparência |

## Placeholders preservados

- identificação e contato da fornecedora;
- razão social, CNPJ e endereço;
- controlador, operador e encarregado;
- canal e responsável de privacidade;
- canal e horário de suporte;
- processo/prazo de exportação e exclusão;
- bases legais e retenção;
- fornecedores contratados;
- canal para incidentes e uso inadequado de IA.

Nenhum nome, CNPJ, endereço, encarregado, prazo ou fornecedor foi inventado.

## Responsabilidade pela revisão

Responsável jurídico: `[DEFINIR]`.

Responsável interno pelo aceite: `[DEFINIR]`.

Data prevista: `[DEFINIR]`.

O aceite técnico versionado demonstra concordância do usuário com uma versão configurada, mas não transforma o rascunho em documento juridicamente aprovado. `REQUIRE_LEGAL_ACCEPTANCE=true` deve permanecer um controle técnico; o beta continua bloqueado até autorização jurídica mínima.

## Política técnica de obrigatoriedade

O backend é a fonte da verdade da política informada ao Flutter por `GET /legal/documents/pending` no campo `enforcementRequired`.

- `REQUIRE_LEGAL_ACCEPTANCE=true`: pendências bloqueiam as rotas protegidas da API e a navegação do Flutter até o aceite de todas as versões exigidas.
- `REQUIRE_LEGAL_ACCEPTANCE=false` ou variável ausente: documentos e versões podem continuar pendentes, mas não bloqueiam a API nem o Flutter e nenhum aceite é criado automaticamente.

Essa flag controla somente a obrigatoriedade técnica. A necessidade de revisão e aprovação profissional dos textos permanece inalterada.
