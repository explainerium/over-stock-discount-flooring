"use client"

import { ImagePlusIcon, StarIcon, Trash2Icon } from "lucide-react"
import Image from "next/image"
import { useRef, useState } from "react"
import { useController } from "react-hook-form"
import { FieldShell } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { splitImages, type UpdateProductFormInput } from "@/lib/validation/catalog"
import { signImageUploadAction } from "../../_actions"

/** Cloudinary's own ceiling on the free plan. Checked here so the owner hears it first. */
const MAX_BYTES = 10 * 1024 * 1024

interface CloudinaryReply {
	secure_url?: string
	error?: { message?: string }
}

/**
 * The product's photographs.
 *
 * Still one newline-separated field underneath, which is what the schema and
 * the save action already understand — this only changes how it is edited.
 * Photos upload straight from the browser to Cloudinary (see the integration
 * for why), and only their addresses come back into the form, so nothing is
 * saved until the owner presses Save, the same as every other field.
 *
 * The first photo is the one the catalogue grid, the search results and the
 * share preview use, hence "Make main" rather than drag-to-reorder: there is
 * exactly one position that matters.
 */
export function ProductImages() {
	// A controller rather than setValue, so the field is registered: an
	// unregistered field is left out of the submit and would clear every photo.
	const { field, fieldState } = useController<UpdateProductFormInput, "images">({
		name: "images",
	})
	const images = splitImages(field.value ?? "")
	// The list as of the last change, for an upload that finishes after the
	// owner removed a photo mid-batch.
	const latest = useRef(images)
	const fileInput = useRef<HTMLInputElement>(null)
	const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null)
	const [pasted, setPasted] = useState("")
	const [error, setError] = useState<string | null>(null)

	function save(next: string[]) {
		latest.current = next
		field.onChange(next.join("\n"))
	}

	async function upload(files: File[]) {
		setError(null)
		const tooBig = files.find((file) => file.size > MAX_BYTES)
		if (tooBig) {
			setError(`${tooBig.name} is over 10 MB. Export it smaller and try again.`)
			return
		}

		// One signature covers the whole batch: it signs the folder and the
		// time, not the file, and stays valid for an hour.
		const signed = await signImageUploadAction()
		if (!signed.ok || !signed.data) {
			setError(signed.ok ? "Could not start the upload." : signed.message)
			return
		}
		const { url, fields } = signed.data

		const added: string[] = []
		setUploading({ done: 0, total: files.length })
		try {
			for (const file of files) {
				const body = new FormData()
				body.append("file", file)
				for (const [key, value] of Object.entries(fields)) body.append(key, value)

				const response = await fetch(url, { method: "POST", body })
				const reply = (await response.json().catch(() => ({}))) as CloudinaryReply
				if (!response.ok || !reply.secure_url) {
					setError(reply.error?.message ?? `${file.name} did not upload. Try again.`)
					break
				}
				added.push(reply.secure_url)
				setUploading({ done: added.length, total: files.length })
			}
		} catch {
			setError("The upload was interrupted. Check the connection and try again.")
		} finally {
			// Read the field afresh: the owner may have removed a photo while
			// this batch was still going.
			if (added.length) save([...latest.current, ...added])
			setUploading(null)
			if (fileInput.current) fileInput.current.value = ""
		}
	}

	function addPasted() {
		const url = pasted.trim()
		if (!url) return
		if (!/^(\/|https?:\/\/)/.test(url)) {
			setError("A pasted address should start with https:// or /.")
			return
		}
		setError(null)
		save([...images, url])
		setPasted("")
	}

	return (
		<FieldShell
			name="images"
			label="Photos"
			description="The first photo is the main one, used in the catalogue and search results. JPG, PNG or WebP, up to 10 MB each."
			error={error ?? fieldState.error?.message}
		>
			<div className="grid gap-3">
				{images.length > 0 ? (
					<ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
						{images.map((src, index) => (
							<li key={`${src}-${index}`} className="grid gap-1.5">
								<div className="bg-muted relative aspect-square overflow-hidden rounded border">
									<Image
										src={src}
										alt=""
										fill
										sizes="160px"
										className="object-cover"
									/>
									{index === 0 && (
										<span className="bg-foreground text-background absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase">
											Main
										</span>
									)}
								</div>
								<div className="flex gap-1">
									{index > 0 && (
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="flex-1"
											onClick={() =>
												save([src, ...images.filter((_, i) => i !== index)])
											}
										>
											<StarIcon aria-hidden />
											Make main
										</Button>
									)}
									<Button
										type="button"
										variant="outline"
										size="sm"
										aria-label={`Remove photo ${index + 1}`}
										className={index === 0 ? "flex-1" : undefined}
										onClick={() => save(images.filter((_, i) => i !== index))}
									>
										<Trash2Icon aria-hidden />
										{index === 0 && "Remove"}
									</Button>
								</div>
							</li>
						))}
					</ul>
				) : (
					<p className="text-muted-foreground rounded border border-dashed p-6 text-center text-sm">
						No photos yet.
					</p>
				)}

				<div className="flex flex-wrap items-center gap-2">
					<input
						ref={fileInput}
						type="file"
						accept="image/jpeg,image/png,image/webp"
						multiple
						className="sr-only"
						id="product-photo-upload"
						onChange={(event) => {
							const files = Array.from(event.target.files ?? [])
							if (files.length) void upload(files)
						}}
					/>
					<Button
						type="button"
						variant="secondary"
						disabled={uploading !== null}
						onClick={() => fileInput.current?.click()}
					>
						<ImagePlusIcon aria-hidden />
						{uploading
							? `Uploading ${Math.min(uploading.done + 1, uploading.total)} of ${uploading.total}…`
							: "Add photos"}
					</Button>

					<div className="flex min-w-0 flex-1 gap-2">
						<Input
							value={pasted}
							onChange={(event) => setPasted(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									event.preventDefault()
									addPasted()
								}
							}}
							placeholder="…or paste an image address"
							aria-label="Image address"
							className="min-w-0"
						/>
						<Button type="button" variant="outline" onClick={addPasted}>
							Add
						</Button>
					</div>
				</div>
			</div>
		</FieldShell>
	)
}
