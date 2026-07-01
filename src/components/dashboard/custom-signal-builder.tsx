"use client";

import { TrendUp, TrendDown, ArrowsLeftRight, Plus, X, Star } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ClampedNumberInput } from "@/components/ui/clamped-number-input";
import { Tooltip, InfoTip } from "@/components/ui/tooltip";
import {
  INDICATORS,
  OPERATORS,
  indicatorMeta,
  defaultGroup,
  defaultShortGroup,
  mirrorGroups,
  MAX_GROUPS,
  MAX_CONDITIONS_PER_GROUP,
  type Condition,
  type ConditionGroup,
  type Comparand,
  type IndicatorKey,
  type Operator,
  type TradeDirection,
} from "@/lib/custom-strategy";
import { cn } from "@/lib/utils";

const INDICATOR_CATEGORIES = ["Price", "Trend", "Momentum", "Volatility", "Volume"] as const;

function PremiumTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent">
      <Star size={9} weight="fill" /> Pro
    </span>
  );
}

function IndicatorSelect({
  value,
  onChange,
  ariaLabel,
  includeValueOption,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  includeValueOption?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className="h-9 min-w-0 rounded-[var(--radius-control)] border border-line bg-base px-2.5 text-xs text-fg transition-colors focus:border-accent focus:outline-none"
    >
      {includeValueOption && <option value="__value">a custom value</option>}
      {INDICATOR_CATEGORIES.map((cat) => (
        <optgroup key={cat} label={cat}>
          {INDICATORS.filter((i) => i.category === cat).map((ind) => (
            <option key={ind.key} value={ind.key}>
              {ind.label}
              {ind.premium ? " (Pro)" : ""}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

const DIRECTIONS: { key: TradeDirection; label: string; icon: React.ReactNode }[] = [
  { key: "LONG", label: "Long only", icon: <TrendUp size={13} weight="bold" /> },
  { key: "SHORT", label: "Short only", icon: <TrendDown size={13} weight="bold" /> },
  { key: "BOTH", label: "Long & short", icon: <ArrowsLeftRight size={13} weight="bold" /> },
];

/**
 * Edit one set of condition groups (AND across groups, ALL/ANY within). Extracted
 * so a both-direction strategy can show a separate editor for the long and short
 * rulesets without duplicating the group UI.
 */
function GroupsEditor({
  groups,
  onGroupsChange,
}: {
  groups: ConditionGroup[];
  onGroupsChange: (g: ConditionGroup[]) => void;
}) {
  function updateGroup(gi: number, patch: Partial<ConditionGroup>) {
    onGroupsChange(groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  }
  function updateCondition(gi: number, ci: number, patch: Partial<Condition>) {
    onGroupsChange(
      groups.map((g, i) =>
        i === gi ? { ...g, conditions: g.conditions.map((c, j) => (j === ci ? { ...c, ...patch } : c)) } : g,
      ),
    );
  }
  function addCondition(gi: number) {
    const g = groups[gi];
    if (g.conditions.length >= MAX_CONDITIONS_PER_GROUP) return;
    updateGroup(gi, {
      conditions: [...g.conditions, { left: "rsi14", op: "<", right: { kind: "value", value: 30 } }],
    });
  }
  function removeCondition(gi: number, ci: number) {
    updateGroup(gi, { conditions: groups[gi].conditions.filter((_, j) => j !== ci) });
  }
  function addGroup() {
    if (groups.length >= MAX_GROUPS) return;
    onGroupsChange([...groups, defaultGroup()]);
  }
  function removeGroup(gi: number) {
    onGroupsChange(groups.filter((_, i) => i !== gi));
  }

  return (
    <div className="space-y-3">
      {groups.map((group, gi) => (
        <div key={gi}>
          {gi > 0 && (
            <div className="my-2 flex items-center gap-2">
              <span className="h-px flex-1 bg-line" />
              <span className="rounded-[var(--radius-pill)] border border-line bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fg-subtle">
                and
              </span>
              <span className="h-px flex-1 bg-line" />
            </div>
          )}
          <div className="rounded-[var(--radius-card)] border border-line bg-surface/40 p-3">
            {/* Group header */}
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Match</span>
                <div className="inline-flex items-center gap-0.5 rounded-[var(--radius-pill)] border border-line bg-base p-0.5">
                  {(["ALL", "ANY"] as const).map((j) => (
                    <button
                      key={j}
                      type="button"
                      onClick={() => updateGroup(gi, { join: j })}
                      className={cn(
                        "rounded-[var(--radius-pill)] px-2.5 py-1 text-[11px] font-semibold transition-colors",
                        group.join === j ? "bg-accent-soft text-accent" : "text-fg-subtle hover:text-fg",
                      )}
                    >
                      {j}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-fg-subtle">of these are true</span>
                {group.join === "ANY" && <PremiumTag />}
              </div>
              {groups.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeGroup(gi)}
                  aria-label="Remove group"
                  className="rounded-[var(--radius-control)] p-1.5 text-fg-subtle transition-colors hover:bg-base hover:text-negative"
                >
                  <X size={15} weight="bold" />
                </button>
              )}
            </div>

            {/* Conditions */}
            <div className="space-y-2">
              {group.conditions.map((c, ci) => {
                const rightIsValue = c.right.kind === "value";
                const leftMeta = indicatorMeta(c.left);
                return (
                  <div key={ci} className="flex flex-wrap items-center gap-2 rounded-[var(--radius-control)] border border-line bg-base p-2.5">
                    {ci > 0 && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-fg-faint">
                        {group.join === "ANY" ? "or" : "and"}
                      </span>
                    )}
                    <div className="inline-flex items-center gap-1">
                      <IndicatorSelect
                        value={c.left}
                        onChange={(v) => updateCondition(gi, ci, { left: v as IndicatorKey })}
                        ariaLabel="Left indicator"
                      />
                      {leftMeta && <InfoTip content={leftMeta.help} />}
                    </div>
                    <select
                      value={c.op}
                      onChange={(e) => updateCondition(gi, ci, { op: e.target.value as Operator })}
                      aria-label="Operator"
                      className="h-9 rounded-[var(--radius-control)] border border-line bg-base px-2.5 text-xs text-fg focus:border-accent focus:outline-none"
                    >
                      {OPERATORS.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <IndicatorSelect
                      value={rightIsValue ? "__value" : (c.right as { kind: "indicator"; key: IndicatorKey }).key}
                      onChange={(v) => {
                        const next: Comparand = v === "__value" ? { kind: "value", value: 0 } : { kind: "indicator", key: v as IndicatorKey };
                        updateCondition(gi, ci, { right: next });
                      }}
                      ariaLabel="Right indicator or value"
                      includeValueOption
                    />
                    {rightIsValue && (
                      <ClampedNumberInput
                        value={(c.right as { kind: "value"; value: number }).value}
                        onCommit={(v) => updateCondition(gi, ci, { right: { kind: "value", value: v } })}
                        className="w-28 tnum"
                        ariaLabel="Custom value"
                        allowNegative
                      />
                    )}
                    {group.conditions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCondition(gi, ci)}
                        aria-label="Remove condition"
                        className="ml-auto rounded-[var(--radius-control)] p-1.5 text-fg-subtle transition-colors hover:bg-surface hover:text-negative"
                      >
                        <X size={14} weight="bold" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => addCondition(gi)}
              disabled={group.conditions.length >= MAX_CONDITIONS_PER_GROUP}
            >
              <Plus size={14} className="mr-1" /> Add condition
            </Button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addGroup}
        disabled={groups.length >= MAX_GROUPS}
        className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-dashed border-line px-3 py-2 text-xs font-medium text-fg-subtle transition-colors hover:border-line-strong hover:text-fg disabled:opacity-40"
      >
        <Plus size={14} weight="bold" /> Add condition group
        <Tooltip content="Groups are joined with AND. Use multiple groups to express logic like (trend is up) AND (momentum is oversold OR price broke the day high).">
          <span className="ml-0.5">
            <PremiumTag />
          </span>
        </Tooltip>
      </button>
    </div>
  );
}

export function CustomSignalBuilder({
  groups,
  onGroupsChange,
  direction,
  onDirectionChange,
  shortGroups,
  onShortGroupsChange,
}: {
  groups: ConditionGroup[];
  onGroupsChange: (g: ConditionGroup[]) => void;
  direction: TradeDirection;
  onDirectionChange: (d: TradeDirection) => void;
  shortGroups?: ConditionGroup[];
  onShortGroupsChange?: (g: ConditionGroup[]) => void;
}) {
  const both = direction === "BOTH";
  // When BOTH is enabled the short ruleset must exist; seed it from a mirror of the
  // current long rules (falling back to a default) so the editor always shows a
  // sensible, editable short side.
  const seededShort = () => {
    const mirrored = mirrorGroups(groups);
    return mirrored.length ? mirrored : [defaultShortGroup()];
  };
  const effectiveShort = shortGroups && shortGroups.length ? shortGroups : seededShort();

  function selectDirection(d: TradeDirection) {
    if (d === "BOTH" && onShortGroupsChange && (!shortGroups || shortGroups.length === 0)) {
      onShortGroupsChange(seededShort());
    }
    onDirectionChange(d);
  }

  return (
    <div className="space-y-5">
      {/* Direction */}
      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <p className="text-xs font-medium text-fg">Trade direction</p>
          <InfoTip content="Long profits when price rises, short when it falls. Choose both to let the bot take either side. That is the sensible default, since a real edge rarely only works one way. Restrict to one side only if you deliberately want a long or short only book." />
        </div>
        <div className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-line bg-surface p-1">
          {DIRECTIONS.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => selectDirection(d.key)}
              aria-pressed={direction === d.key}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-3.5 py-1.5 text-xs font-semibold transition-colors",
                direction === d.key ? "bg-base text-fg shadow-[var(--shadow-sm)]" : "text-fg-subtle hover:text-fg",
              )}
            >
              {d.icon}
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Entry conditions */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-fg">{both ? "Long entry conditions" : "Entry conditions"}</p>
          <InfoTip content="Every group must be satisfied to enter (groups are joined by AND). Within a group, choose whether ALL or ANY of its conditions need to be true." />
        </div>
        <GroupsEditor groups={groups} onGroupsChange={onGroupsChange} />
      </div>

      {both && onShortGroupsChange && (
        <div className="space-y-3 rounded-[var(--radius-card)] border border-line bg-base/30 p-4">
          <div className="flex items-center gap-1.5">
            <TrendDown size={14} weight="bold" className="text-negative" />
            <p className="text-xs font-medium text-fg">Short entry conditions</p>
            <InfoTip content="Separate rules for entering short. These usually mirror the long side (for example price below the average instead of above)." />
          </div>
          <GroupsEditor groups={effectiveShort} onGroupsChange={onShortGroupsChange} />
        </div>
      )}
    </div>
  );
}
