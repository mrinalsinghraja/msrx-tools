"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as SliderPrimitive from "@radix-ui/react-slider";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { Check, ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The shared control set. Everything the auto-rendered options panel needs, in
 * one file — 139 tools share these, so they are worth getting right once.
 */

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  // Accent as a fill with white text: the deep tone, never the bright one.
  primary: "bg-pen-new text-on-pen hover:bg-pen-deep",
  secondary: "bg-sheet text-graphite border border-construction hover:border-construction-strong shadow-raise",
  ghost: "text-graphite-soft hover:text-graphite hover:bg-sunk",
  danger: "bg-pen-rev-wash text-pen-rev border border-pen-rev/30 hover:border-pen-rev/60",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "disabled:pointer-events-none disabled:opacity-45",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Label & field wrapper                                               */
/* ------------------------------------------------------------------ */

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn("text-[13px] font-medium text-graphite leading-tight", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  help,
  htmlFor,
  children,
  inline = false,
}: {
  label: string;
  help?: string;
  htmlFor?: string;
  children: React.ReactNode;
  inline?: boolean;
}) {
  return (
    <div className={cn("flex gap-2", inline ? "items-center justify-between" : "flex-col")}>
      <div className={cn(inline && "min-w-0 flex-1")}>
        <Label htmlFor={htmlFor}>{label}</Label>
        {help ? <p className="mt-1 text-xs leading-snug text-graphite-faint">{help}</p> : null}
      </div>
      <div className={cn(inline ? "shrink-0" : "w-full")}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Text inputs                                                         */
/* ------------------------------------------------------------------ */

const INPUT_BASE =
  "w-full rounded-md border border-construction bg-sheet px-3 text-sm text-graphite placeholder:text-graphite-faint " +
  "transition-colors hover:border-construction-strong focus:border-pen-new";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(INPUT_BASE, "h-9", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(INPUT_BASE, "py-2 font-mono text-[13px] leading-relaxed", className)} {...props} />;
}

/* ------------------------------------------------------------------ */
/* Select                                                              */
/* ------------------------------------------------------------------ */

export function Select({
  value,
  onValueChange,
  choices,
  id,
  className,
  ariaLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  choices: { value: string; label: string }[];
  id?: string;
  className?: string;
  /** For a select with no visible label of its own, such as a unit picker. */
  ariaLabel?: string;
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-construction bg-sheet px-3",
          "text-left text-sm text-graphite transition-colors hover:border-construction-strong",
          className,
        )}
      >
        <SelectPrimitive.Value className="truncate" />
        <SelectPrimitive.Icon>
          <ChevronDown className="size-4 shrink-0 text-graphite-faint" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-72 min-w-(--radix-select-trigger-width) overflow-hidden rounded-md border border-construction bg-sheet shadow-float"
        >
          <SelectPrimitive.Viewport className="p-1">
            {choices.map((choice) => (
              <SelectPrimitive.Item
                key={choice.value}
                value={choice.value}
                className="relative flex cursor-default select-none items-center gap-2 rounded px-2 py-1.5 pr-7 text-sm text-graphite outline-none data-[highlighted]:bg-sunk"
              >
                <SelectPrimitive.ItemText>{choice.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2">
                  <Check className="size-3.5 text-pen-new" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/* ------------------------------------------------------------------ */
/* Slider & switch                                                     */
/* ------------------------------------------------------------------ */

export function Slider({
  value,
  onValueChange,
  min,
  max,
  step,
  id,
}: {
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  id?: string;
}) {
  return (
    <SliderPrimitive.Root
      id={id}
      value={[value]}
      onValueChange={([next]) => onValueChange(next)}
      min={min}
      max={max}
      step={step}
      className="relative flex h-5 w-full touch-none select-none items-center"
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-sunk ring-1 ring-inset ring-construction">
        <SliderPrimitive.Range className="absolute h-full bg-pen-fill" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label="Value"
        className="block size-4 rounded-full border-2 border-pen-new bg-sheet shadow-raise transition-transform hover:scale-110"
      />
    </SliderPrimitive.Root>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  id,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
}) {
  return (
    <SwitchPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full border transition-colors",
        checked ? "border-pen-new bg-pen-new" : "border-construction bg-sunk",
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "block size-3.5 rounded-full bg-sheet shadow-raise transition-transform",
          checked ? "translate-x-4.5" : "translate-x-0.5",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

/* ------------------------------------------------------------------ */
/* Small display pieces                                                */
/* ------------------------------------------------------------------ */

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-graphite-faint">{label}</dt>
      <dd className="mt-0.5 truncate font-mono text-[13px] text-graphite">{value}</dd>
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "error";
  children: React.ReactNode;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "rounded-md border px-3 py-2 text-[13px] leading-relaxed",
        tone === "error"
          ? "border-pen-rev/30 bg-pen-rev-wash text-pen-rev"
          : "border-construction bg-sunk text-graphite-soft",
      )}
    >
      {children}
    </p>
  );
}
