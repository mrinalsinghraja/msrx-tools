import { ToolError } from "@/lib/engines/types";

/**
 * The unit tables, shared by the engine and the tool registry.
 *
 * This lives outside the engine on purpose. The Unit Converter used to declare
 * its "from" and "to" as free text defaulting to metres and feet, so choosing
 * any quantity other than length produced an error until you also happened to
 * type a valid unit for it. The fix is for the registry to offer only the units
 * that exist for the chosen quantity — which means the option list and the
 * conversion table have to be the same table, or they drift apart again.
 */

/** Factor to the quantity's base unit: metres, kilograms, m², litres, and so on. */
export const UNITS: Record<string, Record<string, { factor: number; label: string }>> = {
  length: {
    nm: { factor: 1e-9, label: "nanometre" },
    mm: { factor: 0.001, label: "millimetre" },
    cm: { factor: 0.01, label: "centimetre" },
    m: { factor: 1, label: "metre" },
    km: { factor: 1000, label: "kilometre" },
    in: { factor: 0.0254, label: "inch" },
    ft: { factor: 0.3048, label: "foot" },
    yd: { factor: 0.9144, label: "yard" },
    mi: { factor: 1609.344, label: "mile" },
    nmi: { factor: 1852, label: "nautical mile" },
  },
  mass: {
    mg: { factor: 1e-6, label: "milligram" },
    g: { factor: 0.001, label: "gram" },
    kg: { factor: 1, label: "kilogram" },
    t: { factor: 1000, label: "tonne" },
    oz: { factor: 0.028349523125, label: "ounce" },
    lb: { factor: 0.45359237, label: "pound" },
    st: { factor: 6.35029318, label: "stone" },
  },
  area: {
    "mm2": { factor: 1e-6, label: "square millimetre" },
    "cm2": { factor: 1e-4, label: "square centimetre" },
    "m2": { factor: 1, label: "square metre" },
    "km2": { factor: 1e6, label: "square kilometre" },
    ha: { factor: 10_000, label: "hectare" },
    acre: { factor: 4046.8564224, label: "acre" },
    "ft2": { factor: 0.09290304, label: "square foot" },
    "yd2": { factor: 0.83612736, label: "square yard" },
  },
  volume: {
    ml: { factor: 0.001, label: "millilitre" },
    l: { factor: 1, label: "litre" },
    "m3": { factor: 1000, label: "cubic metre" },
    tsp: { factor: 0.00492892159375, label: "teaspoon (US)" },
    tbsp: { factor: 0.01478676478125, label: "tablespoon (US)" },
    cup: { factor: 0.2365882365, label: "cup (US)" },
    pt: { factor: 0.473176473, label: "pint (US)" },
    qt: { factor: 0.946352946, label: "quart (US)" },
    gal: { factor: 3.785411784, label: "gallon (US)" },
    impgal: { factor: 4.54609, label: "gallon (imperial)" },
  },
  speed: {
    "m/s": { factor: 1, label: "metre per second" },
    "km/h": { factor: 0.2777777778, label: "kilometre per hour" },
    mph: { factor: 0.44704, label: "mile per hour" },
    kn: { factor: 0.5144444444, label: "knot" },
  },
  data: {
    B: { factor: 1, label: "byte" },
    KB: { factor: 1000, label: "kilobyte" },
    MB: { factor: 1e6, label: "megabyte" },
    GB: { factor: 1e9, label: "gigabyte" },
    TB: { factor: 1e12, label: "terabyte" },
    KiB: { factor: 1024, label: "kibibyte" },
    MiB: { factor: 1024 ** 2, label: "mebibyte" },
    GiB: { factor: 1024 ** 3, label: "gibibyte" },
    TiB: { factor: 1024 ** 4, label: "tebibyte" },
  },
  time: {
    ms: { factor: 0.001, label: "millisecond" },
    s: { factor: 1, label: "second" },
    min: { factor: 60, label: "minute" },
    h: { factor: 3600, label: "hour" },
    d: { factor: 86_400, label: "day" },
    wk: { factor: 604_800, label: "week" },
    yr: { factor: 31_557_600, label: "year (365.25 days)" },
  },
  pressure: {
    Pa: { factor: 1, label: "pascal" },
    kPa: { factor: 1000, label: "kilopascal" },
    bar: { factor: 100_000, label: "bar" },
    psi: { factor: 6894.757293168, label: "pound per square inch" },
    atm: { factor: 101_325, label: "atmosphere" },
    mmHg: { factor: 133.322387415, label: "millimetre of mercury" },
  },
  energy: {
    J: { factor: 1, label: "joule" },
    kJ: { factor: 1000, label: "kilojoule" },
    cal: { factor: 4.184, label: "calorie" },
    kcal: { factor: 4184, label: "kilocalorie" },
    Wh: { factor: 3600, label: "watt hour" },
    kWh: { factor: 3_600_000, label: "kilowatt hour" },
  },
};

