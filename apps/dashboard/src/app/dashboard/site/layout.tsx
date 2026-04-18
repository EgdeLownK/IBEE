import { SiteSidebar } from '@/components/dashboard/SiteSidebar'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row flex-1 min-w-0 h-full">
      <SiteSidebar />
      <div className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
