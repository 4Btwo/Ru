/**
 * Script para definir isAdmin=true para um usuário no Firebase Realtime Database.
 * 
 * Como usar:
 *   1. npm install firebase-admin
 *   2. Baixe a chave de serviço: Firebase Console → Project Settings → Service accounts → Generate new private key
 *   3. Salve como serviceAccountKey.json na pasta scripts/
 *   4. node scripts/set-admin.js SEU_UID_AQUI
 *
 * O UID do admin está em src/lib/constants.js → ADMIN_UIDS
 */

const admin = require('firebase-admin')
const path  = require('path')

const uid = process.argv[2]
if (!uid) {
  console.error('Uso: node scripts/set-admin.js <UID>')
  process.exit(1)
}

const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'))

admin.initializeApp({
  credential:  admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL || serviceAccount.databaseURL,
})

admin.database()
  .ref(`users/${uid}`)
  .update({ isAdmin: true })
  .then(() => {
    console.log(`✅ isAdmin=true definido para UID: ${uid}`)
    process.exit(0)
  })
  .catch(err => {
    console.error('❌ Erro:', err.message)
    process.exit(1)
  })
