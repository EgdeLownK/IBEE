import fs from 'fs'

const typesFile = 'packages/supabase/src/types.ts'
let content = fs.readFileSync(typesFile, 'utf8')

// Update Enum
content = content.replace(
  /entity_job_application_status:.*?(\r?\n)*.*?entity_job_status_v2/s,
  `entity_job_application_status: "new" | "shortlisted" | "interviewing" | "hired" | "rejected"\n      entity_job_status_v2`
)

// Update Row
content = content.replace(
  /updated_at: string(\r?\n\s+)}/g,
  `updated_at: string
          location: string | null
          experience_years: number | null
          education_level: string | null
          skills: string[] | null
          is_archived: boolean
          gender: string | null
        }`
)

// Update Insert
content = content.replace(
  /updated_at\?: string(\r?\n\s+)}/g,
  `updated_at?: string
          location?: string | null
          experience_years?: number | null
          education_level?: string | null
          skills?: string[] | null
          is_archived?: boolean
          gender?: string | null
        }`
)

// Since Update is the same as Insert in structure here, but using regex with global flag `g` updates both Insert and Update.

fs.writeFileSync(typesFile, content, 'utf8')
console.log('types.ts patched successfully.')
