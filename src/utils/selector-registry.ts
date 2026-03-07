export interface SelectorEntry {
  selectorId: number;
  groupBits: number;
}

const EMPTY_ENTRY: Readonly<SelectorEntry> = Object.freeze({
  selectorId: 0,
  groupBits: 0
});

export class SelectorRegistry {
  private nextSelectorId = 1;
  private nextGroupBit = 1;

  private exactLookup: Record<number, Record<string, SelectorEntry>> = {};
  private typeOnlyLookup: Record<number, SelectorEntry> = {};
  private groupMembers: Map<number, number[]> = new Map();
  private _compiledResolver:
    | ((type: number, value: any) => Readonly<SelectorEntry>)
    | null = null;

  registerSelector(type: number, value?: string): SelectorEntry {
    if (value !== undefined) {
      const byType = this.exactLookup[type] ?? (this.exactLookup[type] = {});
      return (
        byType[value] ??
        (byType[value] = { selectorId: this.nextSelectorId++, groupBits: 0 })
      );
    }

    return (
      this.typeOnlyLookup[type] ??
      (this.typeOnlyLookup[type] = {
        selectorId: this.nextSelectorId++,
        groupBits: 0
      })
    );
  }

  registerSelectorGroup(entries: SelectorEntry[]): number {
    const bit = this.nextGroupBit;
    this.nextGroupBit <<= 1;
    const ids: number[] = [];
    for (let i = 0; i < entries.length; i++) {
      entries[i].groupBits |= bit;
      ids.push(entries[i].selectorId);
    }
    this.groupMembers.set(bit, ids);
    return bit;
  }

  getSelectorIdsForGroupBit(bit: number): readonly number[] {
    return this.groupMembers.get(bit) ?? [];
  }

  compile(): (type: number, value: any) => Readonly<SelectorEntry> {
    const entries: Readonly<SelectorEntry>[] = [];
    const entryIndex = new WeakMap<SelectorEntry, number>();

    const createIdx = (entry: SelectorEntry): number => {
      const idx = entries.length;
      entries.push(entry);
      entryIndex.set(entry, idx);
      return idx;
    };
    const getIdx = (entry: SelectorEntry): number => {
      return entryIndex.get(entry) ?? createIdx(entry);
    };

    const typeCases: string[] = [];
    const allTypes = new Set<number>([
      ...Object.keys(this.exactLookup).map(Number),
      ...Object.keys(this.typeOnlyLookup).map(Number)
    ]);

    for (const type of allTypes) {
      const exactByValue = this.exactLookup[type];
      const typeOnly = this.typeOnlyLookup[type];

      let caseBody: string;

      if (exactByValue) {
        let valueCases: string = '';
        for (const [value, entry] of Object.entries(exactByValue)) {
          const idx = getIdx(entry);
          const escaped = JSON.stringify(value);
          valueCases += `case ${escaped}:return e[${idx}];`;
        }

        if (typeOnly) {
          const typeIdx = getIdx(typeOnly);
          caseBody = `switch(v){${valueCases}}return e[${typeIdx}];`;
        } else {
          caseBody = `switch(v){${valueCases}}return d;`;
        }
      } else if (typeOnly) {
        const typeIdx = getIdx(typeOnly);
        caseBody = `return e[${typeIdx}];`;
      } else {
        continue;
      }

      typeCases.push(`case ${type}:${caseBody}`);
    }

    const src = `return function resolve(t,v){switch(t){${typeCases.join(
      ''
    )}}return d;}`;

    this._compiledResolver = new Function('e', 'd', src)(entries, EMPTY_ENTRY);
    return this._compiledResolver;
  }

  resolveSelector<T>(type: number, value?: T): Readonly<SelectorEntry> {
    if (this._compiledResolver !== null) {
      return this._compiledResolver(type, value);
    }
    const byType = this.exactLookup[type as number];
    if (byType !== undefined) {
      const exact = byType[value as unknown as string];
      if (exact !== undefined) return exact;
    }
    return this.typeOnlyLookup[type as number] ?? EMPTY_ENTRY;
  }
}

export const defaultRegistry = new SelectorRegistry();

export function registerSelector(type: number, value?: string): SelectorEntry {
  return defaultRegistry.registerSelector(type, value);
}

export function registerSelectorGroup(entries: SelectorEntry[]): number {
  return defaultRegistry.registerSelectorGroup(entries);
}

export function getSelectorIdsForGroupBit(bit: number): readonly number[] {
  return defaultRegistry.getSelectorIdsForGroupBit(bit);
}

export function compile(): (
  type: number,
  value: any
) => Readonly<SelectorEntry> {
  return defaultRegistry.compile();
}

export function resolveSelector<T>(
  type: number,
  value?: T
): Readonly<SelectorEntry> {
  return defaultRegistry.resolveSelector(type, value);
}
