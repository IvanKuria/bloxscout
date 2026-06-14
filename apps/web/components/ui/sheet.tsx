"use client"

/**
 * A left-anchored slide-over sheet over `@base-ui/react/dialog`. Used for the
 * AI agent's conversation sidebar on mobile. Light-themed to match the app.
 */
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close
const SheetTitle = DialogPrimitive.Title
const SheetDescription = DialogPrimitive.Description

function SheetContent({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-svh w-[18rem] max-w-[85vw] flex-col border-r border-border bg-background shadow-xl outline-none",
          "transition-transform duration-200 data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetDescription,
}
