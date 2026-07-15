import { runGameplayV2Simulation } from "../src/simulation/GameplayV2Simulation.ts";

const values = process.argv.slice(2).map((value) => Number.parseInt(value, 10));
const [seed, throwIterationsPerCell, lineoutsPerDivision, aiPredictionsPerDivision, matchesPerDivision] = values;

const report = runGameplayV2Simulation({
  seed,
  throwIterationsPerCell,
  lineoutsPerDivision,
  aiPredictionsPerDivision,
  matchesPerDivision
});

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
