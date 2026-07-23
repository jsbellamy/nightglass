import type { Content } from "../core/types";
import {
  canonicalEquipmentIconKey,
  collectContentEquipmentIconKeys,
  collectContentTalentIconKeys,
  collectSelectableAbilityIconKeys,
  isRegisteredIconKey,
  registeredIconKeys,
} from "./icons";

/** UI-owned completeness check: every content `iconKey` must resolve through `icons.ts`, and the
 * registry must not carry orphan entries for keys Content uses (including fixture aliases). */
export function assertRegisteredContentIcons(
  content: Pick<Content, "equipmentBases" | "classes" | "abilities">,
): void {
  const registered = new Set(registeredIconKeys());
  const canonicalUsed = new Set<string>();
  const violations: string[] = [];

  const assertKey = (key: string, label: string): void => {
    if (!isRegisteredIconKey(key)) {
      violations.push(`${label} declares iconKey "${key}" not in registry`);
      return;
    }
    const canonical = canonicalEquipmentIconKey(key);
    if (!canonical) {
      violations.push(`${label} declares iconKey "${key}" not in registry`);
      return;
    }
    canonicalUsed.add(canonical);
  };

  for (const key of collectContentEquipmentIconKeys(content as Content)) {
    assertKey(key, "equipment base");
  }

  for (const key of collectContentTalentIconKeys(content as Content)) {
    assertKey(key, "talent");
  }

  for (const { abilityId, iconKey } of collectSelectableAbilityIconKeys(content)) {
    if (!iconKey) {
      violations.push(`ability "${abilityId}" lacks iconKey`);
      continue;
    }
    assertKey(iconKey, `ability "${abilityId}"`);
  }

  for (const key of registered) {
    if (!canonicalUsed.has(key)) {
      violations.push(`icons.ts registry entry "${key}" is not referenced by Content`);
    }
  }

  if (violations.length === 0) {
    return;
  }

  throw new Error(
    `Invalid Content icon registry:\n${violations.map((line) => `  - ${line}`).join("\n")}`,
  );
}
