"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Button } from "@/shared/components/ui/button";
import { Card, CardBody } from "@/shared/components/ui/card";
import { TextField } from "@/shared/components/ui/text-field";

import type { Sale } from "../types/sales.types";

import { SaleDetail } from "./sale-detail";

/**
 * Finds one receipt by the number printed on the customer's copy.
 *
 * <p>The reason this sits beside the day's list rather than inside it: a
 * customer coming back with a receipt does not know which day they bought it,
 * and asking somebody to guess the date before they can find an invoice is the
 * kind of small obstacle that ends with a refund given without a record.
 *
 * <p>The number goes into the URL, so a found receipt can be linked to — useful
 * when the person at the counter and the person who can void a sale are not the
 * same person.
 */
export function InvoiceLookup({
  invoice,
  sale,
}: {
  /** The number currently being looked up, from the URL. */
  invoice: string;
  /** What was found, null when nothing matched, undefined when not searched. */
  sale: Sale | null | undefined;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [draft, setDraft] = React.useState(invoice);

  // The URL is the source of truth; a back navigation has to move the field.
  React.useEffect(() => {
    setDraft(invoice);
  }, [invoice]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    const params = new URLSearchParams(searchParams.toString());
    const value = draft.trim().toUpperCase();

    if (value) params.set("invoice", value);
    else params.delete("invoice");

    router.push(`${pathname}?${params}`);
  };

  return (
    <Card>
      <CardBody className="space-y-4">
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <TextField
            label="Find a receipt by number"
            placeholder="INV-20260903-0042"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="uppercase"
            containerClassName="w-full sm:max-w-80"
          />

          <Button type="submit" size="md">
            <Search aria-hidden className="size-4" />
            Find receipt
          </Button>
        </form>

        {sale === null ? (
          <p className="text-sm text-muted">
            No sale carries the number <strong className="text-ink">{invoice}</strong>.
            Check the receipt — the number runs together the shop&rsquo;s prefix,
            the trading day and a counter, like INV-20260903-0042.
          </p>
        ) : null}
      </CardBody>

      {sale ? <SaleDetail sale={sale} /> : null}
    </Card>
  );
}
