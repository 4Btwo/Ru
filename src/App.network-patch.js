// ── PATCH: adicione estas linhas ao src/App.jsx ───────────────────────────────
//
// 1. Imports (no topo do arquivo, junto aos outros imports):

import { useNetworkStatus } from './hooks/useNetworkStatus'
import NetworkBanner        from './components/NetworkBanner'

// 2. Dentro do componente App(), junto aos outros hooks:

const networkStatus = useNetworkStatus()

// 3. No JSX, logo após a abertura do <div> raiz (antes do <MapView>):

<NetworkBanner status={networkStatus} />

// ─────────────────────────────────────────────────────────────────────────────
// Exemplo de como fica no App.jsx (trecho relevante):
//
// export default function App() {
//   ...hooks existentes...
//   const networkStatus = useNetworkStatus()   // ← adicionar aqui
//
//   return (
//     <div style={{ position:'relative', height:'100dvh', ... }}>
//       <NetworkBanner status={networkStatus} />   // ← primeira linha do JSX
//       <MapView ... />
//       ...resto do app...
//     </div>
//   )
// }
