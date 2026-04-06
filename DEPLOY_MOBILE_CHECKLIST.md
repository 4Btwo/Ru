# ✅ Checklist — Acesso Mobile (Vercel + Firebase)

## 1. Variáveis de ambiente no Vercel
Acesse: vercel.com → seu projeto → Settings → Environment Variables

Adicione TODAS estas variáveis (valores no seu .env local):
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_DATABASE_URL
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```
⚠️ Após adicionar → clique em **Redeploy** para aplicar.

## 2. Domínio autorizado no Firebase Auth
Acesse: console.firebase.google.com → seu projeto
→ Authentication → Settings → Authorized domains

Adicione:
```
ru-three.vercel.app
```

Sem isso, o login com Google falha silenciosamente no celular.

## 3. Regras do Realtime Database
Acesse: console.firebase.google.com → Realtime Database → Rules

Confirme que as regras permitem leitura/escrita para usuários autenticados:
```json
{
  "rules": {
    ".read":  "auth != null",
    ".write": "auth != null"
  }
}
```

## 4. HTTPS obrigatório
O app PRECISA rodar em HTTPS para:
- Geolocalização funcionar no celular
- Service Worker (PWA) funcionar
- Firebase Auth funcionar

O Vercel já fornece HTTPS automaticamente ✅

## 5. Testar no celular
Após deploy:
1. Abra ru-three.vercel.app no Chrome mobile
2. Toque em "Entrar com Google"
3. Se não redirecionar → limpe cookies do site e tente novamente

## 6. Instalar como PWA (bônus)
No Chrome mobile → menu (⋮) → "Adicionar à tela inicial"
O app abre sem barra do navegador, como app nativo.
