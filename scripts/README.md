# Scripts de administração

## ⚠️ ATENÇÃO — SEGURANÇA

O arquivo `serviceAccountKey.json` **NUNCA deve ser commitado**.
Ele dá acesso administrativo total ao Firebase. Mantenha-o apenas localmente.

Se você o expôs acidentalmente:
1. Acesse Google Cloud Console → IAM → Service Accounts → delete key
2. Gere uma nova chave e salve fora do repositório
3. Execute `git filter-branch` para limpar o histórico

## Promover usuário a admin

1. Gere a chave de serviço localmente em `scripts/serviceAccountKey.json`
2. Execute:
```bash
node scripts/set-admin.js <uid-do-usuario>
```

O UID está em: Firebase Console → Authentication → Users
