import type { Content } from "../core/types";
import {
  canonicalEquipmentIconKey,
  collectContentEquipmentIconKeys,
  isRegisteredIconKey,
  registeredIconKeys,
} from "./icons";

/** UI-owned completeness check: every `EquipmentBaseDef.iconKey` in Content must resolve through
 * `icons.ts`, and the registry must not carry orphan entries for the canonical keys that Content
 * uses (including fixture aliases in tests). */
export function assertRegisteredContentIcons(content: Pick<Content, "equipmentBases">): void {
  const registered = new Set(registeredIconKeys());
  const contentKeys = collectContentEquipmentIconKeys(content as Content);
  const canonicalUsed = new Set<string>();
  const violations: string[] = [];

  for (const key of contentKeys) {
    if (!isRegisteredIconKey(key)) {
      violations.push(`equipment base declares iconKey "${key}" not in registry`);
      continue;
    }
    const canonical = canonicalEquipmentIconKey(key);
    if (!canonical) {
      violations.push(`equipment base declares iconKey "${key}" not in registry`);
      continue;
    }
    canonicalUsed.add(canonical);
  }

  for (const key of registered) {
    if (!canonicalUsed.has(key)) {
      violations.push(`icons.ts registry entry "${key}" is not referenced by Content equipmentBases`);
    }
  }

  if (violations.length === 0) {
    return;
  }

  throw new Error(
    `Invalid Content equipment icon registry:\n${violations.map((line) => `  - ${line}`).join("\n")}`,
  );
}
