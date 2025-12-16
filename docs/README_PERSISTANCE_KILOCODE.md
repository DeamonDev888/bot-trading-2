# KiloCode - Utilisation avec Persistance

## 🎯 **RÉSULTAT FINAL**

✅ **LA PERSISTANCE FONCTIONNE !**
KiloCode conserve la mémoire entre les messages lorsqu'on utilise le même `sessionId`.

## 📋 **Commandes de Base**

Pour initialiser une session :

```bash
echo '{"type":"user","content":"Init"}' | kilo -m ask --auto
```

Pour continuer une session :

```bash
echo '{"type":"user","content":"Message"}' | kilo -s SESSION_ID -m ask --auto
```
