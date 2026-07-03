import fs from 'fs'

const typesFile = 'packages/supabase/src/types.ts'
let content = fs.readFileSync(typesFile, 'utf8')

const tablesToInject = `
      entity_expenses: {
        Row: {
          id: string,
          entity_id: string,
          amount_cents: number,
          description: string,
          status: Database["public"]["Enums"]["entity_expense_status"],
          incurred_at: string,
          created_at: string,
          updated_at: string,
        },
        Insert: {
          id?: string,
          entity_id: string,
          amount_cents: number,
          description: string,
          status?: Database["public"]["Enums"]["entity_expense_status"],
          incurred_at?: string,
          created_at?: string,
          updated_at?: string,
        },
        Update: {
          id?: string,
          entity_id?: string,
          amount_cents?: number,
          description?: string,
          status?: Database["public"]["Enums"]["entity_expense_status"],
          incurred_at?: string,
          created_at?: string,
          updated_at?: string,
        },
        Relationships: [
          {
            foreignKeyName: "entity_expenses_entity_id_fkey",
            columns: ["entity_id"],
            isOneToOne: false,
            referencedRelation: "entity",
            referencedColumns: ["id"],
          }
        ]
      },`

const enumsToInject = `
      entity_expense_status: "pending" | "paid" | "cancelled",
`

const publicIdx = content.indexOf('  public: {')
if (publicIdx !== -1) {
    const tablesIdx = content.indexOf('Tables: {', publicIdx)
    if (tablesIdx !== -1) {
        content = content.slice(0, tablesIdx + 9) + '\n' + tablesToInject + content.slice(tablesIdx + 9)
    }
    
    const enumsIdx = content.indexOf('Enums: {', publicIdx)
    if (enumsIdx !== -1) {
        content = content.slice(0, enumsIdx + 8) + '\n' + enumsToInject + content.slice(enumsIdx + 8)
    }
}

fs.writeFileSync(typesFile, content, 'utf8')
console.log('types.ts patched successfully.')
