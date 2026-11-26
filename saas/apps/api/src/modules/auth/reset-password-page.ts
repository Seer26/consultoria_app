export function renderResetPasswordPage(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Consultoria App - Definir senha</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f4f6f9; color: #1f2937; margin: 0; padding: 24px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 12px; box-shadow: 0 8px 24px rgba(15,23,42,.08); max-width: 440px; width: 100%; padding: 28px; }
    h1 { font-size: 1.25rem; margin: 0 0 8px; }
    p { font-size: 0.92rem; color: #4b5563; margin: 0 0 18px; line-height: 1.45; }
    label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px; }
    input { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; margin-bottom: 14px; }
    button { width: 100%; padding: 11px 16px; border: 0; border-radius: 8px; background: #1d4ed8; color: #fff; font-weight: 600; font-size: 0.95rem; cursor: pointer; }
    button:disabled { opacity: .6; cursor: not-allowed; }
    .msg { margin-top: 14px; padding: 10px 12px; border-radius: 8px; font-size: 0.9rem; display: none; }
    .msg.ok { display: block; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .msg.err { display: block; background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .hint { font-size: 0.8rem; color: #6b7280; margin: -8px 0 14px; }
  </style>
</head>
<body>
  <main class="card">
    <h1>Definir senha de acesso</h1>
    <p>Crie uma senha forte para acessar o Consultoria App no Windows.</p>
    <div id="tokenWrap">
      <label for="token">Token de convite</label>
      <input id="token" type="text" autocomplete="off" placeholder="Cole o token recebido por e-mail" />
    </div>
    <label for="password">Nova senha</label>
    <input id="password" type="password" autocomplete="new-password" />
    <div class="hint">Minimo 12 caracteres, com maiuscula, minuscula, numero e simbolo.</div>
    <label for="confirm">Confirmar nova senha</label>
    <input id="confirm" type="password" autocomplete="new-password" />
    <button id="submitBtn" type="button">Salvar senha</button>
    <div id="feedback" class="msg"></div>
  </main>
  <script>
    (function () {
      var params = new URLSearchParams(window.location.search);
      var urlToken = (params.get('token') || '').trim();
      var tokenInput = document.getElementById('token');
      var tokenWrap = document.getElementById('tokenWrap');
      if (urlToken) {
        tokenInput.value = urlToken;
        tokenWrap.style.display = 'none';
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
      var btn = document.getElementById('submitBtn');
      var feedback = document.getElementById('feedback');
      function show(ok, text) {
        feedback.className = 'msg ' + (ok ? 'ok' : 'err');
        feedback.textContent = text;
      }
      btn.addEventListener('click', async function () {
        var token = tokenInput.value.trim();
        var pw = document.getElementById('password').value;
        var confirm = document.getElementById('confirm').value;
        if (!token) return show(false, 'Informe o token de convite.');
        if (pw.length < 12) return show(false, 'A senha deve ter ao menos 12 caracteres.');
        if (pw !== confirm) return show(false, 'As senhas nao conferem.');
        btn.disabled = true;
        try {
          var res = await fetch('/auth/password/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token, newPassword: pw })
          });
          var data = await res.json().catch(function () { return {}; });
          if (!res.ok) {
            show(false, data.message || data.error || 'Nao foi possivel definir a senha.');
          } else {
            show(true, (data.message || 'Senha definida com sucesso.') + ' Voce ja pode entrar no aplicativo Windows.');
            btn.style.display = 'none';
          }
        } catch (e) {
          show(false, 'Erro de conexao. Tente novamente.');
        } finally {
          btn.disabled = false;
        }
      });
    })();
  </script>
</body>
</html>`;
}
