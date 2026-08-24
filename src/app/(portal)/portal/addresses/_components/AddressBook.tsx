"use client"

import { PlusIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { accessorialsOf, addressLines, addressName } from "@/server/domain/addresses"
import { archiveAddressAction, setDefaultAddressAction } from "../_actions"
import { AddressForm } from "./AddressForm"

export interface AddressCard {
	id: string
	label: string | null
	line1: string
	line2: string | null
	city: string
	state: string
	zip: string
	isResidential: boolean
	needsLiftgate: boolean
	limitedAccess: boolean
	isDefault: boolean
}

/**
 * The address book.
 *
 * One card per place, with the accessorials shown as plain labels underneath.
 * Those three flags are the difference between a $250 delivery and a $400 one,
 * so they are stated on the card rather than hidden behind an edit screen.
 */
export function AddressBook({ addresses }: { addresses: AddressCard[] }) {
	const [adding, setAdding] = useState(addresses.length === 0)
	const [editing, setEditing] = useState<string | null>(null)
	const [pending, startTransition] = useTransition()

	function makeDefault(addressId: string) {
		startTransition(async () => {
			const result = await setDefaultAddressAction({ addressId })
			if (result.ok) toast.success(result.message)
			else toast.error(result.message)
		})
	}

	function archive(addressId: string) {
		startTransition(async () => {
			const result = await archiveAddressAction({ addressId })
			if (result.ok) toast.success(result.message)
			else toast.error(result.message)
		})
	}

	return (
		<div className="grid gap-6">
			{addresses.length > 0 && (
				<ul className="grid gap-3">
					{addresses.map((address) => {
						const extras = accessorialsOf(address)

						return (
							<li key={address.id}>
								<Card>
									<CardContent className="grid gap-4 py-5">
										{editing === address.id ? (
											<>
												<AddressForm
													address={{
														id: address.id,
														label: address.label ?? "",
														line1: address.line1,
														line2: address.line2 ?? "",
														city: address.city,
														state: address.state,
														zip: address.zip,
														isResidential: address.isResidential,
														needsLiftgate: address.needsLiftgate,
														limitedAccess: address.limitedAccess,
													}}
													onDone={() => setEditing(null)}
												/>
												<Button
													variant="ghost"
													className="justify-self-start"
													onClick={() => setEditing(null)}
												>
													Cancel
												</Button>
											</>
										) : (
											<>
												<div className="flex flex-wrap items-start justify-between gap-3">
													<div>
														<p className="font-medium">
															{addressName(address)}
															{address.isDefault && (
																<span className="text-muted-foreground ml-2 text-xs tracking-widest uppercase">
																	Default
																</span>
															)}
														</p>
														<address className="text-muted-foreground mt-1 text-sm not-italic">
															{addressLines(address).map((line) => (
																<span key={line} className="block">
																	{line}
																</span>
															))}
														</address>
														{extras.length > 0 && (
															<p className="mt-2 text-xs">
																{extras.join(" · ")}
															</p>
														)}
													</div>

													<div className="flex flex-wrap gap-2">
														<Button
															variant="outline"
															size="sm"
															onClick={() => setEditing(address.id)}
															disabled={pending}
														>
															Edit
														</Button>
														{!address.isDefault && (
															<Button
																variant="ghost"
																size="sm"
																onClick={() =>
																	makeDefault(address.id)
																}
																disabled={pending}
															>
																Make default
															</Button>
														)}
													</div>
												</div>

												{addresses.length > 1 && (
													<button
														type="button"
														onClick={() => archive(address.id)}
														disabled={pending}
														className="text-muted-foreground hover:text-destructive justify-self-start text-xs underline-offset-4 hover:underline disabled:opacity-50"
													>
														Remove this address
													</button>
												)}
											</>
										)}
									</CardContent>
								</Card>
							</li>
						)
					})}
				</ul>
			)}

			{adding ? (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">New address</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4">
						<AddressForm onDone={() => setAdding(false)} />
						{addresses.length > 0 && (
							<Button
								variant="ghost"
								className="justify-self-start"
								onClick={() => setAdding(false)}
							>
								Cancel
							</Button>
						)}
					</CardContent>
				</Card>
			) : (
				<Button
					variant="outline"
					className="justify-self-start"
					onClick={() => setAdding(true)}
				>
					<PlusIcon aria-hidden />
					Add an address
				</Button>
			)}
		</div>
	)
}
