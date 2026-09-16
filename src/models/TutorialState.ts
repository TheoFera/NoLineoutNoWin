export type TutorialState = {
  enabled: boolean;
  introductionSeen: boolean;
};

/** Le parcours appartient au club, contrairement au réglage et à l'introduction. */
export type CoachTutorialProgress = {
  dialogueVersion?: number;
  matchesCompleted: number;
  steps: Record<string, number>;
  completed: string[];
  prepared: string[];
  firstRecruitId?: string;
  recruitmentUsed: boolean;
  pendingComment?: string;
};
