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
  primary: "bg-accent-deep text-white hover:bg-accent-ink shadow-raise",
  secondary: "bg-surface text-ink border border-line hover:border-line-strong shadow-raise",
  ghost: "text-ink-soft hover:text-ink hover:bg-surface-sunk",
  danger: "bg-danger-wash text-danger border border-danger/30 hover:border-danger/60",
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
      className={cn("text-[13px] font-medium text-ink leading-tight", className)}
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
        {help ? <p className="mt-1 text-xs leading-snug text-ink-faint">{help}</p> : null}
      </div>
      <div className={cn(inline ? "shrink-0" : "w-full")}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Text inputs                                                         */
/* ------------------------------------------------------------------ */

const INPUT_BASE =
  "w-full rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-faint " +
  "transition-colors hover:border-line-strong focus:border-accent-deep";

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
}: {
  value: string;
  onValueChange: (value: string) => void;
  choices: { value: string; label: string }[];
  id?: string;
  className?: string;
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        id={id}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-line bg-surface px-3",
          "text-left text-sm text-ink transition-colors hover:border-line-strong",
          className,
        )}
      >
        <SelectPrimitive.Value className="truncate" />
        <SelectPrimitive.Icon>
          <ChevronDown className="size-4 shrink-0 text-ink-faint" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-72 min-w-(--radix-select-trigger-width) overflow-hidden rounded-md border border-line bg-surface shadow-float"
        >
          <SelectPrimitive.Viewport className="p-1">
            {choices.map((choice) => (
              <SelectPrimitive.Item
                key={choice.value}
                value={choice.value}
                className="relative flex cursor-default select-none items-center gap-2 rounded px-2 py-1.5 pr-7 text-sm text-ink outline-none data-[highlighted]:bg-surface-sunk"
              >
                <SelectPrimitive.ItemText>{choice.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2">
                  <Check className="size-3.5 text-accent-ink" />
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
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-surface-sunk ring-1 ring-inset ring-line">
        <SliderPrimitive.Range className="absolute h-full bg-accent" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label="Value"
        className="block size-4 rounded-full border-2 border-accent-deep bg-surface shadow-raise transition-transform hover:scale-110"
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
        checked ? "border-accent-deep bg-accent-deep" : "border-line bg-surface-sunk",
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "block size-3.5 rounded-full bg-surface shadow-raise transition-transform",
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
      <dt className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">{label}</dt>
      <dd className="mt-0.5 truncate font-mono text-[13px] text-ink">{value}</dd>
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
          ? "border-danger/30 bg-danger-wash text-danger"
          : "border-line bg-surface-sunk text-ink-soft",
      )}
    >
      {children}
    </p>
  );
}
