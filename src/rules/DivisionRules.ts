import type { Division, DivisionId } from "../models/Division";
import { DIVISIONS } from "../data/divisions";

export function getDivision(id: DivisionId): Division {
  const division = DIVISIONS.find((item) => item.id === id);
  if (!division) throw new Error(`Unknown division: ${id}`);
  return division;
}

export function getNextDivision(id: DivisionId): DivisionId {
  const index = DIVISIONS.findIndex((item) => item.id === id);
  const next = DIVISIONS[Math.min(DIVISIONS.length - 1, index + 1)];
  return next.id;
}
