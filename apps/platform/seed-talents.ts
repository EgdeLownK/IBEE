import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seed() {
  const entityId = '858b59ec-e035-48c6-82c5-61366232c514'

  // Insert Offer
  const { data: offer, error: offerError } = await supabase
    .from('entity_job_offers')
    .insert({
      entity_id: entityId,
      title: 'Community Manager',
      status: 'active',
      contract_type: 'mission',
      blocks: [],
      location_type: 'remote',
    })
    .select()
    .single()

  if (offerError) {
    console.error('Error creating offer:', offerError)
    return
  }
  console.log('Created offer:', offer.id)

  const locations = [
    'Nantes, France',
    'Paris, France',
    'Lyon, France',
    'Bordeaux, France',
    'Rennes, France',
  ]
  const statuses = ['new', 'shortlisted', 'interviewing', 'hired', 'rejected']

  const applications = Array.from({ length: 25 }).map((_, i) => ({
    offer_id: offer.id,
    first_name: `Candidat`,
    last_name: `${i + 1}`,
    email: `candidat${i + 1}@example.com`,
    age: Math.floor(Math.random() * (60 - 17 + 1)) + 17,
    gender: Math.random() > 0.4 ? 'Femme' : 'Homme', // Bias towards female for CM role context maybe, or random
    location: locations[Math.floor(Math.random() * locations.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    message: 'Je suis très intéressé par cette opportunité.',
  }))

  const { error: appsError } = await supabase.from('entity_job_applications').insert(applications)

  if (appsError) {
    console.error('Error inserting applications:', appsError)
  } else {
    console.log(`Inserted ${applications.length} applications successfully`)
  }
}

seed().catch(console.error)
