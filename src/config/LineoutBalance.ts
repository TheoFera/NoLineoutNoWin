export const LINEOUT_BALANCE_SPECIFICATION_STATUS = "v2_source_of_truth_loaded" as const;

export const LINEOUT_BALANCE = {
  positions: {
    minimum: 1,
    maximum: 7
  },
  score: {
    minimum: 0,
    maximum: 100
  },
  fatigue: {
    minimumMaximumPercent: 5,
    maximumMaximumPercent: 15,
    referenceMatchMinutes: 80
  },
  throwing: {
    playableStatMinimum: 60,
    playableStatMaximum: 100,
    distanceMaximum: 7,
    distanceCoefficients: [1, 0.99, 0.97, 0.94, 0.9, 0.85, 0.79, 0.72],
    randomAmplitudeAtStatMinimum: 30,
    randomAmplitudeAtStatMaximum: 10,
    exceptionalErrorBaseProbability: 0.001,
    exceptionalErrorDistanceProbability: 0.049,
    exceptionalErrorDistanceExponent: 2,
    exceptionalErrorQualityMinimum: 0,
    exceptionalErrorQualityMaximum: 25,
    notStraightThreshold: 50,
    preciseProbabilityAtThreshold: 1 / 3
  },
  jumping: {
    jumperWeight: 0.5,
    rearLifterWeight: 0.3,
    frontLifterWeight: 0.2,
    twoLiftersModifier: 10,
    oneLifterModifier: -20,
    randomQualityAnchorMinimum: 60,
    randomQualityAnchorMaximum: 100,
    randomAmplitudeAtQualityMinimum: 30,
    randomAmplitudeAtQualityMaximum: 10,
    trajectoryAccessibilityModifier: {
      precise: 0,
      low: -15,
      high: -25
    },
    handsCorrectionBaseline: 70,
    handsCorrectionWeight: 0.5,
    blockReceptionSuccessThreshold: 50,
    blockReceptionCleanMarginExclusive: 10
  },
  aerialDuel: {
    jumpWeight: 0.5,
    handsWeight: 0.5,
    cleanAttackMinimumExclusive: 10,
    scrappyAttackMinimum: 0,
    deflectedDefenseMinimum: -15,
    cleanDefenseMaximumExclusive: -15
  },
  counterAhead: {
    oneAheadScoreModifier: -5,
    preciseDifficultyBase: 70,
    preciseThrowQualityWeight: 0.3,
    lowDifficultyBase: 45,
    lowThrowQualityWeight: 0.2,
    twoAheadScoreModifier: -30,
    twoAheadLowDifficultyBase: 50,
    twoAheadLowThrowQualityWeight: 0.2,
    interceptionHandsBaseline: 50,
    interceptionHandsMaximumCorrection: 20,
    interceptionHandsExponent: 2,
    cleanStealControlMarginExclusive: 15
  },
  knockOn: {
    riskByHands: [
      { hands: 0, probability: 0.5 },
      { hands: 20, probability: 0.3 },
      { hands: 40, probability: 0.15 },
      { hands: 50, probability: 0.1 },
      { hands: 60, probability: 0.075 },
      { hands: 70, probability: 0.05 },
      { hands: 80, probability: 0.025 },
      { hands: 90, probability: 0.013 },
      { hands: 100, probability: 0.001 }
    ],
    oneAheadPressureMultiplier: 2,
    oneAheadPressureBonusPercent: 10,
    secondaryPressureMultiplier: 1.5,
    secondaryPressureBonusPercent: 5,
    maximumPressureRiskPercent: 60
  },
  directCatch: {
    handsWeight: 0.7,
    randomWeight: 0.3,
    successThreshold: 50,
    placementModifier: {
      noNearbyOpponent: 5,
      oneAhead: -30,
      twoAhead: -15,
      oneBehind: -15,
      furtherAway: 0
    },
    highBallCascadeOffset: 3,
    looseBallThrowingTeamProbability: 0.5
  },
  generation: {
    roleThreshold: 60,
    clubModifiers: [-3, 0, 3],
    divisionStats: {
      regionale_3: { mean: 65, minimum: 60, maximum: 70 },
      regionale_2: { mean: 68, minimum: 61, maximum: 74 },
      regionale_1: { mean: 71, minimum: 63, maximum: 77 },
      federale_3: { mean: 74, minimum: 66, maximum: 80 },
      federale_2: { mean: 77, minimum: 69, maximum: 83 },
      federale_1: { mean: 80, minimum: 72, maximum: 86 },
      nationale_2: { mean: 83, minimum: 75, maximum: 89 },
      nationale: { mean: 86, minimum: 78, maximum: 92 },
      pro_d2: { mean: 90, minimum: 82, maximum: 96 },
      top_14: { mean: 94, minimum: 86, maximum: 100 }
    },
    fullVersatilityFromDivision: "federale_1",
    minimumExpectedJump: 50,
    assignmentWeights: {
      jumper: { jump: 0.7, hands: 0.3 },
      rearLifter: { lift: 0.8, jump: 0.2 },
      frontLifter: { lift: 0.7, jump: 0.3 },
      directReceiver: { hands: 1 }
    }
  },
  ai: {
    repertoireByDivision: {
      regionale_3: { active: 2, reserve: 0 },
      regionale_2: { active: 3, reserve: 1 },
      regionale_1: { active: 3, reserve: 1 },
      federale_3: { active: 4, reserve: 2 },
      federale_2: { active: 4, reserve: 2 },
      federale_1: { active: 4, reserve: 3 },
      nationale_2: { active: 5, reserve: 3 },
      nationale: { active: 5, reserve: 4 },
      pro_d2: { active: 5, reserve: 4 },
      top_14: { active: 5, reserve: 5 }
    },
    returnMatchReplacement: {
      minimumUses: 2,
      failureRateExclusive: 0.5,
      maximumReplacements: 7
    },
    zoneSizeMultiplier: {
      own22: { short: 0.6, long: 1.5 },
      midfield: { short: 1.4, long: 0.6 },
      opponent22: { short: 0.6, long: 1.5 }
    },
    repetitionPenalty: {
      cleanWin: { target: 0, combination: 0 },
      scrappyWin: { target: -5, combination: 0 },
      turnover: { target: -15, combination: -5 },
      fault: { target: -25, combination: -10 }
    },
    memory: {
      combinationFrequencyWeight: 0.7,
      globalFrequencyWeight: 0.3,
      fullConfidenceObservations: 5
    },
    selection: {
      randomAdjustmentMinimum: -10,
      randomAdjustmentMaximum: 10,
      minimumWeight: 1,
      scoreScale: 100,
      intelligenceScale: 100,
      videoPreparationScale: 100
    },
    intelligenceByDivision: {
      regionale_3: { base: 20, learnedBestTargetProbability: 0.35 },
      regionale_2: { base: 28, learnedBestTargetProbability: 0.42 },
      regionale_1: { base: 36, learnedBestTargetProbability: 0.49 },
      federale_3: { base: 45, learnedBestTargetProbability: 0.57 },
      federale_2: { base: 54, learnedBestTargetProbability: 0.65 },
      federale_1: { base: 63, learnedBestTargetProbability: 0.73 },
      nationale_2: { base: 72, learnedBestTargetProbability: 0.8 },
      nationale: { base: 80, learnedBestTargetProbability: 0.86 },
      pro_d2: { base: 88, learnedBestTargetProbability: 0.91 },
      top_14: { base: 95, learnedBestTargetProbability: 0.95 }
    },
    intelligenceClubVariation: 5,
    videoByDivision: {
      regionale_3: { preparationMinimum: 0, preparationMaximum: 10, matchesMinimum: 0, matchesMaximum: 0 },
      regionale_2: { preparationMinimum: 5, preparationMaximum: 20, matchesMinimum: 0, matchesMaximum: 1 },
      regionale_1: { preparationMinimum: 10, preparationMaximum: 30, matchesMinimum: 0, matchesMaximum: 1 },
      federale_3: { preparationMinimum: 20, preparationMaximum: 40, matchesMinimum: 1, matchesMaximum: 2 },
      federale_2: { preparationMinimum: 30, preparationMaximum: 50, matchesMinimum: 1, matchesMaximum: 3 },
      federale_1: { preparationMinimum: 40, preparationMaximum: 60, matchesMinimum: 2, matchesMaximum: 4 },
      nationale_2: { preparationMinimum: 50, preparationMaximum: 70, matchesMinimum: 3, matchesMaximum: 5 },
      nationale: { preparationMinimum: 60, preparationMaximum: 80, matchesMinimum: 4, matchesMaximum: 6 },
      pro_d2: { preparationMinimum: 75, preparationMaximum: 90, matchesMinimum: 6, matchesMaximum: 8 },
      top_14: { preparationMinimum: 85, preparationMaximum: 100, matchesMinimum: 8, matchesMaximum: 12 }
    },
    videoRecencyWeights: [1, 0.8, 0.6, 0.4, 0.2]
  },
  match: {
    simulatedMinutesPerRealSecond: 3,
    pitchLengthMeters: 100,
    simulationStepMinutes: 0.5,
    movement: {
      strongProgress: { probability: 0.15, minimumMeters: 4, maximumMeters: 8 },
      normalProgress: { probability: 0.45, minimumMeters: 1, maximumMeters: 4 },
      stagnation: { probability: 0.25, minimumMeters: -1, maximumMeters: 1 },
      retreat: { probability: 0.15, minimumMeters: 1, maximumMeters: 4 }
    },
    maximumSkillProbabilityAdjustment: 0.05,
    turnoverProbabilityPerMinute: 0.08,
    minimumMinutesBetweenLineouts: 3,
    lineoutPositionVariationMeters: 3,
    attackingPressureThreshold: 30,
    pressure: {
      normalRetention: 3,
      progressTowardLine: 5,
      scrappyWin: 6,
      cleanWin: 12,
      steal: 10
    },
    immediateTryProbability: {
      distance16To22: { cleanWin: 0.5, scrappyWin: 0.2 },
      distance8To15: { cleanWin: 0.65, scrappyWin: 0.35 },
      distance0To7: { cleanWin: 0.8, scrappyWin: 0.5 }
    },
    conversionSuccessProbability: 0.75,
    scoringOpportunityProbabilityPerMinute: 0.35,
    penaltyProbabilityOutsideAttacking22: 0.35,
    cleanLineoutProgressMeters: 5,
    points: {
      penalty: 3,
      unconvertedTry: 5,
      convertedTry: 7
    },
    restartPositionMeters: 50,
    minimumEndMinute: 80,
    maximumEndMinute: 82
  }
} as const;

