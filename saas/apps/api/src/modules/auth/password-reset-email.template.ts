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
