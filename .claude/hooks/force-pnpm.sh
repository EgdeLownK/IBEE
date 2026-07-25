#!/bin/bash
# .claude/hooks/force-pnpm.sh
# Intercepte toute commande Bash avant exécution.
# Si elle commence par "npm", bloque et force pnpm.
# Code de sortie 2 = annulation de l'action par Claude Code.
# VOLONTAIRE : parsing du JSON d'entrée via `node`, pas `jq` — `jq` n'est
# installé nulle part dans cet environnement (`jq: command not found`),
# alors que `node` est une dépendance déjà obligatoire du projet (package.json
# racine, `engines.node`).

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | node -e "
let d = '';
process.stdin.on('data', (c) => { d += c; });
process.stdin.on('end', () => {
  try {
    process.stdout.write(JSON.parse(d).tool_input.command || '');
  } catch {
    process.stdout.write('');
  }
});
")

if echo "$COMMAND" | grep -qE '^\s*npm\s'; then
  echo "ERREUR : npm est interdit dans ce projet." >&2
  echo "Réécris la commande avec pnpm. Exemples :" >&2
  echo "  npm install     → pnpm add" >&2
  echo "  npm install -D  → pnpm add -D" >&2
  echo "  npm run dev     → pnpm dev" >&2
  echo "  npm run build   → pnpm build" >&2
  echo "  npx [pkg]       → pnpm dlx [pkg]" >&2
  exit 2
fi

exit 0
