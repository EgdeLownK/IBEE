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
          status: string,
          incurred_at: string,
          created_at: string,
          updated_at: string,
        },
        Insert: {
          id?: string,
          entity_id: string,
          amount_cents: number,
          description: string,
          status?: string,
          incurred_at?: string,
          created_at?: string,
          updated_at?: string,
        },
        Update: {
          id?: string,
          entity_id?: string,
          amount_cents?: number,
          description?: string,
          status?: string,
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
      },
      entity_job_offers: {
        Row: {
          id: string,
          entity_id: string,
          title: string,
          contract_type: Database["public"]["Enums"]["entity_job_contract_type"],
          status: Database["public"]["Enums"]["entity_job_status_v2"],
          location_type: Database["public"]["Enums"]["entity_job_location_type"],
          location_text: string | null,
          blocks: Json,
          compensation_type: Database["public"]["Enums"]["entity_job_comp_type"] | null,
          compensation_amount: number | null,
          compensation_frequency: Database["public"]["Enums"]["entity_job_comp_freq"] | null,
          apply_url: string | null,
          created_at: string,
          updated_at: string,
        },
        Insert: {
          id?: string,
          entity_id: string,
          title: string,
          contract_type: Database["public"]["Enums"]["entity_job_contract_type"],
          status?: Database["public"]["Enums"]["entity_job_status_v2"],
          location_type?: Database["public"]["Enums"]["entity_job_location_type"],
          location_text?: string | null,
          blocks?: Json,
          compensation_type?: Database["public"]["Enums"]["entity_job_comp_type"] | null,
          compensation_amount?: number | null,
          compensation_frequency?: Database["public"]["Enums"]["entity_job_comp_freq"] | null,
          apply_url?: string | null,
          created_at?: string,
          updated_at?: string,
        },
        Update: {
          id?: string,
          entity_id?: string,
          title?: string,
          contract_type?: Database["public"]["Enums"]["entity_job_contract_type"],
          status?: Database["public"]["Enums"]["entity_job_status_v2"],
          location_type?: Database["public"]["Enums"]["entity_job_location_type"],
          location_text?: string | null,
          blocks?: Json,
          compensation_type?: Database["public"]["Enums"]["entity_job_comp_type"] | null,
          compensation_amount?: number | null,
          compensation_frequency?: Database["public"]["Enums"]["entity_job_comp_freq"] | null,
          apply_url?: string | null,
          created_at?: string,
          updated_at?: string,
        },
        Relationships: [
          {
            foreignKeyName: "entity_job_offers_entity_id_fkey",
            columns: ["entity_id"],
            isOneToOne: false,
            referencedRelation: "entity",
            referencedColumns: ["id"],
          }
        ]
      },
      entity_job_applications: {
        Row: {
          id: string,
          offer_id: string,
          first_name: string,
          last_name: string,
          email: string,
          phone: string | null,
          message: string | null,
          resume_url: string | null,
          status: Database["public"]["Enums"]["entity_job_application_status"],
          created_at: string,
          updated_at: string,
          location: string | null,
          experience_years: number | null,
          education_level: string | null,
          skills: string[] | null,
          is_archived: boolean,
          gender: string | null,
        },
        Insert: {
          id?: string,
          offer_id: string,
          first_name: string,
          last_name: string,
          email: string,
          phone?: string | null,
          message?: string | null,
          resume_url?: string | null,
          status?: Database["public"]["Enums"]["entity_job_application_status"],
          created_at?: string,
          updated_at?: string,
          location?: string | null,
          experience_years?: number | null,
          education_level?: string | null,
          skills?: string[] | null,
          is_archived?: boolean,
          gender?: string | null,
        },
        Update: {
          id?: string,
          offer_id?: string,
          first_name?: string,
          last_name?: string,
          email?: string,
          phone?: string | null,
          message?: string | null,
          resume_url?: string | null,
          status?: Database["public"]["Enums"]["entity_job_application_status"],
          created_at?: string,
          updated_at?: string,
          location?: string | null,
          experience_years?: number | null,
          education_level?: string | null,
          skills?: string[] | null,
          is_archived?: boolean,
          gender?: string | null,
        },
        Relationships: [
          {
            foreignKeyName: "entity_job_apps_offer_id_fkey",
            columns: ["offer_id"],
            isOneToOne: false,
            referencedRelation: "entity_job_offers",
            referencedColumns: ["id"],
          }
        ]
      },`

const enumsToInject = `
      entity_job_application_status: "new" | "shortlisted" | "interviewing" | "hired" | "rejected",
      entity_job_status_v2: "active" | "inactive",
      entity_job_contract_type: "cdi" | "cdd" | "mission",
      entity_job_location_type: "remote" | "onsite" | "hybrid",
      entity_job_comp_type: "fixed" | "percentage",
      entity_job_comp_freq: "weekly" | "monthly" | "mission",
`

// Because types.ts generated from remote already has entity_job_offers, we must REMOVE it before injecting our updated one.
content = content.replace(/entity_job_offers: \{\s+Row: \{[\s\S]*?\}\s*\]\s*\}/m, '')

if (!content.includes('entity_job_applications: {')) {
  content = content.replace('    Tables: {', '    Tables: {\\n' + tablesToInject)
}

if (!content.includes('entity_job_status_v2:')) {
  content = content.replace('    Enums: {', '    Enums: {\\n' + enumsToInject)
}

fs.writeFileSync(typesFile, content, 'utf8')
console.log('types.ts patched successfully.')
