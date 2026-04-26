// firebase-messaging-sw.js
// ⚠️  Este arquivo é público — NÃO coloque segredos aqui.
//     A apiKey do Firebase é segura no SW (é uma chave pública de identificação,
//     protegida pelas Security Rules do Firebase).

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey:            'AIzaSyCTKcsrm1VPLPj6khwNl8sVQ4MTaFs1l-8',
  authDomain:        'omnex-d9b3e.firebaseapp.com',
  databaseURL:       'https://omnex-d9b3e-default-rtdb.firebaseio.com',
  projectId:         'omnex-d9b3e',
  storageBucket:     'omnex-d9b3e.firebasestorage.app',
  messagingSenderId: '999936989485',
  appId:             '1:999936989485:web:911ebdba510058fd3cdba4',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'Radar Urbano'
  const body  = payload.notification?.body  || ''
  const icon  = '/icon-192.png'
  const badge = '/icon-192.png'
  const data  = payload.data || {}

  self.registration.showNotification(title, {
    body,
    icon,
    badge,
    vibrate: [200, 100, 200],
    data,
    actions: [
      { action: 'open', title: 'Ver no mapa' },
    ],
  })
})

// Ao clicar na notificação, abre o app
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.action === 'open' || !event.action ? '/' : '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client)
          return client.focus()
      }
      return clients.openWindow(url)
    })
  )
})
