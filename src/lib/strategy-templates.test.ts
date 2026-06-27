import { describe, it, expect } from "vitest";
import { STRATEGY_TEMPLATES, templateById } from "./strategy-templates";
import { parseStrategyParams } from "./strategy-schema";
import { parseCustomConfig } from "./custom-strategy";

// Every template the "New strategy" flow offers must build a payload that
// survives the exact server-side validation used by createStrategyAdvanced,
// otherwise a one-click "Create" could fail. These tests are the guardrail.
describe("strategy templates", () => {
  it("exposes a non-empty, uniquely-identified catalogue", () => {
    expect(STRATEGY_TEMPLATES.length).toBeGreaterThan(0);
    const ids = STRATEGY_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is addressable by id", () => {
    for (const t of STRATEGY_TEMPLATES) {
      expect(templateById(t.id)).toBe(t);
    }
    expect(templateById("does-not-exist")).toBeUndefined();
  });

  for (const t of STRATEGY_TEMPLATES) {
    it(`"${t.name}" builds params that pass risk validation`, () => {
      const params = t.buildParams();
      const risk = parseStrategyParams(params);
      expect(risk.ok, risk.ok ? "" : risk.error).toBe(true);
    });

    if (t.kind === "CUSTOM") {
      it(`"${t.name}" builds a valid custom-signal config`, () => {
        const custom = parseCustomConfig(t.buildParams());
        expect(custom.ok, custom.ok ? "" : custom.error).toBe(true);
        if (custom.ok) {
          expect(custom.instruments.length).toBeGreaterThan(0);
        }
      });
    }
  }
});
