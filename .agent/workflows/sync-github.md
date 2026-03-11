---
description: Sincronizar alterações locais com o repositório GitHub (Top Brasil)
---

// turbo-all

Este workflow deve ser executado proativamente após qualquer modificação significativa nos arquivos do projeto.

1. Adicionar todas as alterações
```powershell
git add .
```

2. Criar um commit descritivo
O commit deve resumir brevemente o que foi feito na tarefa atual.
```powershell
git commit -m "update: sincronização automática após alterações"
```

3. Enviar para o GitHub
O repositório está configurado com a branch `master`.
```powershell
git push origin master
```
