"use client";

import { LoaderCircle } from "lucide-react";
import * as React from "react";
import { deleteAccount } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * "Delete account" with a confirmation dialog. The destructive work runs in the
 * `deleteAccount` server action, which deletes only the currently authed user
 * and then redirects home — so on success this component simply navigates away.
 */
export function DeleteAccount() {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      const result = await deleteAccount();
      // A successful action redirects (throws NEXT_REDIRECT, never returns).
      // Reaching here with a value means it failed cleanly.
      if (result?.error) {
        setError(result.error);
        setPending(false);
      }
    } catch (e) {
      // Re-throw Next's redirect so navigation proceeds.
      if (
        e &&
        typeof e === "object" &&
        "digest" in e &&
        typeof (e as { digest?: unknown }).digest === "string" &&
        (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
      ) {
        throw e;
      }
      setError("Something went wrong. Try again.");
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="destructive" size="sm" />}
      >
        Delete account
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            This permanently deletes your account and all associated data. This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <DialogClose
            render={<Button type="button" variant="outline" disabled={pending} />}
          >
            Cancel
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={confirm}
            disabled={pending}
          >
            {pending ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete account"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
