---
paths:
  - ".mcp.json"
  - ".mcp.json.example"
---
# Configuration MCP

`.mcp.json` n'est pas committé (voir `.mcp.json.example` pour le template).
Pour configurer : copier `.mcp.json.example` vers `.mcp.json`, puis définir les
variables d'environnement système `SUPABASE_ACCESS_TOKEN`,
`GITHUB_PERSONAL_ACCESS_TOKEN`, `OBSIDIAN_API_KEY`. Le fichier `.mcp.json` résout
les références `${VAR}` depuis l'environnement au démarrage de Claude Code.
