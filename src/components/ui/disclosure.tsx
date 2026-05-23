"use client"

import * as React from "react"
import { Collapsible } from "@base-ui/react/collapsible"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

export function Disclosure(props: {
  title: string
  /** Muted one-liner shown under the title when collapsed. */
  summary?: string
  defaultOpen?: boolean
  /** Optional decoration shown in the trigger, e.g. an "optional" pill. */
  badge?: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  const { title, summary, defaultOpen, badge, children } = props

  return (
    <Collapsible.Root
      defaultOpen={defaultOpen}
      className="rounded-xl border border-border bg-surface"
    >
      <Collapsible.Trigger
        className={cn(
          "group/disclosure flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left",
          "rounded-xl text-sm font-medium text-foreground"
        )}
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <span className="truncate">{title}</span>
            {badge}
          </span>
          {summary ? (
            <span className="truncate text-xs font-normal text-muted">
              {summary}
            </span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-muted transition-transform duration-200 ease-(--ease-out-soft)",
            "group-data-[panel-open]/disclosure:rotate-180"
          )}
        />
      </Collapsible.Trigger>
      <Collapsible.Panel keepMounted className="bp-collapsible-panel">
        <div className="px-4 pb-4 text-sm text-foreground">{children}</div>
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}
