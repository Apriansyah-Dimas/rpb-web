import { Parser } from "expr-eval";
import type { Dimensions, PanelThickness } from "@/types/rpb";

/**
 * Formula Variables Reference
 * ============================
 *
 * Available Variables:
 * - length     : Panjang (mm)
 * - width      : Lebar (mm)
 * - height     : Tinggi (mm)
 * - panel_thickness / p / t : Tebal panel (30 atau 45)
 *
 * Also available: results from previously calculated items (referenced by their code).
 * Example: After 'pinchplate' is calculated, you can use 'pinchplate' in subsequent formulas.
 *
 * Available Functions:
 * - ROUND(value, digits)  : Round to specified decimal places. Example: ROUND(3.14159, 2) = 3.14
 * - CEIL(value)           : Round up to nearest integer. Example: CEIL(3.2) = 4
 * - FLOOR(value)          : Round down to nearest integer. Example: FLOOR(3.8) = 3
 * - ABS(value)            : Absolute value. Example: ABS(-5) = 5
 * - MAX(...values)         : Maximum of values. Example: MAX(1, 5, 3) = 5
 * - MIN(...values)         : Minimum of values. Example: MIN(1, 5, 3) = 1
 * - PCT(base, pct)         : Calculate percentage. Example: PCT(100, 10) = 10 (10% of 100)
 * - PERSEN(base, pct)      : Alias for PCT (Indonesian). Example: PERSEN(200, 15) = 30
 *
 * IF Function:
 * - IF(condition, valueIfTrue, valueIfFalse)
 *   Evaluates the condition and returns valueIfTrue if condition is truthy (non-zero),
 *   otherwise returns valueIfFalse.
 *
 *   Comparison operators: >, <, >=, <=, ==, !=
 *   Logical operators: &&, ||, !
 *
 *   Examples:
 *   - IF(panel_thickness > 30, 10, 5)     -> returns 10 if thickness is 45, 5 if 30
 *   - IF(p == 45, 1, 0)                   -> returns 1 if thickness is 45
 *   - IF(length > 3000, 10, 5)            -> returns 10 if length > 3000
 *   - IF(width >= 1000 && height >= 800, 2, 1)  -> returns 2 if both conditions true
 *   - IF(p == 30, omega_profil * 6, 0)    -> conditional based on thickness
 *
 * Percentage Literals:
 * - Use number followed by % to represent percentage. Example: 25% means 0.25
 * - Note: Use PCT() or PERSEN() for calculating percentage of a value.
 */

export interface FormulaContext extends Dimensions {
  panel_thickness: number;
  panelThickness: number;
}

export type FormulaVariables = Record<string, number>;

const parser = new Parser({
  operators: {
    assignment: false,
    comparison: true,
    concatenate: false,
    conditional: false,
    logical: true,
    in: false,
  },
});

const withFormulaAliases = (ctx: FormulaVariables) => ({
  ...ctx,
  p: Number(ctx.panel_thickness ?? 0),
  t: Number(ctx.panel_thickness ?? 0),
  __length_var: Number(ctx.length ?? 0),
});

const preprocessPercentLiterals = (expression: string): string =>
  expression.replace(/(\d+(?:\.\d+)?)\s*%/g, "($1/100)");

const normalizeDecimalComma = (expression: string): string =>
  expression.replace(/(\d),(\d)/g, "$1.$2");

// `length` is reserved by expr-eval internals; remap variable token to a safe alias.
const remapReservedVariableTokens = (expression: string): string =>
  expression.replace(/\blength\b(?!\s*\()/gi, "__length_var");

const customFunctions = {
  ROUND: (value: number, digits = 0) => {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  },
  CEIL: (value: number) => Math.ceil(value),
  FLOOR: (value: number) => Math.floor(value),
  ABS: (value: number) => Math.abs(value),
  MAX: (...values: number[]) => Math.max(...values),
  MIN: (...values: number[]) => Math.min(...values),
  PCT: (base: number, pct: number) => base * (pct / 100),
  PERSEN: (base: number, pct: number) => base * (pct / 100),
  IF: (condition: number, valueIfTrue: number, valueIfFalse: number) =>
    condition ? valueIfTrue : valueIfFalse,
};

Object.assign(parser.functions, customFunctions);

export const buildFormulaContext = (
  dimensions: Dimensions,
  panelThickness: PanelThickness,
): FormulaContext => ({
  length: Number.isFinite(dimensions.length) ? Math.max(0, dimensions.length) : 0,
  width: Number.isFinite(dimensions.width) ? Math.max(0, dimensions.width) : 0,
  height: Number.isFinite(dimensions.height) ? Math.max(0, dimensions.height) : 0,
  panel_thickness: panelThickness,
  panelThickness: panelThickness,
});

export const evaluateFormulaQuantity = (
  formulaExpr: string,
  context: FormulaVariables,
): number => {
  if (!formulaExpr || formulaExpr.trim().length === 0) {
    return 0;
  }

  try {
    const expression = remapReservedVariableTokens(
      normalizeDecimalComma(preprocessPercentLiterals(formulaExpr.trim())),
    );
    const compiled = parser.parse(expression);
    const value = compiled.evaluate(withFormulaAliases(context));

    if (typeof value !== "number" || !Number.isFinite(value)) {
      return 0;
    }

    return Math.max(0, value);
  } catch {
    return 0;
  }
};

export const validateFormulaExpression = (formulaExpr: string): string | null => {
  try {
    const expression = remapReservedVariableTokens(
      normalizeDecimalComma(preprocessPercentLiterals(formulaExpr.trim())),
    );
    parser.parse(expression);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Formula tidak valid.";
  }
};