/** Temperature is affine, not a simple ratio, so it gets its own path. */
const TEMPERATURE = ["C", "F", "K"] as const;

function toCelsius(value: number, unit: string): number {
  if (unit === "F") return (value - 32) * (5 / 9);
  if (unit === "K") return value - 273.15;
  return value;
}

function fromCelsius(celsius: number, unit: string): number {
  if (unit === "F") return celsius * (9 / 5) + 32;
  if (unit === "K") return celsius + 273.15;
  return celsius;
}


export function convertUnit(quantity: string, value: number, from: string, to: string): number {
  if (quantity === "temperature") {
    if (!TEMPERATURE.includes(from as never) || !TEMPERATURE.includes(to as never)) {
      throw new ToolError("Temperature units are C, F and K.");
    }
    return fromCelsius(toCelsius(value, from), to);
  }

  const table = UNITS[quantity];
  if (!table) throw new ToolError(`Unknown quantity “${quantity}”.`);
  const source = table[from];
  const target = table[to];
  if (!source) throw new ToolError(`“${from}” isn't a unit of ${quantity}. Try one of: ${Object.keys(table).join(", ")}.`);
  if (!target) throw new ToolError(`“${to}” isn't a unit of ${quantity}. Try one of: ${Object.keys(table).join(", ")}.`);

  return (value * source.factor) / target.factor;
}

export { TEMPERATURE };

/** The quantities, in the order the picker offers them. */
export const QUANTITIES: { id: string; label: string; from: string; to: string }[] = [
  { id: "length", label: "Length", from: "m", to: "ft" },
  { id: "mass", label: "Mass", from: "kg", to: "lb" },
  { id: "area", label: "Area", from: "m2", to: "ft2" },
  { id: "volume", label: "Volume", from: "l", to: "gal" },
  { id: "speed", label: "Speed", from: "km/h", to: "mph" },
  { id: "temperature", label: "Temperature", from: "C", to: "F" },
  { id: "data", label: "Digital storage", from: "MB", to: "MiB" },
  { id: "time", label: "Time", from: "h", to: "min" },
  { id: "pressure", label: "Pressure", from: "bar", to: "psi" },
  { id: "energy", label: "Energy", from: "kWh", to: "kcal" },
];

const TEMPERATURE_LABELS: Record<string, string> = { C: "Celsius", F: "Fahrenheit", K: "Kelvin" };

/** Every unit a quantity has, as select choices. The picker cannot offer a unit
 *  the converter would then reject. */
export function unitChoices(quantity: string): { value: string; label: string }[] {
  if (quantity === "temperature") {
    return TEMPERATURE.map((unit) => ({ value: unit, label: `${unit} — ${TEMPERATURE_LABELS[unit]}` }));
  }
  return Object.entries(UNITS[quantity] ?? {}).map(([value, meta]) => ({
    value,
    label: `${value} — ${meta.label}`,
  }));
}
