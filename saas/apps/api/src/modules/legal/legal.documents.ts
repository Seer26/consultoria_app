import type { LegalDocumentType } from './legal.repository';

export interface RequiredLegalDocument {
  documentType: LegalDocumentType;
  version: string;
  title: string;
  content: string;
}

const termsContent = `# Termos de Uso do Beta

RASCUNHO — NÃO PUBLICAR SEM REVISÃO JURÍDICA.

O beta controlado permite avaliar pesquisa empresarial, diagnóstico, plano de ação, dashboard e relatórios. O serviço é experimental, pode mudar e não garante disponibilidade contínua.

A empresa participante indica usuários autorizados e deve proteger credenciais, manter dados corretos e usar o serviço de forma lícita. É vedado contornar limites, testar acesso a outra empresa, inserir conteúdo ilícito ou comprometer o serviço.

A participante preserva direitos sobre seus dados. Diagnósticos e conteúdo gerado, inclusive por IA, são apoio informativo e exigem revisão humana; não substituem decisão profissional.

O acesso pode ser suspenso por risco de segurança, uso indevido, solicitação da empresa ou término do beta. Novas versões destes termos devem ser identificadas e, quando aplicável, aceitas novamente.`;

const privacyContent = `# Política de Privacidade do Beta

RASCUNHO — NÃO PUBLICAR SEM REVISÃO JURÍDICA.

O beta pode tratar identificação e contato de usuários, vínculo com empresa, respostas de pesquisa, tarefas, configurações, registros de aceite, autenticação, IP convertido em hash, request ID e logs técnicos.

Esses dados são usados para autenticar, isolar empresas, entregar funcionalidades, gerar relatórios, prestar suporte, proteger o serviço e medir limites de uso.

Conteúdo estritamente necessário pode ser enviado ao serviço de IA configurado para gerar perguntas ou apoiar o diagnóstico. Os processos definitivos de retenção, compartilhamento, atendimento aos direitos do titular e contato de privacidade dependem de revisão jurídica antes da publicação.`;

export function requiredLegalDocuments(input: {
  termsVersion: string;
  privacyVersion: string;
}): RequiredLegalDocument[] {
  return [
    {
      documentType: 'TERMS_OF_USE',
      version: input.termsVersion,
      title: 'Termos de Uso do Beta',
      content: termsContent,
    },
    {
      documentType: 'PRIVACY_POLICY',
      version: input.privacyVersion,
      title: 'Política de Privacidade',
      content: privacyContent,
    },
  ];
}
