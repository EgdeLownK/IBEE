---
paths:
  - "supabase/tests/**"
---
# Tests pgTAP

- **Introspection FK fiable : utiliser `pg_constraint` + `pg_get_constraintdef(oid)`, pas la jointure `information_schema.table_constraints`/`key_column_usage`/`constraint_column_usage`.** Cette dernière peut donner un faux négatif sur des contraintes cross-schema (ex. vers `auth.users`), à cause d'une ambiguïté de jointure.
- **`throws_ok()` : la forme à 3 arguments est `(sql, errcode, errmsg)`, pas `(sql, errcode, description)`.** Il n'y a pas de place pour une description personnalisée en dessous de 4 arguments — utiliser `throws_ok(sql, errcode, errmsg, description)` si une description est nécessaire (usage réel vérifié dans `supabase/tests/database/entity_rls.test.sql` et plusieurs autres fichiers du dossier).
- **Rejouer les migrations depuis zéro (`supabase start` + `supabase test db`) est le seul moyen fiable de détecter un réglage posé manuellement en prod et jamais migré** (policy, fonction, GRANT, cron). Toute erreur `function ... does not exist` ou `permission denied for table` dans ce contexte est un signal de dérive, pas un faux positif de test à contourner.
