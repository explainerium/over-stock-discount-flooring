import type { ReactNode } from "react"
import { SiteFooter } from "./_components/SiteFooter"
import { SiteHeader } from "./_components/SiteHeader"

export default function MarketingLayout({ children }: { children: ReactNode }) {
	return (
		<>
			<SiteHeader />
			<main className="flex-1">{children}</main>
			<SiteFooter />
		</>
	)
}
