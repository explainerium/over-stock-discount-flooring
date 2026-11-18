"use client"

import Image from "next/image"
import { useState } from "react"
import { cn } from "@/lib/utils"

/**
 * The product photographs: one large, the rest as thumbnails beneath.
 *
 * The client's sheet gives most products a swatch and one or more room shots,
 * and a page that only ever showed the first left the room shots unseen. A
 * single image renders exactly as it did before, with no thumbnail row.
 */
export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
	const [active, setActive] = useState(0)
	const current = images[active] ?? images[0]

	return (
		<div>
			<div className="border-rule bg-band relative aspect-[4/5] border">
				{current && (
					<Image
						src={current}
						alt={alt}
						fill
						priority
						sizes="(min-width: 1024px) 50vw, 100vw"
						className="object-cover"
					/>
				)}
			</div>

			{images.length > 1 && (
				<ul className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
					{images.map((src, index) => (
						<li key={src}>
							<button
								type="button"
								onClick={() => setActive(index)}
								aria-label={`Show photo ${index + 1} of ${images.length}`}
								aria-pressed={index === active}
								className={cn(
									"bg-band relative block aspect-square w-full border transition-opacity",
									index === active
										? "border-ink"
										: "border-rule opacity-70 hover:opacity-100",
								)}
							>
								<Image
									src={src}
									alt=""
									fill
									sizes="120px"
									className="object-cover"
								/>
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
