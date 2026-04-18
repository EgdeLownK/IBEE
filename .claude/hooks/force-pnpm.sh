#!/bin/bash
# .claude/hooks/force-pnpm.sh
# Intercepte toute commande Bash avant exécution.
# Si elle commence par "npm", bloque et force pnpm.
# Code de sortie 2 = annulation de l'action par Claude Code.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

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
