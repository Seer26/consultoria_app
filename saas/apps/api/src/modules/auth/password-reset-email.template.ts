interface PasswordResetTemplateInput {
  productName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export function buildPasswordResetEmail(input: PasswordResetTemplateInput) {
  const subject = `${input.productName} - redefinicao de senha`;
  const explanation = `Recebemos uma solicitacao para redefinir sua senha. O link expira em ${input.expiresInMinutes} minutos.`;
  const ignore = 'Se voce nao solicitou a recuperacao, ignore esta mensagem.';

  return {
    subject,
    text: `${explanation}\n\n${input.resetUrl}\n\n${ignore}`,
    html: `<p>${explanation}</p><p><a href="${input.resetUrl}">Redefinir minha senha</a></p><p>${ignore}</p>`,
  };
}

export function buildAdminInviteEmail(input: {
  productName: string;
  recipientName: string;
  setupUrl: string;
  token: string;
  expiresInMinutes: number;
}) {
  const subject = `${input.productName} - Convite de acesso administrativo`;
  const greeting = `Ola, ${input.recipientName}.`;
  const explanation = `Voce foi cadastrado(a) como administrador(a) no ${input.productName}. Defina sua senha inicial usando o link ou o token abaixo no aplicativo Windows ("Esqueci minha senha" -> "Ja tenho o token"). O convite expira em ${input.expiresInMinutes} minutos.`;
  const ignore = 'Se voce nao esperava este convite, ignore esta mensagem.';

  return {
    subject,
    text: `${greeting}\n\n${explanation}\n\nLink: ${input.setupUrl}\nToken: ${input.token}\n\n${ignore}`,
    html: `<p>${greeting}</p><p>${explanation}</p><p><a href="${input.setupUrl}">Definir senha inicial</a></p><p><strong>Token para o app Windows:</strong> <code>${input.token}</code></p><p>${ignore}</p>`,
  };
}
