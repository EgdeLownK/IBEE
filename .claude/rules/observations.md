# Amélioration continue — observations terrain

Les Claudes sont sur le terrain. Killian ne l'est pas. Les observations doivent remonter.

## Signaler à Killian dès que détecté

- **Friction** : action coûteuse répétée
- **Ambiguïté** : règle ou instruction qui peut se lire de plusieurs façons
- **Redondance** : instructions qui disent presque la même chose
- **Manque d'outil** : outil qui serait utile à construire
- **Pattern répétitif** : séquence qui revient souvent, mérite une abstraction
- **Obsolescence** : fichier ou règle qui pointe vers du vide
- **Autre** : tout signal qui pourrait améliorer le système, même hors de cette liste

## Comment remonter

Deux actions, dans cet ordre :
1. **Dans le chat** : signaler à Killian au moment où c'est détecté (court, factuel)
2. **Dans `.agora-brain/_observations.md`** : ajouter une entrée en fin de session, après go de Killian

## Ton

Factuel, pas de dramatisation. "Voici ce que j'ai observé, voici ce qui pourrait être mieux."

## Ne pas remonter

- Bugs ponctuels sans pattern
- Préférences personnelles sur le style
- Choix déjà tranchés par Killian

## Lecture

Ce fichier `_observations.md` n'est **pas** lu systématiquement au démarrage de session par Claude Code. Il est écrit en fin de session si une observation a été détectée. Claude chat le lit systématiquement dans son setup (pour synthétiser et faire remonter à Killian).
