import type { Severity } from '../rules/rule.ts';
import type {
    Config,
    NamingConfig,
    NamingState,
    OverrideState,
    ResolvedConfig,
    RuleSetting,
    RuleState,
} from './types.ts';

/**
 * Lays one configuration over what was resolved so far. `extends` has already been applied by the
 * caller, in order, before this layer.
 *
 * - Lists accumulate; `"!x"` removes `x` from what was inherited.
 * - A rule set to a bare severity keeps its options; `[severity, options]` merges the options in,
 *   lists inside them accumulating the same way.
 * - Overrides are kept in order and applied per folder later.
 */
export function mergeLayer(base: ResolvedConfig, layer: Config, origin: string, own: boolean): ResolvedConfig {
    const rules: Record<string, RuleState> = { ...base.rules };
    for (const [name, setting] of Object.entries(layer.rules ?? {})) {
        rules[name] = applySetting(rules[name], setting);
    }
    const overrides: OverrideState[] = [
        ...base.overrides,
        ...(layer.overrides ?? []).map(override => ({
            folders: override.folders,
            reason: override.reason,
            rules: override.rules ?? {},
            naming: override.naming ?? {},
            origin,
            own,
        })),
    ];
    return {
        include: mergeList(base.include, layer.include),
        exclude: mergeList(base.exclude, layer.exclude),
        naming: mergeNaming(base.naming, layer.naming),
        rules,
        overrides,
        layers: [...base.layers, origin],
        suppressions: layer.suppressions ?? base.suppressions,
    };
}

export function mergeNaming(base: NamingState, layer: NamingConfig | undefined): NamingState {
    if (!layer) {
        return base;
    }
    return {
        companions: mergeList(base.companions, layer.companions),
        ignoreLeadingWords: mergeList(
            base.ignoreLeadingWords,
            layer.ignoreLeadingWords?.map(word => word.toLowerCase()),
        ),
        groupNumericPrefixes: layer.groupNumericPrefixes ?? base.groupNumericPrefixes,
    };
}

export function applySetting(current: RuleState | undefined, setting: RuleSetting): RuleState {
    const previous = current ?? { severity: 'off' as Severity, options: {} };
    if (typeof setting === 'string') {
        return { severity: setting, options: previous.options };
    }
    const [severity, options] = setting;
    return { severity, options: options ? mergeOptions(previous.options, options) : previous.options };
}

export function mergeOptions(
    base: Readonly<Record<string, unknown>>,
    layer: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(layer)) {
        const previous = merged[key];
        merged[key] =
            Array.isArray(value) && (Array.isArray(previous) || previous === undefined)
                ? mergeList((previous as unknown[] | undefined) ?? [], value)
                : value;
    }
    return merged;
}

/** Appends without repeating; `"!x"` removes `x`. */
export function mergeList<T>(base: readonly T[], layer: readonly T[] | undefined): T[] {
    const result = [...base];
    for (const item of layer ?? []) {
        if (typeof item === 'string' && item.startsWith('!')) {
            const removed = item.slice(1);
            const index = (result as readonly unknown[]).indexOf(removed);
            if (index !== -1) {
                result.splice(index, 1);
            }
            continue;
        }
        if (!result.includes(item)) {
            result.push(item);
        }
    }
    return result;
}
