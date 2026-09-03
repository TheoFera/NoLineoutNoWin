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
    successThreshold: 50,
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
    correctDefensiveReadBonus: 20,
    placementModifier: {
      noNearbyOpponent: 5,
      oneAhead: -30,
      twoAhead: -15,
      oneBehind: -15,
      furtherAway: 0
    },
    secondaryRecovery: {
      firstBehindOffset: 2,
      secondBehindOffset: 3,
      lowTwoAheadModifier: -30,
      groundDistancePenaltyPerPosition: 10
    },
    looseBallThrowingTeamProbability: 0.5
  },
  gameplayV3: {
    depth: {
      minimumMeters: 1.2,
      maximumMeters: 14.2,
      positionSpacingMeters: 1.85,
      ballContinuationMeters: 3.2
    },
    gesture: {
      minimumDistancePixels: 6,
      maximumDistancePixels: 560,
      depthResponseExponent: 2,
      shortThrowMinimumSpeedPixelsPerSecond: 180,
      longThrowMinimumSpeedPixelsPerSecond: 360,
      accidentalTouchProtectionMs: 35,
      playerActionSwipeMinimumPixels: 24,
      playerActionSwipeDominanceRatio: 1.15,
      playerSwapTargetRadiusSlotRatio: 0.42,
      playerSwapTargetRadiusHeightRatio: 0.55
    },
    timing: {
      combinationLeadMs: 300,
      phaseDurationMs: 460,
      movementPhaseLeadMs: 120,
      opponentPreparationMs: 4_500,
      throwPowerGaugeHoldMs: 700,
      resultOverlayDelayMs: 750,
      baseFlightDurationMs: 430,
      flightDurationPerMeterMs: 47,
      minimumFlightDurationMs: 500,
      maximumFlightDurationMs: 1_180
    },
    movement: {
      minimumMetersPerSecond: 2.5,
      middleMetersPerSecond: 4.5,
      maximumMetersPerSecond: 8,
      avoidanceClearanceMeters: 0.62,
      avoidanceLateralMeters: 0.9,
      minimumPlayerSeparationMeters: 0.58,
      arrivalToleranceMeters: 0.035
    },
    jump: {
      standingHandHeightMeters: 2.05,
      minimumSoloElevationMeters: 0.42,
      maximumSoloElevationMeters: 0.92,
      oneLifterElevationMeters: 0.58,
      twoLifterElevationMeters: 0.92,
      minimumDurationMs: 720,
      maximumDurationMs: 1_080,
      minimumApexHoldDurationMs: 120,
      maximumApexHoldDurationMs: 620,
      lifterStrengthHoldWeight: 0.6,
      jumperTechniqueHoldWeight: 0.4,
      oneLifterHoldDurationMultiplier: 0.65,
      feintDurationMs: 360,
      feintElevationMeters: 0.12,
      lifterReachMeters: 1.95,
      singleRearLifterMinimumStrengthExclusive: 70,
      singleRearLifterMinimumJumperSpeedExclusive: 70,
      singleRearLifterMinimumJumperTechniqueExclusive: 70
    },
    trajectory: {
      startHeightMeters: 1.92,
      preciseTargetHeightMeters: 3.05,
      lowTargetHeightMeters: 2.35,
      highTargetHeightMeters: 3.78,
      preciseLaunchAngleDegrees: 48,
      lowLaunchAngleDegrees: 34,
      highLaunchAngleDegrees: 58,
      minimumTargetDescentSlope: 0.08,
      shadowReferenceHeightMeters: 8.5,
      notStraightLateralMeters: 0.68,
      maximumLateralErrorMeters: 1.15
    },
    throwing: {
      minimumDepthErrorMeters: 0.12,
      maximumDepthErrorMeters: 1.65,
      minimumHeightErrorMeters: 0.04,
      maximumHeightErrorMeters: 0.72,
      minimumLateralErrorMeters: 0.03,
      maximumLateralErrorMeters: 0.9
    },
    throwFeedback: {
      perfectDepthToleranceMeters: 0.25,
      closeDepthToleranceMeters: 0.85
    },
    resultFeedback: {
      edgeWidthPixels: 46,
      edgeOpacity: 0.78,
      edgeFalloffExponent: 1.6,
      riseDurationMs: 140,
      holdDurationMs: 220,
      fadeDurationMs: 600
    },
    camera: {
      // Le rapprochement rapide au lâcher accentue l'impulsion du ballon.
      releaseZoom: 1.10,
      flightZoom: 1.14,
      contestZoom: 1.06,
      receptionZoom: 1.035,
      horizontalFollowRatio: 0.25,
      verticalFollowRatio: 0.18,
      maximumHorizontalShiftPixels: 8,
      maximumVerticalShiftPixels: 12,
      responseDurationMs: 120,
      flightResponseDurationMs: 80,
      releaseRampDurationMs: 220,
      resultHoldDurationMs: 220,
      returnDurationMs: 450,
      cleanupDelayMs: 720,
      contestShakeDurationMs: 80,
      contestShakeIntensity: 0.002
    },
    reach: {
      depthMeters: 0.48,
      lateralMeters: 0.9,
      heightMeters: 0.38,
      maximumSimulationStepMs: 16,
      simultaneousWindowMs: 85,
      groundCatchMaximumHeightMeters: 2.25
    },
    resolution: {
      singleCatchThreshold: 48,
      cleanCatchThreshold: 70,
      cleanDuelMargin: 9,
      techniqueWeight: 0.62,
      reachWeight: 0.28,
      speedWeight: 0.1,
      randomAmplitude: 4,
      throwingTeamInitiative: 3,
      fatigueMaximumPenalty: 18,
      movingCatchScorePenalty: 12,
      movingKnockOnProbabilityBonus: 0.08
    }
  },
  generation: {
    roleThreshold: 60,
    clubModifiers: [-3, 0, 3],
    qualityOffsets: [-5, -3, -1, 0, 1, 3, 5],
    genericRandomAmplitude: 4,
    pointStrengthMinimumGapByDivision: {
      regionale_3: 6,
      regionale_2: 6,
      regionale_1: 6,
      federale_3: 6,
      federale_2: 6,
      federale_1: 6,
      nationale_2: 6,
      nationale: 5,
      pro_d2: 4,
      top_14: 2
    },
    regionale3: {
      exceptionalRosterProbabilityPercent: 10,
      usualMaximum: 79,
      exceptionalMinimum: 80,
      exceptionalMaximum: 84,
      ranges: {
        lifter: {
          speed: { minimum: 25, maximum: 45 },
          strength: { minimum: 65, maximum: 74 },
          technique: { minimum: 25, maximum: 45 }
        },
        techniqueHybrid: {
          speed: { minimum: 45, maximum: 65 },
          strength: { minimum: 60, maximum: 70 },
          technique: { minimum: 68, maximum: 79 }
        },
        strengthHybrid: {
          speed: { minimum: 40, maximum: 60 },
          strength: { minimum: 68, maximum: 79 },
          technique: { minimum: 60, maximum: 68 }
        },
        jumper: {
          speed: { minimum: 45, maximum: 70 },
          strength: { minimum: 25, maximum: 45 },
          technique: { minimum: 70, maximum: 79 }
        },
        speedHybrid: {
          speed: { minimum: 68, maximum: 79 },
          strength: { minimum: 60, maximum: 68 },
          technique: { minimum: 60, maximum: 70 }
        }
      }
    },
    profileOffsets: {
      lifter: { speed: 0, strength: 10, technique: -16 },
      techniqueHybrid: { speed: -5, strength: 2, technique: 9 },
      strengthHybrid: { speed: -8, strength: 10, technique: 2 },
      jumper: { speed: 0, strength: -16, technique: 10 },
      speedHybrid: { speed: 10, strength: 0, technique: 2 }
    },
    divisionStats: {
      regionale_3: { mean: 60, minimum: 50, maximum: 70 },
      regionale_2: { mean: 65, minimum: 55, maximum: 75 },
      regionale_1: { mean: 70, minimum: 60, maximum: 80 },
      federale_3: { mean: 74, minimum: 64, maximum: 84 },
      federale_2: { mean: 78, minimum: 68, maximum: 88 },
      federale_1: { mean: 82, minimum: 72, maximum: 92 },
      nationale_2: { mean: 85, minimum: 75, maximum: 95 },
      nationale: { mean: 88, minimum: 78, maximum: 98 },
      pro_d2: { mean: 91, minimum: 82, maximum: 100 },
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
  progression: {
    statMaximum: 99,
    difficultyStartsAt: 60,
    statPointsPerDifficultyStep: 10,
    baseUsesPerLevel: {
      speed: 2,
      strength: 2,
      technique: 3,
      throwing: 3
    },
    additionalUsesPerDifficultyStep: 1
  },
  ai: {
    maximumNonAerialCombinationRatio: 1 / 3,
    offensivePlanByDivision: {
      regionale_3: { minimumPhases: 1, maximumPhases: 1, maximumFeints: 0, movementProbability: 0 },
      regionale_2: { minimumPhases: 1, maximumPhases: 2, maximumFeints: 1, movementProbability: 0 },
      regionale_1: { minimumPhases: 2, maximumPhases: 2, maximumFeints: 1, movementProbability: 0 },
      federale_3: { minimumPhases: 2, maximumPhases: 2, maximumFeints: 1, movementProbability: 0.1 },
      federale_2: { minimumPhases: 2, maximumPhases: 4, maximumFeints: 2, movementProbability: 0.25 },
      federale_1: { minimumPhases: 3, maximumPhases: 4, maximumFeints: 2, movementProbability: 0.4 },
      nationale_2: { minimumPhases: 3, maximumPhases: 4, maximumFeints: 2, movementProbability: 0.55 },
      nationale: { minimumPhases: 3, maximumPhases: 4, maximumFeints: 2, movementProbability: 0.7 },
      pro_d2: { minimumPhases: 4, maximumPhases: 4, maximumFeints: 3, movementProbability: 0.85 },
      top_14: { minimumPhases: 4, maximumPhases: 4, maximumFeints: 3, movementProbability: 1 }
    },
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
    simulatedMinutesPerRealSecond: 6,
    pitchLengthMeters: 100,
    simulationStepMinutes: 0.5,
    halfTimeMinuteOptions: [40.5, 41.5],
    movement: {
      strongProgress: { probability: 0.15, minimumMeters: 4, maximumMeters: 8 },
      normalProgress: { probability: 0.45, minimumMeters: 1, maximumMeters: 4 },
      stagnation: { probability: 0.25, minimumMeters: -1, maximumMeters: 1 },
      retreat: { probability: 0.15, minimumMeters: 1, maximumMeters: 4 }
    },
    breakthrough: {
      probabilityPerMinute: 0.05,
      minimumMeters: 10,
      maximumMeters: 40,
      centerProbabilityMultiplier: 0.65,
      wingProbabilityMultiplier: 1.8
    },
    clearanceKick: {
      probabilityFromOwn22: 0.78,
      playerLandingMinimumMeters: 35,
      playerLandingMaximumMeters: 70,
      opponentLandingMinimumMeters: 30,
      opponentLandingMaximumMeters: 65
    },
    maximumSkillProbabilityAdjustment: 0.05,
    turnoverProbabilityPerMinute: 0.05,
    minimumPossessionMinutesBeforeTurnover: 1.5,
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
    tryEligibilityLineoutWindowMinutes: 20,
    scoringOpportunityProbabilityPerMinute: 0.35,
    penaltyProbabilityOutsideAttacking22: 0.35,
    cleanLineoutProgressMeters: 5,
    tryLineFallbackMeters: 1,
    points: {
      penalty: 3,
      unconvertedTry: 5,
      convertedTry: 7
    },
    restartPositionMeters: 50,
    restartLandingMinimumDistanceFromTryLineMeters: 22,
    restartLandingMaximumDistanceFromTryLineMeters: 40,
    restartDiagonalProbability: 0.85,
    restartDiagonalMinimumLateralRatio: 0.28,
    restartDiagonalMaximumLateralRatio: 0.78,
    restartCentralMaximumLateralRatio: 0.12,
    visualSimulation: {
      ballFlightDurationRatio: 0.88,
      passVerticalDistancePixels: 50,
      passLateralLaneRatios: [-0.55, 0.15, 0.88, 0.48, -0.2, -0.9, -0.42, 0.05, 0.78, 0.3],
      passSameDirectionProbability: 0.75,
      passLateralStepMinimum: 0.18,
      passLateralStepMaximum: 0.48,
      passSidelineTurnThreshold: 0.78,
      passMaximumLateralPosition: 0.92,
      passDepthMinimumAngleDegrees: 5,
      passDepthRandomMinimumAngleDegrees: 10,
      passDepthMaximumAngleDegrees: 45,
      passMinimumAngleProbabilityAtMinimumDistance: 0.75,
      passMinimumAngleProbabilityAtMaximumDistance: 0.2,
      passDurationRatioMinimum: 2 / 3,
      passDurationRatioMaximum: 3 / 4,
      kickArcHeightPixels: 42,
      restartArcHeightPixels: 52,
      halfTimePauseDurationMs: 1600,
      halfTimeKickoffDurationMs: 850,
      tryCelebrationExtraDurationMs: 1200,
      tryCelebrationDisplayDurationMs: 800,
      lineoutTransition: {
        simulationZoomDurationMs: 650,
        simulationZoom: 3,
        lineoutArrivalDurationMs: 650,
        lineoutArrivalZoom: 0.82,
        lineoutExitDurationMs: 600,
        lineoutExitZoom: 0.82,
        simulationReturnDurationMs: 600,
        simulationReturnZoom: 2
      }
    },
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