export const LINEOUT_REFERENCE_RATES = {
  straightThrowWithoutFatigue: {
    0: { 60: 0.666, 70: 0.899, 80: 0.999, 90: 0.999, 100: 0.999 },
    1: { 60: 0.655, 70: 0.884, 80: 0.998, 90: 0.998, 100: 0.998 },
    2: { 60: 0.633, 70: 0.854, 80: 0.995, 90: 0.995, 100: 0.995 },
    3: { 60: 0.601, 70: 0.808, 80: 0.99, 90: 0.99, 100: 0.99 },
    4: { 60: 0.557, 70: 0.747, 80: 0.983, 90: 0.983, 100: 0.983 },
    5: { 60: 0.503, 70: 0.672, 80: 0.925, 90: 0.974, 100: 0.974 },
    6: { 60: 0.44, 70: 0.584, 80: 0.799, 90: 0.963, 100: 0.963 },
    7: { 60: 0.367, 70: 0.483, 80: 0.655, 90: 0.944, 100: 0.95 }
  }
} as const;

// These values preserve the V1 behavior. They are not the final V2 balance specification.
export const LEGACY_LINEOUT_BALANCE = {
  throwing: {
    distanceFactors: [1, 0.96, 0.9, 0.8, 0.67, 0.52, 0.35],
    randomMin: -8,
    randomMax: 8
  },
  jumping: {
    jumperWeight: 0.7,
    liftWeight: 0.3,
    fullSupportMultiplier: 1,
    rightOnlyJumpMultiplier: 0.6,
    rightOnlyLiftMultiplier: 0.6,
    averageRightOnlyMultiplier: 0.7,
    averageLeftOnlyMultiplier: 0.4,
    noSupportLift: 10,
    minimumQuality: 0,
    maximumQuality: 100
  },
  counter: {
    onePositionAheadBase: 82,
    samePositionBase: 50,
    twoPositionsAheadBase: 30,
    furtherAheadBase: 14,
    behindBase: 6,
    missingDefenderMultiplier: 0.35,
    missingDefenderMinimum: 5,
    missingDefenderMaximum: 30,
    statBaseline: 50,
    handsWeight: 0.25,
    jumpWeight: 0.45,
    minimum: 5,
    maximum: 95
  },
  resolution: {
    counterResistanceMinimum: 5,
    counterResistanceMaximum: 100,
    productScoreMultiplier: 4.5,
    minimumScore: 5,
    maximumScore: 95,
    rollMinimum: 1,
    rollMaximum: 100,
    cleanCatchMargin: 18,
    automaticCleanCatchScore: 70,
    faultThrowMaximum: 25,
    faultCounterMinimum: 50,
    faultFailureMargin: 15
  },
  effects: {
    missingTarget: { possession: -10, occupation: -8 },
    cleanCatch: { possession: 10, occupation: 10 },
    dirtyCatch: { possession: 5, occupation: 3 },
    lost: { possession: -12, occupation: -10 },
    fault: { possession: -12, occupation: -10 },
    missedDefense: { possession: -8, occupation: -6 }
  },
  match: {
    ourThrowThreshold: 0.45,
    firstLineoutMinute: 4,
    lastLineoutMinute: 78,
    minimumOpponentPlayers: 4,
    maximumPlayers: 7,
    stateMinimum: 0,
    stateMaximum: 100,
    possessionScoreWeight: 0.45,
    occupationScoreWeight: 0.55,
    scoringRandomMin: -20,
    scoringRandomMax: 20,
    ourScoringThreshold: 82,
    opponentScoringThreshold: 18,
    tryRollThreshold: 0.55,
    tryPoints: 7,
    penaltyPoints: 3
  }
} as const;
