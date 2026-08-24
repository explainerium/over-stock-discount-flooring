import { ExternalLinkIcon, MapPinIcon } from "lucide-react"
import { SHOWROOM } from "@/constants/catalog"

/**
 * Getting to the showroom.
 *
 * A directions link rather than an embedded map, which is a deliberate step
 * away from the plan's wording.
 *
 * Google's keyless embed (`maps?output=embed`) now 301s into the Embed API,
 * whose shell loads but whose tiles never arrived in testing — a frame that
 * spins forever, which is worse on a contact page than no frame at all. The
 * supported embed needs a Maps API key and a Google Cloud billing account the
 * client does not have; that is a decision for him, not a dependency to take
 * on quietly.
 *
 * What a person actually does with a map on a phone is ask for directions from
 * where they are standing, and this link does that in one tap — it opens the
 * native maps app on a phone and Google Maps on a desktop. Swap it for an
 * `<iframe>` the day there is a key.
 */
export function ShowroomMap() {
	const address = `${SHOWROOM.street}, ${SHOWROOM.city}, ${SHOWROOM.state} ${SHOWROOM.zip}`
	const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`

	return (
		<div className="border-rule bg-band border p-8 sm:p-12">
			<div className="flex flex-wrap items-start justify-between gap-6">
				<div className="flex gap-4">
					<MapPinIcon className="text-ink mt-1 size-5 shrink-0" aria-hidden />
					<div>
						<p className="display text-muted-foreground text-xs uppercase">
							The showroom
						</p>
						<address className="text-ink mt-2 text-lg leading-relaxed not-italic">
							{SHOWROOM.street}
							<br />
							{SHOWROOM.city}, {SHOWROOM.state} {SHOWROOM.zip}
						</address>
						<p className="text-muted-foreground mt-3 text-sm">
							{SHOWROOM.weekdays} &middot; {SHOWROOM.saturday}
						</p>
					</div>
				</div>

				<a
					href={directions}
					target="_blank"
					rel="noreferrer noopener"
					className="btn bg-ink text-paper flex items-center gap-2"
				>
					Get directions
					<ExternalLinkIcon className="size-4" aria-hidden />
				</a>
			</div>
		</div>
	)
}
