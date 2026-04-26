# Urbyn 🔴

App de mapa colaborativo em tempo real — bares, trânsito, eventos e hotspots da cidade.

## Stack

- **React 18** + Vite
- **Firebase** — Auth (Google), Realtime Database, Cloud Functions, Hosting, FCM
- **Leaflet** — mapa com tema dark
- **PWA** — instalável, notificações push

---

## Setup local

### 1. Clone e instale

```bash
git clone <repo>
cd urbyn
npm install
cd functions && npm install && cd ..
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais do Firebase Console → Project Settings → Your Apps.

### 3. Rode em desenvolvimento

```bash
npm run dev
```

---

## Deploy

### Pré-requisitos

```bash
npm install -g firebase-tools
firebase login
firebase use omnex-d9b3e   # ou seu project ID
```

### Build + Deploy completo

```bash
npm run build
firebase deploy
```

### Só o Hosting

```bash
npm run build
firebase deploy --only hosting
```

### Só as Functions

```bash
firebase deploy --only functions
```

---

## Estrutura do projeto

```
src/
  App.jsx                  # Componente raiz
  components/
    NetworkBanner.jsx      # Banner offline/erro de conexão
    DetailPanel.jsx        # Painel de detalhes do local
    ReportPanel.jsx        # Painel de reporte
    MapView.jsx            # Mapa Leaflet
    Leaderboard.jsx        # Ranking de usuários
    NowPanel.jsx           # Painel "Agora"
    AddLocationPanel.jsx   # Criar novo local
    LoginScreen.jsx        # Tela de login
    ChatPanel.jsx          # Chat por local
    OwnerPanel.jsx         # Painel do dono do local
  hooks/
    useAuth.js             # Autenticação Google
    useEvents.js           # Eventos em tempo real
    useComments.js         # Comentários por local
    useOnline.js           # Presença de usuários (onDisconnect)
    useNetworkStatus.js    # Status de rede / Firebase
    useNotifications.js    # FCM push notifications
    usePlaces.js           # Locais (seed + custom)
    useGoingTo.js          # "Vou lá"
    useHistory.js          # Histórico de eventos
    useLeaderboard.js      # Ranking
    useOwner.js            # Dados do dono do local
    useChat.js             # Chat em tempo real
  lib/
    firebase.js            # Config Firebase (usa .env)
    constants.js           # Constantes e metadados
    hotspot.js             # Cálculo de heat score
    mapUtils.js            # Utilitários do mapa
    alerts.js              # Sistema de alertas
    cluster.js             # Clustering de marcadores
    share.js               # Compartilhamento (texto)
    shareImage.js          # Compartilhamento (imagem canvas)
    cloudinary.js          # Upload de imagens
    seed.js                # Seed de locais iniciais
  pages/
    PrivacyPolicy.jsx      # Política de privacidade
  index.css                # CSS global + variáveis
  main.jsx                 # Entry point

public/
  manifest.json            # PWA manifest
  firebase-messaging-sw.js # Service Worker FCM
  icon-192.png             # Ícone PWA
  icon-512.png             # Ícone PWA
  favicon.ico              # Favicon
  og-image.png             # Imagem Open Graph (1200x630)

functions/
  index.js                 # Cloud Functions (rate limit, push, cleanup)

firebase.json              # Hosting config (SPA fallback, headers de cache)
firebase-rules.json        # Security Rules do RTDB
.env.example               # Template de variáveis de ambiente
.gitignore                 # Nunca commita .env!
```

---

## Política de privacidade

A página está em `src/pages/PrivacyPolicy.jsx`.

Para disponibilizá-la publicamente (obrigatório para o Google OAuth), adicione a rota no seu app:

```jsx
// Opção A — sem react-router (abre em aba nova)
// No Google Console, use: https://seu-dominio.app/privacidade
// Adicione em public/privacidade.html ou configure uma rota

// Opção B — com react-router-dom
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PrivacyPolicy from './pages/PrivacyPolicy'

<BrowserRouter>
  <Routes>
    <Route path="/"            element={<App />} />
    <Route path="/privacidade" element={<PrivacyPolicy />} />
  </Routes>
</BrowserRouter>
```

Depois, no Google Cloud Console → APIs & Services → OAuth consent screen, adicione:
- **Privacy Policy URL:** `https://seu-dominio.app/privacidade`

---

## Geração do og-image.png

```bash
pip install Pillow
python3 scripts/generate-og-image.py
```

O arquivo é salvo em `public/og-image.png` e incluído automaticamente no build.

---

## Checklist de lançamento

- [x] Firebase configurado (Auth, RTDB, Functions, FCM)
- [x] Security Rules com validação por usuário
- [x] Rate limiting server-side (Cloud Function)
- [x] Variáveis de ambiente (.env)
- [x] PWA manifest + ícones
- [x] Favicon
- [x] Open Graph / Twitter Card
- [x] Service Worker FCM com ação de clique
- [x] firebase.json com SPA fallback e headers de cache
- [x] Banner de erro de rede (offline / firebase-error)
- [x] Política de privacidade
- [ ] Configurar domínio personalizado no Firebase Hosting
- [ ] Adicionar URL da política no Google OAuth consent screen
- [ ] Gerar og-image.png e fazer upload junto com o build
