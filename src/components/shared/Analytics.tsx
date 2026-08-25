import Script from "next/script"

/**
 * GA4.
 *
 * The current site has no analytics of any kind — verified across all ten
 * pages — so there is no baseline to compare a relaunch against. The plan puts
 * this in W0 for that reason: every week without it is a week of history that
 * cannot be recovered later.
 *
 * Loaded only when a measurement id is set and only in production. A developer
 * clicking around localhost should not appear in the client's traffic, and the
 * site has to work with the tag absent — which it will be until he hands over
 * a property.
 *
 * `afterInteractive` rather than `beforeInteractive`: nothing on the page
 * depends on gtag, and a marketing tag should never sit in front of the
 * content it is measuring.
 */
export function Analytics() {
	const id = process.env.GA_MEASUREMENT_ID

	if (!id || process.env.NODE_ENV !== "production") return null

	return (
		<>
			<Script
				src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
				strategy="afterInteractive"
			/>
			<Script id="ga4" strategy="afterInteractive">
				{`
					window.dataLayer = window.dataLayer || [];
					function gtag(){dataLayer.push(arguments);}
					gtag('js', new Date());
					gtag('config', '${id}', {
						anonymize_ip: true
					});
				`}
			</Script>
		</>
	)
}
