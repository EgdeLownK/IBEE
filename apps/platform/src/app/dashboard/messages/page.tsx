import { MessagesDashboard } from '@/components/dashboard/messages/MessagesDashboard'
import { loadMessagesDashboardData } from '@/lib/load-messages-data'

export default async function MessagesPage() {
  const data = await loadMessagesDashboardData()
  return <MessagesDashboard data={data} />
}
