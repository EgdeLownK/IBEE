---
paths:
  - "apps/platform/**/*.{ts,tsx}"
  - "packages/*/src/**/*.{ts,tsx}"
  - "supabase/migrations/**/*.sql"
---
# Commentaires (obligatoire)

Deux lecteurs : Killian (non-développeur) et toute session IA future, qui arrive
sans aucune mémoire des sessions précédentes. Écrire pour celui qui ne sait rien.

- **En-tête de fichier** (tout fichier créé) : rôle en 1-3 lignes. Ajouter ce dont
  le fichier dépend et ce qui casse ailleurs s'il change, quand ce n'est pas évident.
- **Fonction exportée ou non triviale** : but, paramètres importants, retour, plus
  les invariants — ce qui est supposé vrai en entrée, ce qui est garanti en sortie.
- **Logique complexe, workaround, condition métier** : le **pourquoi**, jamais le quoi.
- **Choix délibéré non évident** : le marquer `// VOLONTAIRE : <raison>`. Sans ce
  marqueur, une session future le lit comme un défaut et le « corrige ».
  Idem pour toute suppression de lint : `eslint-disable` sans raison écrite = interdit.
- **Aucun renvoi contextuel** : pas de « cf. discussion », pas de date, pas de
  « temporaire » sans la condition de retrait. Un commentaire doit rester vrai lu
  seul, dans six mois, par quelqu'un qui n'était pas là.
- **Source de vérité** : quand la règle vit ailleurs (migration, `.claude/rules/`,
  config), donner le chemin exact au lieu de la résumer — un résumé se désynchronise.
- En français, concis. Un commentaire qui paraphrase le code est du bruit : il coûte
  du contexte et se périme. Un commentaire faux est pire qu'absent — mis à jour
  quand le code change.
- S'applique aussi aux sous-agents : l'orchestrateur vérifie que le code délégué
  est commenté.
