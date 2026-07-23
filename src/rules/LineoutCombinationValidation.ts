import {
  isLineoutPosition,
  type CombinationTargetOption,
  type LineoutCombinationDefinition,
  type LineoutPosition
} from "../models/Combination.ts";

export function isDirectCatchTargetAvailable(
  occupiedPositions: readonly LineoutPosition[],
  targetPosition: LineoutPosition
): boolean {
  const occupied = new Set(occupiedPositions);
  const occupiedInFront = [targetPosition - 1, targetPosition - 2]
    .filter(isLineoutPosition)
    .filter((position) => occupied.has(position))
    .length;
  return occupiedInFront === 0;
}

export function validateLineoutCombinationDefinition(
  definition: LineoutCombinationDefinition
): LineoutCombinationDefinition {
  const context = `Combinaison "${definition.id}"`;
  if (!definition.id.trim()) {
    throw new Error(`${context} : identifiant vide`);
  }

  const occupied = new Set<LineoutPosition>();
  for (const position of definition.occupiedPositions) {
    if (!isLineoutPosition(position)) {
      throw new Error(`${context} : position occupée invalide "${position}"`);
    }
    if (occupied.has(position)) {
      throw new Error(`${context} : position occupée dupliquée "${position}"`);
    }
    occupied.add(position);
  }

  const targetIds = new Set<string>();
  for (const option of definition.targetOptions) {
    const targetContext = `${context}, cible "${option.id}"`;
    if (!option.id.trim() || targetIds.has(option.id)) {
      throw new Error(`${targetContext} : identifiant vide ou dupliqué`);
    }
    targetIds.add(option.id);
    validateTargetOption(option, occupied, targetContext);
  }

  return definition;
}

export function validateLineoutCombinationLibrary(
  definitions: readonly LineoutCombinationDefinition[]
): LineoutCombinationDefinition[] {
  const combinationIds = new Set<string>();
  const targetIds = new Set<string>();
  return definitions.map((definition) => {
    if (combinationIds.has(definition.id)) {
      throw new Error(`Combinaison "${definition.id}" : identifiant dupliqué`);
    }
    combinationIds.add(definition.id);
    const validated = validateLineoutCombinationDefinition(definition);
    for (const option of validated.targetOptions) {
      if (targetIds.has(option.id)) {
        throw new Error(
          `Combinaison "${definition.id}", cible "${option.id}" : identifiant dupliqué dans la bibliothèque`
        );
      }
      targetIds.add(option.id);
    }
    return validated;
  });
}

export function getLineoutCombinationStructuralSignature(
  definition: LineoutCombinationDefinition
): string {
  const targets = definition.targetOptions
    .map((option) => ({
      type: option.type,
      targetPosition: option.targetPosition,
      roles: Object.entries(option.roles)
        .filter((entry): entry is [string, LineoutPosition] => entry[1] !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
    }))
    .sort((left, right) => (
      left.targetPosition - right.targetPosition || left.type.localeCompare(right.type)
    ));
  return JSON.stringify({
    occupiedPositions: [...definition.occupiedPositions].sort((left, right) => left - right),
    targets
  });
}

function validateTargetOption(
  option: CombinationTargetOption,
  occupied: ReadonlySet<LineoutPosition>,
  context: string
): void {
  if (!isLineoutPosition(option.targetPosition) || !occupied.has(option.targetPosition)) {
    throw new Error(`${context} : targetPosition absente des positions occupées`);
  }
  for (const [role, position] of Object.entries(option.roles)) {
    if (position !== undefined && (!isLineoutPosition(position) || !occupied.has(position))) {
      throw new Error(`${context} : rôle "${role}" absent des positions occupées`);
    }
  }

  if (option.type === "directCatch") {
    if (
      option.roles.directCatcherPosition !== option.targetPosition
      || option.roles.jumperPosition !== undefined
      || option.roles.frontLifterPosition !== undefined
      || option.roles.rearLifterPosition !== undefined
    ) {
      throw new Error(`${context} : réceptionneur direct incohérent`);
    }
    if (!isDirectCatchTargetAvailable([...occupied], option.targetPosition)) {
      throw new Error(`${context} : réception directe bloquée par un joueur dans les deux positions devant la cible`);
    }
    return;
  }

  const { jumperPosition, frontLifterPosition, rearLifterPosition } = option.roles;
  if (
    option.roles.directCatcherPosition !== undefined
    || jumperPosition !== option.targetPosition
    || frontLifterPosition !== option.targetPosition - 1
    || rearLifterPosition !== option.targetPosition + 1
  ) {
    throw new Error(`${context} : rôles du bloc de saut incohérents`);
  }
}
