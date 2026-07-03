import './embed-layout.css'

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <div className="embed-shell bg-neutral-50">{children}</div>
}
