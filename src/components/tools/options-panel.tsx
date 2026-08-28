"use client";

import { useId } from "react";

import { Field, Input, Select, Slider, Switch, Textarea } from "@/components/ui/primitives";
import { isOptionVisible } from "@/lib/engines/run";
import { restateMeasure, unitOptions } from "@/lib/units";
import type { OptionSpec, OptionValue, OptionValues } from "@/lib/tools/types";

/**
 * Renders a tool's options from its declarative spec. This is what makes a
 * hundred-plus tools tractable: adding a tool adds data, not a form.
 */
export function OptionsPanel({
  options,
  values,
  onChange,
}: {
  options: OptionSpec[];
  values: OptionValues;
  onChange: (id: string, value: OptionValue) => void;
}) {
  const visible = options.filter((option) => isOptionVisible(option, values));
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {visible.map((option) => (
        <OptionControl key={option.id} option={option} values={values} onChange={onChange} />
      ))}
    </div>
  );
}

function OptionControl({
  option,
  values,
  onChange,
}: {
  option: OptionSpec;
  values: OptionValues;
  onChange: (id: string, value: OptionValue) => void;
}) {
  const controlId = useId();
  const value = values[option.id];

  switch (option.kind) {
    case "toggle":
      return (
        <Field label={option.label} help={option.help} htmlFor={controlId} inline>
          <Switch
            id={controlId}
            checked={Boolean(value)}
            onCheckedChange={(next) => onChange(option.id, next)}
          />
        </Field>
      );

    case "select":
      return (
        <Field label={option.label} help={option.help} htmlFor={controlId}>
          <Select
            id={controlId}
            value={String(value ?? option.default)}
            choices={option.choices}
            onValueChange={(next) => onChange(option.id, next)}
          />
        </Field>
      );

    case "slider":
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={controlId} className="text-[13px] font-medium text-graphite">
              {option.label}
            </label>
            <span className="font-mono text-[13px] text-graphite-soft tabular-nums">
              {Number(value)}
              {option.unit ?? ""}
            </span>
          </div>
          <Slider
            id={controlId}
            value={Number(value)}
            min={option.min}
            max={option.max}
            step={option.step}
            onValueChange={(next) => onChange(option.id, next)}
          />
          {option.help ? <p className="text-xs leading-snug text-graphite-faint">{option.help}</p> : null}
        </div>
      );

    /*
      A quantity and its unit, on one line. There is no metric/imperial switch
      in this product: each measurement carries its own unit, so a height in
      feet and a weight in kilograms — normal in India — is just two answers,
      not a contradiction the person has to resolve first.
    */
    case "measure": {
      const unit = String(values[`${option.id}Unit`] ?? option.units[0]);
      const compound = option.compound && option.compound.whenUnit === unit ? option.compound : null;
      return (
        <Field label={option.label} help={option.help} htmlFor={controlId}>
          <div className="flex items-start gap-2">
            <Input
              id={controlId}
              type="number"
              inputMode="decimal"
              className="min-w-0 flex-1"
              value={String(value ?? "")}
              min={option.min}
              max={option.max}
              step={option.step}
              onChange={(event) => onChange(option.id, event.target.value)}
            />
            {compound ? (
              <Input
                type="number"
                inputMode="decimal"
                aria-label={compound.label}
                className="min-w-0 flex-1"
                value={String(values[`${option.id}Sub`] ?? compound.default)}
                min={0}
                step={option.step}
                onChange={(event) => onChange(`${option.id}Sub`, event.target.value)}
              />
            ) : null}
            <Select
              value={unit}
              ariaLabel={`${option.label} unit`}
              className="w-24 shrink-0"
              choices={unitOptions(option.quantity, option.units)}
              onValueChange={(next) => {
                // Restate the measurement in the new unit rather than leaving
                // the number to mean something else beside it.
                const restated = restateMeasure(
                  option.quantity,
                  Number(values[option.id] ?? option.default),
                  Number(values[`${option.id}Sub`] ?? 0),
                  unit,
                  next,
                );
                onChange(`${option.id}Unit`, next);
                onChange(option.id, restated.amount);
                onChange(`${option.id}Sub`, restated.sub);
              }}
            />
          </div>
          {compound ? (
            <p className="mt-1.5 text-xs text-graphite-faint">
              Feet in the first box, inches in the second.
            </p>
          ) : null}
        </Field>
      );
    }

    case "number":
      return (
        <Field label={option.unit ? `${option.label} (${option.unit.trim()})` : option.label} help={option.help} htmlFor={controlId}>
          <Input
            id={controlId}
            type="number"
            inputMode="decimal"
            value={String(value ?? "")}
            min={option.min}
            max={option.max}
            step={option.step}
            // Kept as a string in state: clearing the box must not snap to 0
            // and fight the user while they retype the number.
            onChange={(event) => onChange(option.id, event.target.value)}
          />
        </Field>
      );

    case "color":
      return (
        <Field label={option.label} help={option.help} htmlFor={controlId}>
          <div className="flex items-center gap-2">
            <input
              id={controlId}
              type="color"
              value={String(value)}
              onChange={(event) => onChange(option.id, event.target.value)}
              className="size-9 cursor-pointer rounded-md border border-construction bg-sheet p-1"
            />
            <Input
              aria-label={`${option.label} hex value`}
              value={String(value)}
              onChange={(event) => onChange(option.id, event.target.value)}
              className="font-mono text-[13px]"
            />
          </div>
        </Field>
      );

    case "textarea":
      return (
        <Field label={option.label} help={option.help} htmlFor={controlId}>
          <Textarea
            id={controlId}
            rows={option.rows ?? 3}
            placeholder={option.placeholder}
            value={String(value ?? "")}
            onChange={(event) => onChange(option.id, event.target.value)}
          />
        </Field>
      );

    case "pageRange":
    case "text":
    default:
      return (
        <Field label={option.label} help={option.help} htmlFor={controlId}>
          <Input
            id={controlId}
            type={"secret" in option && option.secret ? "password" : "text"}
            autoComplete={"secret" in option && option.secret ? "new-password" : undefined}
            autoCorrect={"secret" in option && option.secret ? "off" : undefined}
            spellCheck={"secret" in option && option.secret ? false : undefined}
            placeholder={option.placeholder}
            maxLength={"maxLength" in option ? option.maxLength : undefined}
            value={String(value ?? "")}
            onChange={(event) => onChange(option.id, event.target.value)}
            className={option.id === "pattern" || option.id === "flags" ? "font-mono text-[13px]" : undefined}
          />
        </Field>
      );
  }
}
