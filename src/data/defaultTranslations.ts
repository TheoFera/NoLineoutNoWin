import { GENERATED_LINEOUT_COMBINATIONS } from "./LineoutCombinations.ts";

export type Language = "fr" | "en";
export type TranslationKey = string;

const generatedCombinationTranslations: Record<
  TranslationKey,
  Record<Language, string>
> = Object.fromEntries(GENERATED_LINEOUT_COMBINATIONS.map((definition) => {
  const positions = definition.occupiedPositions.join("-");
  const playerCount = definition.occupiedPositions.length;
  return [
    `combo.${definition.id}`,
    {
      fr: `Alignement à ${playerCount} — positions ${positions}`,
      en: `${playerCount}-player lineout — positions ${positions}`
    }
  ];
}));

export const translations: Record<TranslationKey, Record<Language, string>> = {
  "app.title": { fr: "No Lineout No Win", en: "No Lineout No Win" },
  "app.tagline": { fr: "Jeu tactique de touche au rugby", en: "Tactical rugby lineout game" },
  "app.rugby15": { fr: "RUGBY À 15", en: "15-A-SIDE RUGBY" },
  "loading.message": { fr: "Chargement...", en: "Loading..." },
  "menu.newGame": { fr: "Nouvelle partie", en: "New game" },
  "menu.continue": { fr: "Continuer", en: "Continue" },
  "menu.training": { fr: "Entraînement", en: "Training" },
  "menu.team": { fr: "Équipe", en: "Team" },
  "menu.championship": { fr: "Championnat", en: "League" },
  "menu.options": { fr: "Options", en: "Options" },
  "club.title": { fr: "Créer ton club", en: "Create your club" },
  "club.defaultName": { fr: "RC Drancy", en: "Drancy RC" },
  "club.intro": {
    fr: "Choisis le nom et les couleurs de ton club avant de lancer la première partie.",
    en: "Choose your club name and colors before starting your first save."
  },
  "club.nameLabel": { fr: "Nom du club", en: "Club name" },
  "club.namePlaceholder": { fr: "Ex. RC Drancy", en: "E.g. Drancy RC" },
  "club.primaryColor": { fr: "Couleur principale", en: "Primary color" },
  "club.secondaryColor": { fr: "Couleur secondaire", en: "Secondary color" },
  "club.preview": { fr: "Maillot", en: "Kit" },
  "club.startGame": { fr: "Créer le club", en: "Create club" },
  "club.backMenu": { fr: "Retour", en: "Back" },
  "club.nameRequired": { fr: "Le nom du club est obligatoire.", en: "Club name is required." },
  "button.back": { fr: "Retour", en: "Back" },
  "button.ok": { fr: "OK", en: "OK" },
  "button.continue": { fr: "Continuer", en: "Continue" },
  "button.play": { fr: "Jouer", en: "Play" },
  "button.save": { fr: "Enregistrer", en: "Save" },
  "button.combinations": { fr: "Combinaisons", en: "Sets" },
  "button.rename": { fr: "Renommer", en: "Rename" },
  "button.editSymbol": { fr: "✎", en: "✎" },
  "button.close": { fr: "Fermer", en: "Close" },
  "button.cancel": { fr: "Annuler", en: "Cancel" },
  "button.delete": { fr: "Supprimer", en: "Delete" },
  "button.closeSymbol": { fr: "×", en: "×" },
  "button.defend": { fr: "Défendre", en: "Defend" },
  "button.resetSave": { fr: "Réinitialiser la partie", en: "Reset save" },
  "button.throw": { fr: "Lancer", en: "Throw" },
  "button.testLineout": { fr: "Tester la touche", en: "Test the lineout" },
  "match.title": { fr: "Match", en: "Match" },
  "match.possession": { fr: "Possession", en: "Possession" },
  "match.occupation": { fr: "Occupation", en: "Territory" },
  "match.phase.attack": { fr: "Attaque", en: "Attack" },
  "match.phase.defense": { fr: "Défense", en: "Defense" },
  "match.minuteSuffix": { fr: "e minute", en: " min" },
  "match.ourThrow": { fr: "Notre lancer", en: "Our throw" },
  "match.opponentThrow": { fr: "Lancer adverse", en: "Opponent throw" },
  "match.period.firstHalf": { fr: "1RE MT", en: "1ST HALF" },
  "match.period.secondHalf": { fr: "2E MT", en: "2ND HALF" },
  "match.zone": { fr: "Zone", en: "Zone" },
  "match.zone.our_22": { fr: "Nos 22 m", en: "Our 22" },
  "match.zone.our_half": { fr: "Notre camp", en: "Our half" },
  "match.zone.middle": { fr: "Milieu de terrain", en: "Midfield" },
  "match.zone.their_half": { fr: "Camp adverse", en: "Their half" },
  "match.zone.their_22": { fr: "Leurs 22 m", en: "Their 22" },
  "match.chooseCombination": { fr: "Choisis la combinaison", en: "Choose the set play" },
  "match.simulationInProgress": { fr: "Le match se poursuit", en: "The match continues" },
  "match.action.handPlay": { fr: "Jeu à la main", en: "Handling phase" },
  "match.action.ruck": { fr: "Point de fixation", en: "Ruck" },
  "match.action.clearanceKick": { fr: "Dégagement au pied", en: "Clearance kick" },
  "match.action.breakthrough": { fr: "Percée de {meters} m", en: "{meters} m break" },
  "match.action.lineout": { fr: "Ballon sorti en touche", en: "Ball into touch" },
  "match.action.penaltyScored": { fr: "Pénalité réussie", en: "Penalty scored" },
  "match.action.tryScored": { fr: "Essai !", en: "Try!" },
  "match.action.convertedTryScored": { fr: "Essai transformé !", en: "Converted try!" },
  "match.action.restart": { fr: "Remise en jeu au centre", en: "Restart from halfway" },
  "match.ballPosition": { fr: "Ballon à {meters} m", en: "Ball at {meters} m" },
  "match.lineoutDistance": { fr: "À {distance} m de la ligne", en: "{distance} m from the line" },
  "match.comboPlayers": { fr: "{count} joueurs", en: "{count} players" },
  "match.offensiveOverlay": { fr: "Touche dans {zone} pour {team}", en: "Lineout in {zone} for {team}" },
  "match.playLineout": { fr: "Jouer la touche", en: "Play the lineout" },
  "match.playersCount": { fr: "Alignement adverse : {count} joueurs", en: "Opponent lineout: {count} players" },
  "match.end": { fr: "Fin du match", en: "Full time" },
  "match.viewResult": { fr: "Voir le résultat", en: "View result" },
  "match.backTraining": { fr: "Retour à l'entraînement", en: "Back to training" },
  "match.playNow": { fr: "Jouer le match", en: "Play match" },
  "match.cannotStartTitle": { fr: "Match indisponible", en: "Match unavailable" },
  "match.cannotStartCombination": {
    fr: "Crée au moins une combinaison avec 2 joueurs pour lancer le match.",
    en: "Create at least one combination with 2 players to start the match."
  },
  "lineout.title": { fr: "Touche", en: "Lineout" },
  "lineout.hookerLabel": { fr: "Talonneur", en: "Hooker" },
  "lineout.targetHint": { fr: "Appuie sur un joueur entouré en vert pour lancer", en: "Tap a green-ringed player to throw" },
  "lineout.targetHintShort": { fr: "Choisis une cible entourée", en: "Choose a ringed target" },
  "lineout.trainingHint": { fr: "Fais glisser les joueurs pour construire la combinaison. L'alignement démarre vide.", en: "Drag players to build the combination. The lineout starts empty." },
  "lineout.defenseHint": { fr: "Réorganise ta défense puis appuie sur le sauteur à contester", en: "Reorder your defense, then tap the jumper to contest" },
  "lineout.defenseHintShort": { fr: "Glisse puis appuie", en: "Drag then tap" },
  "lineout.playerPanel.empty": { fr: "Sélectionne un joueur pour voir ses infos.", en: "Select a player to view details." },
  "lineout.role.jumper": { fr: "Sauteur", en: "Jumper" },
  "lineout.role.lifter": { fr: "Lifteur", en: "Lifter" },
  "lineout.status.selectTarget": { fr: "Choisis d'abord un joueur cible dans l'alignement.", en: "Choose a target player first." },
  "lineout.status.notJumper": { fr: "Ce joueur n'est pas un sauteur : choisis un vrai sauteur.", en: "This player is not a jumper: choose a real jumper." },
  "lineout.calc.summary": { fr: "Chance finale de réussite", en: "Final success chance" },
  "lineout.calc.finalChance": { fr: "Chance calculée", en: "Calculated chance" },
  "lineout.calc.throwing": { fr: "Qualité du lancer", en: "Throw quality" },
  "lineout.calc.jump": { fr: "Qualité du saut", en: "Jump quality" },
  "lineout.calc.lift": { fr: "Lift de soutien", en: "Lift support" },
  "lineout.calc.hands": { fr: "Jeu de mains", en: "Hands quality" },
  "lineout.calc.distance": { fr: "Difficulté de distance", en: "Distance factor" },
  "lineout.calc.pressure": { fr: "Contre adverse", en: "Opponent contest" },
  "lineout.matchBanner.us": { fr: "Touche dans {zone} pour {team}", en: "Lineout in {zone} for {team}" },
  "lineout.matchBanner.opponent": { fr: "Touche dans {zone} pour {team}", en: "Lineout in {zone} for {team}" },
  "lineout.matchFocus": { fr: "Le reste du match reste simulé", en: "The rest of the match stays simulated" },
  "lineout.combinationsTitle": { fr: "Combinaisons", en: "Combinations" },
  "lineout.renameTitle": { fr: "Renommer la combinaison", en: "Rename combination" },
  "lineout.renamePlaceholder": { fr: "Nom de la combinaison", en: "Combination name" },
  "lineout.fifteenLine": { fr: "Ligne des 15 m", en: "15 m line" },
  "lineout.touchLine": { fr: "Touche", en: "Touchline" },
  "lineout.reserveLabel": { fr: "Joueurs disponibles", en: "Available players" },
  "lineout.autoSaved": { fr: "Combinaison enregistrée", en: "Combination saved" },
  "lineout.result.won": { fr: "Ballon gagné", en: "Ball won" },
  "lineout.result.won_dirty": { fr: "Ballon gagné difficilement", en: "Ball won under pressure" },
  "lineout.result.lost": { fr: "Ballon perdu", en: "Ball lost" },
  "lineout.result.fault": { fr: "Faute", en: "Fault" },
  "lineout.result.details": { fr: "Détails", en: "Details" },
  "lineout.result.detailsTitle": { fr: "Détail de la touche", en: "Lineout details" },
  "lineout.outcome.cleanWin": { fr: "Touche propre", en: "Clean win" },
  "lineout.outcome.scrappyWin": { fr: "Touche gagnée difficilement", en: "Scrappy win" },
  "lineout.outcome.deflectedTurnover": { fr: "Ballon contré et perdu", en: "Deflected turnover" },
  "lineout.outcome.cleanSteal": { fr: "Ballon volé proprement", en: "Clean steal" },
  "lineout.outcome.knockOn": { fr: "En-avant", en: "Knock-on" },
  "lineout.outcome.notStraight": { fr: "Lancer pas droit", en: "Not straight" },
  "lineout.outcome.looseBall": { fr: "Ballon non récupéré", en: "Unrecovered ball" },
  "lineout.presentation.title.won": { fr: "Touche gagnée", en: "Lineout won" },
  "lineout.presentation.title.wonScrappy": { fr: "Touche gagnée difficilement", en: "Lineout won under pressure" },
  "lineout.presentation.title.deflected": { fr: "Touche contrée", en: "Lineout disrupted" },
  "lineout.presentation.title.lost": { fr: "Touche perdue", en: "Lineout lost" },
  "lineout.presentation.title.recovered": { fr: "Touche récupérée", en: "Lineout recovered" },
  "lineout.presentation.title.ballLost": { fr: "Perte du ballon", en: "Ball lost" },
  "lineout.presentation.title.jumperKnockOn": { fr: "En-avant du sauteur", en: "Jumper knock-on" },
  "lineout.presentation.title.targetKnockOn": { fr: "En-avant du joueur visé", en: "Target player knock-on" },
  "lineout.presentation.title.opponentKnockOn": { fr: "En-avant adverse", en: "Opponent knock-on" },
  "lineout.presentation.title.notStraight": { fr: "Lancer pas droit", en: "Not-straight throw" },
  "lineout.presentation.title.opponentNotStraight": { fr: "Lancer adverse pas droit", en: "Opponent throw not straight" },
  "lineout.presentation.title.highBall": { fr: "Ballon trop haut", en: "Throw too high" },
  "lineout.presentation.title.beyondFifteen": { fr: "Ballon au-delà des 15 mètres", en: "Ball beyond 15 metres" },
  "lineout.presentation.title.groundRecovered": { fr: "Ballon récupéré au sol", en: "Ball recovered on the ground" },
  "lineout.presentation.title.groundLost": { fr: "Ballon perdu au sol", en: "Ball lost on the ground" },
  "lineout.presentation.title.secondaryKnockOn": { fr: "En-avant à la récupération", en: "Knock-on during recovery" },
  "lineout.detail.targetPosition": { fr: "Position visée", en: "Target position" },
  "lineout.detail.trajectory": { fr: "Trajectoire", en: "Trajectory" },
  "lineout.detail.throwQuality": { fr: "Qualité du lancer", en: "Throw quality" },
  "lineout.detail.attackJump": { fr: "Qualité du saut offensif", en: "Attacking jump quality" },
  "lineout.detail.defenseJump": { fr: "Qualité du saut défensif", en: "Defending jump quality" },
  "lineout.detail.reception": { fr: "Qualité de la réception", en: "Reception quality" },
  "lineout.detail.attackDuel": { fr: "Score du duel offensif", en: "Attacking duel score" },
  "lineout.detail.defenseDuel": { fr: "Score du duel défensif", en: "Defending duel score" },
  "lineout.detail.counter": { fr: "Score du contre", en: "Counter score" },
  "lineout.detail.possessionAfter": { fr: "Possession après la touche", en: "Possession after the lineout" },
  "lineout.team.throwingTeam": { fr: "Équipe qui lance", en: "Throwing team" },
  "lineout.team.defendingTeam": { fr: "Équipe qui défend", en: "Defending team" },
  "lineout.trajectory.notStraight": { fr: "Pas droite", en: "Not straight" },
  "lineout.trajectory.precise": { fr: "Précise", en: "Precise" },
  "lineout.trajectory.low": { fr: "Basse", en: "Low" },
  "lineout.trajectory.high": { fr: "Haute", en: "High" },
  "lineout.reason.notStraight": { fr: "Le lancer sort du couloir et l'arbitre accorde une mêlée.", en: "The throw leaves the corridor and a scrum is awarded." },
  "lineout.reason.counterDeflected": { fr: "Le contre placé devant la cible dévie le ballon.", en: "The contest ahead of the target deflects the ball." },
  "lineout.reason.counterCleanSteal": { fr: "Le contre placé devant la cible contrôle directement le ballon.", en: "The contest ahead of the target controls the ball cleanly." },
  "lineout.reason.blockReceptionClean": { fr: "Le bloc de saut domine et sécurise une sortie propre.", en: "The lifting pod dominates and secures clean ball." },
  "lineout.reason.blockReceptionScrappy": { fr: "Le bloc capte le ballon, mais sans maîtrise complète.", en: "The lifting pod catches the ball without full control." },
  "lineout.reason.blockReceptionMissed": { fr: "Le bloc ne parvient pas à contrôler la trajectoire.", en: "The lifting pod fails to control the trajectory." },
  "lineout.reason.duelDeflected": { fr: "Le duel au même niveau provoque une déviation défensive.", en: "The same-position duel causes a defensive deflection." },
  "lineout.reason.duelCleanSteal": { fr: "Le défenseur remporte nettement le duel aérien.", en: "The defender clearly wins the aerial duel." },
  "lineout.reason.attackingKnockOn": { fr: "L'équipe qui lance perd le contrôle vers l'avant.", en: "The throwing team loses the ball forward." },
  "lineout.reason.duelWonClean": { fr: "Le sauteur offensif remporte proprement le duel.", en: "The attacking jumper wins the duel cleanly." },
  "lineout.reason.duelWonScrappy": { fr: "Le sauteur offensif gagne le duel sous pression.", en: "The attacking jumper wins the duel under pressure." },
  "lineout.reason.defendingKnockOn": { fr: "Le défenseur touche le ballon puis commet un en-avant.", en: "The defender touches the ball and knocks it on." },
  "lineout.reason.directReceptionMissed": { fr: "La réception directe échoue et personne ne récupère immédiatement le ballon.", en: "The direct catch fails and nobody immediately recovers the ball." },
  "lineout.reason.directReceptionClean": { fr: "Le réceptionneur contrôle directement le lancer.", en: "The receiver controls the throw directly." },
  "lineout.reason.directReceptionScrappy": { fr: "Le réceptionneur conserve difficilement le lancer direct.", en: "The receiver scrappily retains the direct throw." },
  "lineout.reason.highBallLoose": { fr: "Le ballon dépasse la ligne des 15 mètres sans être capté.", en: "The ball travels beyond the 15-metre line without being caught." },
  "lineout.reason.highBallRecoveredClean": { fr: "L'attaque récupère proprement le ballon haut.", en: "The attack cleanly recovers the high ball." },
  "lineout.reason.highBallRecoveredScrappy": { fr: "L'attaque récupère difficilement le ballon haut.", en: "The attack scrappily recovers the high ball." },
  "lineout.reason.highBallStolenClean": { fr: "La défense récupère proprement le ballon haut.", en: "The defense cleanly recovers the high ball." },
  "lineout.reason.highBallStolenScrappy": { fr: "La défense récupère difficilement le ballon haut.", en: "The defense scrappily recovers the high ball." },
  "lineout.reason.secondaryRecoveredClean": { fr: "Un joueur placé sur la trajectoire capte proprement le ballon.", en: "A player on the ball's path catches it cleanly." },
  "lineout.reason.secondaryRecoveredScrappy": { fr: "Un joueur de l'équipe qui lance parvient à capter le ballon dans la continuité.", en: "A player from the throwing team manages to catch the continuing ball." },
  "lineout.reason.secondaryStolenClean": { fr: "Un joueur adverse placé sur la trajectoire capte proprement le ballon.", en: "An opposing player on the ball's path catches it cleanly." },
  "lineout.reason.secondaryStolenScrappy": { fr: "Un joueur adverse parvient à capter le ballon dans la continuité.", en: "An opposing player manages to catch the continuing ball." },
  "lineout.reason.groundRecoveredByThrowingTeam": { fr: "Le ballon tombe dans l'alignement et un joueur de l'équipe qui lance s'en saisit.", en: "The ball falls in the lineout and a player from the throwing team gathers it." },
  "lineout.reason.groundRecoveredByDefendingTeam": { fr: "Le ballon tombe dans l'alignement et un défenseur s'en saisit.", en: "The ball falls in the lineout and a defender gathers it." },
  "lineout.explanation.clean": { fr: "Sortie propre vers le 9.", en: "Clean ball to the scrum-half." },
  "lineout.explanation.dirty": { fr: "Ballon conservé mais sortie ralentie.", en: "Ball retained but slowed down." },
  "lineout.explanation.lost": { fr: "L'adversaire récupère la possession.", en: "The opponent recovers possession." },
  "lineout.explanation.fault": { fr: "Lancer pas droit sifflé.", en: "Not-straight throw called." },
  "lineout.explanation.defenseStolen": { fr: "Ton sauteur intercepte et capte le ballon.", en: "Your jumper intercepts and catches the ball." },
  "lineout.explanation.defenseContested": { fr: "Touche fortement gênée, mais ballon mal négocié par l'adversaire.", en: "Heavy pressure disrupted the opponent lineout." },
  "lineout.explanation.defenseBeaten": { fr: "Bonne lecture, mais l'adversaire sécurise quand même son ballon.", en: "Good read, but the opponent still secures the ball." },
  "lineout.explanation.defenseLate": { fr: "Le contre part trop loin de la cible : l'adversaire garde une touche propre.", en: "The contest was too far from the target." },
  "lineout.explanation.defenseMissed": { fr: "Aucun sauteur contesté : l'adversaire gagne facilement la touche.", en: "No contest on the jump: easy opponent ball." },
  "lineout.explanation.opponentNotStraight": { fr: "Le lancer adverse n'est pas droit : mêlée pour ton équipe.", en: "The opponent throw is not straight: your team gets the scrum." },
  "lineout.explanation.ourKnockOn": { fr: "Ton équipe commet un en-avant : mêlée pour l'adversaire.", en: "Your team knocks on: opposition scrum." },
  "lineout.explanation.opponentKnockOn": { fr: "L'adversaire commet un en-avant : mêlée pour ton équipe.", en: "The opponent knocks on: your team gets the scrum." },
  "lineout.explanation.looseBallWon": { fr: "Personne ne capte le ballon proprement, puis ton équipe le récupère dans la continuité.", en: "Nobody secures the ball cleanly before your team recovers it in open play." },
  "lineout.explanation.looseBallLost": { fr: "Personne ne capte le ballon proprement, puis l'adversaire le récupère dans la continuité.", en: "Nobody secures the ball cleanly before the opponent recovers it in open play." },
  "lineout.explanation.highBallLooseWon": { fr: "Le ballon est lancé trop haut et retombe au-delà des 15 m. Ton équipe le récupère ensuite.", en: "The throw is too high and lands beyond the 15-metre area. Your team then recovers it." },
  "lineout.explanation.highBallLooseLost": { fr: "Le ballon est lancé trop haut et retombe au-delà des 15 m. L'adversaire le récupère ensuite.", en: "The throw is too high and lands beyond the 15-metre area. The opponent then recovers it." },
  "lineout.explanation.invalidSetup": { fr: "La cible choisie n'est pas correctement placée dans l'alignement.", en: "The selected target is not correctly assigned in the lineout." },
  "lineout.explanation.attackClean": {
    fr: "Le joueur visé capte proprement le ballon. Ton équipe peut jouer rapidement.",
    en: "The target player catches the ball cleanly. Your team can play quickly."
  },
  "lineout.explanation.attackScrappy": {
    fr: "Le joueur visé capte difficilement le ballon. Ton équipe conserve la possession, mais le jeu est ralenti.",
    en: "The target player catches the ball under pressure. Your team keeps possession, but play is slowed down."
  },
  "lineout.explanation.attackDeflected": {
    fr: "Le sauteur adverse dévie le ballon. Un joueur adverse s'en saisit.",
    en: "The opposing jumper deflects the ball. An opponent gathers it."
  },
  "lineout.explanation.attackStolen": {
    fr: "Le sauteur adverse intercepte et capte le ballon.",
    en: "The opposing jumper intercepts and catches the ball."
  },
  "lineout.explanation.defenseCleanLost": {
    fr: "L'adversaire capte proprement le ballon et conserve sa touche.",
    en: "The opponent catches the ball cleanly and keeps their lineout."
  },
  "lineout.explanation.defenseScrappyLost": {
    fr: "L'adversaire capte difficilement le ballon, mais conserve sa touche.",
    en: "The opponent catches the ball under pressure but keeps their lineout."
  },
  "lineout.explanation.defenseDeflected": {
    fr: "Ton sauteur dévie le ballon. Un joueur de ton équipe s'en saisit.",
    en: "Your jumper deflects the ball. One of your players gathers it."
  },
  "lineout.explanation.attackJumperKnockOn": {
    fr: "Ton sauteur ne contrôle pas bien le ballon et commet un en-avant. Mêlée pour l'adversaire.",
    en: "Your jumper fails to control the ball and knocks it on. Scrum to the opponent."
  },
  "lineout.explanation.attackDirectKnockOn": {
    fr: "Le joueur visé ne contrôle pas bien le ballon et commet un en-avant. Mêlée pour l'adversaire.",
    en: "The target player fails to control the ball and knocks it on. Scrum to the opponent."
  },
  "lineout.explanation.attackOpponentKnockOn": {
    fr: "Le sauteur adverse tente d'intercepter le ballon, mais commet un en-avant. Mêlée pour ton équipe.",
    en: "The opposing jumper tries to intercept the ball but knocks it on. Scrum to your team."
  },
  "lineout.explanation.defenseOurKnockOn": {
    fr: "Ton sauteur tente d'intercepter le ballon, mais commet un en-avant. Mêlée pour l'adversaire.",
    en: "Your jumper tries to intercept the ball but knocks it on. Scrum to the opponent."
  },
  "lineout.explanation.defenseOpponentKnockOn": {
    fr: "Le sauteur adverse ne contrôle pas bien le ballon et commet un en-avant. Mêlée pour ton équipe.",
    en: "The opposing jumper fails to control the ball and knocks it on. Scrum to your team."
  },
  "lineout.explanation.attackNotStraight": {
    fr: "Le lancer de ton talonneur n'est pas droit. Mêlée pour l'adversaire.",
    en: "Your hooker's throw is not straight. Scrum to the opponent."
  },
  "lineout.explanation.defenseNotStraight": {
    fr: "Le lancer du talonneur adverse n'est pas droit. Mêlée pour ton équipe.",
    en: "The opposing hooker's throw is not straight. Scrum to your team."
  },
  "lineout.explanation.attackLooseWon": {
    fr: "Le ballon n'est pas capté par ton sauteur, mais il poursuit sa trajectoire et un joueur de ton équipe s'en saisit.",
    en: "Your jumper does not catch the ball, but it continues on its path and one of your players gathers it."
  },
  "lineout.explanation.attackLooseLost": {
    fr: "Le ballon n'est pas capté par ton sauteur et il est attrapé par un joueur de l'équipe adverse.",
    en: "Your jumper does not catch the ball and an opposing player catches it."
  },
  "lineout.explanation.attackDirectLooseWon": {
    fr: "Le ballon n'est pas capté par le joueur visé, mais il poursuit sa trajectoire et un joueur de ton équipe s'en saisit.",
    en: "The target player does not catch the ball, but it continues on its path and one of your players gathers it."
  },
  "lineout.explanation.attackDirectLooseLost": {
    fr: "Le ballon n'est pas capté par le joueur visé et il est attrapé par un joueur de l'équipe adverse.",
    en: "The target player does not catch the ball and an opposing player catches it."
  },
  "lineout.explanation.defenseLooseWon": {
    fr: "Le sauteur adverse ne parvient pas à attraper le ballon, qui poursuit sa trajectoire et est récupéré par un joueur de ton équipe.",
    en: "The opposing jumper fails to catch the ball, which continues on its path and is gathered by one of your players."
  },
  "lineout.explanation.defenseLooseLost": {
    fr: "Le sauteur adverse ne parvient pas à attraper le ballon, mais l'un de ses coéquipiers arrive à s'en saisir.",
    en: "The opposing jumper fails to catch the ball, but one of their teammates manages to gather it."
  },
  "lineout.explanation.defenseDirectLooseWon": {
    fr: "Le joueur adverse visé ne parvient pas à attraper le ballon, qui poursuit sa trajectoire et est récupéré par un joueur de ton équipe.",
    en: "The opposing target player fails to catch the ball, which continues on its path and is gathered by one of your players."
  },
  "lineout.explanation.defenseDirectLooseLost": {
    fr: "Le joueur adverse visé ne parvient pas à attraper le ballon, mais l'un de ses coéquipiers arrive à s'en saisir.",
    en: "The opposing target player fails to catch the ball, but one of their teammates manages to gather it."
  },
  "lineout.explanation.attackHighBallWon": {
    fr: "Le ballon dépasse la ligne des 15 mètres sans être capté, mais un joueur de ton équipe arrive à le récupérer.",
    en: "The ball travels beyond the 15-metre line without being caught, but one of your players manages to recover it."
  },
  "lineout.explanation.attackHighBallLost": {
    fr: "Le ballon dépasse la ligne des 15 mètres sans être capté et un joueur de l'équipe adverse arrive à le récupérer.",
    en: "The ball travels beyond the 15-metre line without being caught and an opposing player manages to recover it."
  },
  "lineout.explanation.defenseHighBallWon": {
    fr: "Le ballon dépasse la ligne des 15 mètres sans être capté, mais un joueur de ton équipe arrive à le récupérer.",
    en: "The ball travels beyond the 15-metre line without being caught, but one of your players manages to recover it."
  },
  "lineout.explanation.defenseHighBallLost": {
    fr: "Le ballon dépasse la ligne des 15 mètres sans être capté, mais un joueur de l'équipe adverse arrive à le récupérer.",
    en: "The ball travels beyond the 15-metre line without being caught, but an opposing player manages to recover it."
  },
  "lineout.explanation.cause.attack.jump.precise.success": {
    fr: "Le lancer arrive à la bonne hauteur et le saut est réussi, mais ton sauteur ne parvient pas à capter le ballon.",
    en: "The throw arrives at the right height and the jump succeeds, but your jumper cannot catch the ball."
  },
  "lineout.explanation.cause.attack.jump.precise.failed": {
    fr: "Le lancer arrive à la bonne hauteur, mais le saut de ton sauteur est raté. Il ne peut pas atteindre le ballon.",
    en: "The throw arrives at the right height, but your jumper mistimes the jump and cannot reach the ball."
  },
  "lineout.explanation.cause.attack.jump.low.success": {
    fr: "Le lancer est trop bas. Malgré un saut réussi, le ballon arrive d'abord à hauteur des joueurs placés devant ton sauteur.",
    en: "The throw is too low. Despite a successful jump, the ball first reaches the players in front of your jumper."
  },
  "lineout.explanation.cause.attack.jump.low.failed": {
    fr: "Le lancer est trop bas et le saut de ton sauteur est raté.",
    en: "The throw is too low and your jumper mistimes the jump."
  },
  "lineout.explanation.cause.attack.jump.high.success": {
    fr: "Le lancer est trop haut. Malgré un saut réussi, ton sauteur ne parvient pas à capter le ballon.",
    en: "The throw is too high. Despite a successful jump, your jumper cannot catch the ball."
  },
  "lineout.explanation.cause.attack.jump.high.failed": {
    fr: "Le lancer est trop haut et le saut de ton sauteur est raté. Ton sauteur ne peut pas atteindre le ballon.",
    en: "The throw is too high and your jumper mistimes the jump, so the ball is out of reach."
  },
  "lineout.explanation.cause.attack.direct.precise": {
    fr: "Le lancer direct arrive à la bonne hauteur, mais le joueur visé ne parvient pas à capter le ballon.",
    en: "The direct throw arrives at the right height, but the target player cannot catch the ball."
  },
  "lineout.explanation.cause.attack.direct.low": {
    fr: "Le lancer direct est trop bas. Le ballon arrive d'abord à hauteur des joueurs placés devant le joueur visé.",
    en: "The direct throw is too low. The ball first reaches the players in front of the target player."
  },
  "lineout.explanation.cause.attack.direct.high": {
    fr: "Le lancer direct est trop haut. Comme le joueur visé n'est pas lifté, le ballon passe au-dessus de lui.",
    en: "The direct throw is too high. Because the target player is not lifted, the ball travels over him."
  },
  "lineout.explanation.cause.defense.jump.precise.success": {
    fr: "Le lancer adverse arrive à la bonne hauteur et le saut est réussi, mais le sauteur adverse ne parvient pas à capter le ballon.",
    en: "The opposing throw arrives at the right height and the jump succeeds, but the opposing jumper cannot catch the ball."
  },
  "lineout.explanation.cause.defense.jump.precise.failed": {
    fr: "Le lancer adverse arrive à la bonne hauteur, mais le saut du sauteur adverse est raté. Il ne peut pas atteindre le ballon.",
    en: "The opposing throw arrives at the right height, but the opposing jumper mistimes the jump and cannot reach the ball."
  },
  "lineout.explanation.cause.defense.jump.low.success": {
    fr: "Le lancer adverse est trop bas. Malgré un saut réussi, le ballon arrive d'abord à hauteur des joueurs placés devant le sauteur adverse.",
    en: "The opposing throw is too low. Despite a successful jump, the ball first reaches the players in front of the opposing jumper."
  },
  "lineout.explanation.cause.defense.jump.low.failed": {
    fr: "Le lancer adverse est trop bas et le saut du sauteur adverse est raté.",
    en: "The opposing throw is too low and the opposing jumper mistimes the jump."
  },
  "lineout.explanation.cause.defense.jump.high.success": {
    fr: "Le lancer adverse est trop haut. Malgré un saut réussi, le sauteur adverse ne parvient pas à capter le ballon.",
    en: "The opposing throw is too high. Despite a successful jump, the opposing jumper cannot catch the ball."
  },
  "lineout.explanation.cause.defense.jump.high.failed": {
    fr: "Le lancer adverse est trop haut et le saut du sauteur adverse est raté. Le sauteur adverse ne peut pas atteindre le ballon.",
    en: "The opposing throw is too high and the opposing jumper mistimes the jump, so the ball is out of reach."
  },
  "lineout.explanation.cause.defense.direct.precise": {
    fr: "Le lancer direct adverse arrive à la bonne hauteur, mais le joueur adverse visé ne parvient pas à capter le ballon.",
    en: "The opposing direct throw arrives at the right height, but the target player cannot catch the ball."
  },
  "lineout.explanation.cause.defense.direct.low": {
    fr: "Le lancer direct adverse est trop bas. Le ballon arrive d'abord à hauteur des joueurs placés devant le joueur adverse visé.",
    en: "The opposing direct throw is too low. The ball first reaches the players in front of the target player."
  },
  "lineout.explanation.cause.defense.direct.high": {
    fr: "Le lancer direct adverse est trop haut. Comme le joueur adverse visé n'est pas lifté, le ballon passe au-dessus de lui.",
    en: "The opposing direct throw is too high. Because the target player is not lifted, the ball travels over him."
  },
  "lineout.explanation.target.attack.jump.precise.success": {
    fr: "Le lancer arrive à la bonne hauteur et ton sauteur capte le ballon.",
    en: "The throw arrives at the right height and your jumper catches the ball."
  },
  "lineout.explanation.target.attack.jump.low.success": {
    fr: "Le lancer est trop bas. Aucun joueur placé devant ne le capte et ton sauteur parvient finalement à contrôler le ballon.",
    en: "The throw is too low. No player in front catches it, and your jumper eventually controls the ball."
  },
  "lineout.explanation.target.attack.jump.low.failed": {
    fr: "Le lancer est trop bas et le saut est raté. Après l'échec des joueurs placés devant lui, ton sauteur parvient néanmoins à récupérer le ballon sans être lifté.",
    en: "The throw is too low and the jump fails. After the players in front miss it, your jumper still gathers the ball without being lifted."
  },
  "lineout.explanation.target.attack.jump.high.success": {
    fr: "Le lancer est trop haut. Malgré la difficulté, ton sauteur profite de son saut réussi pour capter le ballon.",
    en: "The throw is too high. Despite the difficulty, your jumper uses a successful jump to catch the ball."
  },
  "lineout.explanation.target.attack.direct.precise": {
    fr: "Le lancer direct arrive à la bonne hauteur et le joueur visé capte le ballon.",
    en: "The direct throw arrives at the right height and the target player catches the ball."
  },
  "lineout.explanation.target.attack.direct.low": {
    fr: "Le lancer direct est trop bas. Aucun joueur placé devant ne le capte et le joueur visé parvient finalement à récupérer le ballon.",
    en: "The direct throw is too low. No player in front catches it, and the target player eventually gathers the ball."
  },
  "lineout.explanation.target.attack.direct.high": {
    fr: "Le lancer direct est trop haut, mais le joueur visé parvient tout de même à capter le ballon.",
    en: "The direct throw is too high, but the target player still manages to catch the ball."
  },
  "lineout.explanation.target.defense.jump.precise.success": {
    fr: "Le lancer adverse arrive à la bonne hauteur et le sauteur adverse capte le ballon.",
    en: "The opposing throw arrives at the right height and the opposing jumper catches the ball."
  },
  "lineout.explanation.target.defense.jump.low.success": {
    fr: "Le lancer adverse est trop bas. Aucun joueur placé devant ne le capte et le sauteur adverse parvient finalement à contrôler le ballon.",
    en: "The opposing throw is too low. No player in front catches it, and the opposing jumper eventually controls the ball."
  },
  "lineout.explanation.target.defense.jump.low.failed": {
    fr: "Le lancer adverse est trop bas et le saut est raté. Après l'échec des joueurs placés devant lui, le sauteur adverse parvient néanmoins à récupérer le ballon sans être lifté.",
    en: "The opposing throw is too low and the jump fails. After the players in front miss it, the opposing jumper still gathers the ball without being lifted."
  },
  "lineout.explanation.target.defense.jump.high.success": {
    fr: "Le lancer adverse est trop haut. Malgré la difficulté, le sauteur adverse profite de son saut réussi pour capter le ballon.",
    en: "The opposing throw is too high. Despite the difficulty, the opposing jumper uses a successful jump to catch the ball."
  },
  "lineout.explanation.target.defense.direct.precise": {
    fr: "Le lancer direct adverse arrive à la bonne hauteur et le joueur adverse visé capte le ballon.",
    en: "The opposing direct throw arrives at the right height and the target player catches the ball."
  },
  "lineout.explanation.target.defense.direct.low": {
    fr: "Le lancer direct adverse est trop bas. Aucun joueur placé devant ne le capte et le joueur adverse visé parvient finalement à récupérer le ballon.",
    en: "The opposing direct throw is too low. No player in front catches it, and the target player eventually gathers the ball."
  },
  "lineout.explanation.target.defense.direct.high": {
    fr: "Le lancer direct adverse est trop haut, mais le joueur adverse visé parvient tout de même à capter le ballon.",
    en: "The opposing direct throw is too high, but the target player still manages to catch the ball."
  },
  "lineout.explanation.final.userFrontSolo": {
    fr: "Un joueur de ton équipe placé devant la cible parvient à capter le ballon.",
    en: "A player from your team positioned in front of the target catches the ball."
  },
  "lineout.explanation.final.opponentFrontSolo": {
    fr: "Un joueur adverse placé devant la cible parvient à capter le ballon.",
    en: "An opposing player positioned in front of the target catches the ball."
  },
  "lineout.explanation.final.userBehindSolo": {
    fr: "Le ballon poursuit sa trajectoire et un joueur de ton équipe placé plus loin dans l'alignement parvient à le capter.",
    en: "The ball continues on its path and a player from your team farther down the lineout catches it."
  },
  "lineout.explanation.final.opponentBehindSolo": {
    fr: "Le ballon poursuit sa trajectoire et un joueur adverse placé plus loin dans l'alignement parvient à le capter.",
    en: "The ball continues on its path and an opposing player farther down the lineout catches it."
  },
  "lineout.explanation.final.userFrontDuel": {
    fr: "Deux joueurs placés devant la cible se disputent le ballon. Ton joueur remporte le duel et parvient à le capter.",
    en: "Two players in front of the target contest the ball. Your player wins the duel and catches it."
  },
  "lineout.explanation.final.opponentFrontDuel": {
    fr: "Deux joueurs placés devant la cible se disputent le ballon. Le joueur adverse remporte le duel et parvient à le capter.",
    en: "Two players in front of the target contest the ball. The opposing player wins the duel and catches it."
  },
  "lineout.explanation.final.userBehindDuel": {
    fr: "Deux joueurs placés derrière la cible se disputent le ballon. Ton joueur remporte le duel et parvient à le capter.",
    en: "Two players behind the target contest the ball. Your player wins the duel and catches it."
  },
  "lineout.explanation.final.opponentBehindDuel": {
    fr: "Deux joueurs placés derrière la cible se disputent le ballon. Le joueur adverse remporte le duel et parvient à le capter.",
    en: "Two players behind the target contest the ball. The opposing player wins the duel and catches it."
  },
  "lineout.explanation.final.userGround": {
    fr: "Aucun joueur ne parvient à capter le ballon. Il tombe au sol, puis un joueur de ton équipe s'en saisit.",
    en: "No player catches the ball. It falls to the ground and a player from your team gathers it."
  },
  "lineout.explanation.final.opponentGround": {
    fr: "Aucun joueur ne parvient à capter le ballon. Il tombe au sol, puis un joueur adverse s'en saisit.",
    en: "No player catches the ball. It falls to the ground and an opposing player gathers it."
  },
  "lineout.explanation.final.userOutFifteen": {
    fr: "Le ballon dépasse finalement la ligne des 15 mètres sans être capté, mais un joueur de ton équipe arrive à le récupérer.",
    en: "The ball eventually travels beyond the 15-metre line without being caught, but a player from your team recovers it."
  },
  "lineout.explanation.final.opponentOutFifteen": {
    fr: "Le ballon dépasse finalement la ligne des 15 mètres sans être capté et un joueur adverse arrive à le récupérer.",
    en: "The ball eventually travels beyond the 15-metre line without being caught and an opposing player recovers it."
  },
  "lineout.explanation.final.userFrontSoloKnockOn": {
    fr: "Un joueur de ton équipe tente de capter le ballon devant la cible, mais commet un en-avant. Mêlée pour l'adversaire.",
    en: "A player from your team tries to catch the ball in front of the target but knocks it on. Scrum to the opponent."
  },
  "lineout.explanation.final.opponentFrontSoloKnockOn": {
    fr: "Un joueur adverse tente de capter le ballon devant la cible, mais commet un en-avant. Mêlée pour ton équipe.",
    en: "An opposing player tries to catch the ball in front of the target but knocks it on. Scrum to your team."
  },
  "lineout.explanation.final.userBehindSoloKnockOn": {
    fr: "Un joueur de ton équipe tente de capter le ballon dans la continuité, mais commet un en-avant. Mêlée pour l'adversaire.",
    en: "A player from your team tries to catch the continuing ball but knocks it on. Scrum to the opponent."
  },
  "lineout.explanation.final.opponentBehindSoloKnockOn": {
    fr: "Un joueur adverse tente de capter le ballon dans la continuité, mais commet un en-avant. Mêlée pour ton équipe.",
    en: "An opposing player tries to catch the continuing ball but knocks it on. Scrum to your team."
  },
  "lineout.explanation.final.userFrontDuelKnockOn": {
    fr: "Deux joueurs se disputent le ballon devant la cible. Ton joueur le touche, mais commet un en-avant. Mêlée pour l'adversaire.",
    en: "Two players contest the ball in front of the target. Your player touches it but knocks it on. Scrum to the opponent."
  },
  "lineout.explanation.final.opponentFrontDuelKnockOn": {
    fr: "Deux joueurs se disputent le ballon devant la cible. Le joueur adverse le touche, mais commet un en-avant. Mêlée pour ton équipe.",
    en: "Two players contest the ball in front of the target. The opposing player touches it but knocks it on. Scrum to your team."
  },
  "lineout.explanation.final.userBehindDuelKnockOn": {
    fr: "Deux joueurs se disputent le ballon derrière la cible. Ton joueur le touche, mais commet un en-avant. Mêlée pour l'adversaire.",
    en: "Two players contest the ball behind the target. Your player touches it but knocks it on. Scrum to the opponent."
  },
  "lineout.explanation.final.opponentBehindDuelKnockOn": {
    fr: "Deux joueurs se disputent le ballon derrière la cible. Le joueur adverse le touche, mais commet un en-avant. Mêlée pour ton équipe.",
    en: "Two players contest the ball behind the target. The opposing player touches it but knocks it on. Scrum to your team."
  },
  "combo.safe_front": { fr: "Combi 1", en: "Set 1" },
  "combo.middle_block": { fr: "Combi 2", en: "Set 2" },
  "combo.shift_5": { fr: "Combi 5", en: "Set 5" },
  "combo.quick_four": { fr: "Rapide à quatre", en: "Quick four" },
  "combo.four_double": { fr: "Double bloc à quatre", en: "Four-player double block" },
  "combo.six_middle": { fr: "Axe à six", en: "Six-player middle" },
  "combo.six_long": { fr: "Longue à six", en: "Six-player long" },
  "combo.seven_double": { fr: "Double bloc à sept", en: "Seven-player double block" },
  "combo.seven_triple": { fr: "Triple bloc à sept", en: "Seven-player triple block" },
  ...generatedCombinationTranslations,
  "training.practiceLineout": { fr: "Travailler la touche", en: "Practice lineout" },
  "training.playMatch": { fr: "Jouer le match", en: "Play match" },
  "result.title": { fr: "Résultat", en: "Result" },
  "result.noMatch": { fr: "Aucun match", en: "No match" },
  "result.backTraining": { fr: "Retour à l'entraînement", en: "Back to training" },
  "result.viewSeasonReview": { fr: "Voir le bilan de la saison", en: "View season review" },
  "result.continue": { fr: "Continuer", en: "Continue" },
  "result.masteryRate": { fr: "Réussite globale", en: "Overall success" },
  "result.attackRate": { fr: "Réussite offensive", en: "Attack success" },
  "result.defenseRate": { fr: "Réussite défensive", en: "Defense success" },
  "result.totalLineouts": { fr: "Touches", en: "Lineouts" },
  "result.attackWon": { fr: "Attaques gagnées", en: "Attack wins" },
  "result.defenseWon": { fr: "Défenses gagnées", en: "Defense wins" },
  "result.combinationsTitle": { fr: "Statistiques par combinaison", en: "Combination stats" },
  "result.noCombinationStats": { fr: "Aucune combinaison offensive n'a été jouée sur ce match.", en: "No offensive combination was used in this match." },
  "result.comboLine": { fr: "{count} joueurs · {played} jouée(s) · {won} gagnée(s) · {lost} perdue(s)", en: "{count} players · {played} played · {won} won · {lost} lost" },
  "seasonResult.title": { fr: "Bilan de la saison {season}", en: "Season {season} review" },
  "seasonResult.promoted": { fr: "Montée en {division} !", en: "Promoted to {division}!" },
  "seasonResult.maintained": { fr: "Maintien en {division}", en: "Staying in {division}" },
  "seasonResult.summaryTitle": { fr: "Ta saison en chiffres", en: "Your season in numbers" },
  "seasonResult.rank": { fr: "Classement final", en: "Final rank" },
  "seasonResult.points": { fr: "Points au classement", en: "League points" },
  "seasonResult.record": { fr: "Victoires-Nuls-Défaites", en: "Wins-Draws-Losses" },
  "seasonResult.pointsRecord": { fr: "{for} points marqués · {against} encaissés", en: "{for} points scored · {against} conceded" },
  "seasonResult.changesTitle": { fr: "Ce qui change la saison prochaine", en: "What changes next season" },
  "seasonResult.noChanges": { fr: "Les règles de la division restent identiques pour la prochaine saison.", en: "The division rules remain unchanged next season." },
  "seasonResult.change.lineouts": { fr: "Touches offensives par équipe", en: "Attacking lineouts per team" },
  "seasonResult.change.activeCombinations": { fr: "Combinaisons offensives", en: "Attacking combinations" },
  "seasonResult.change.reserveCombinations": { fr: "Combinaisons en réserve", en: "Reserve combinations" },
  "seasonResult.change.divisionLevel": { fr: "Niveau moyen de la division", en: "Average division level" },
  "seasonResult.continue": { fr: "Commencer la saison suivante", en: "Start the next season" },
  "seasonResult.unavailable": { fr: "Aucun bilan de saison n'est disponible.", en: "No season review is available." },
  "team.hooker": { fr: "Talonneur", en: "Hooker" },
  "team.hookerHint": { fr: "Appuie pour consulter sa fiche", en: "Tap to view the profile" },
  "team.hookerOnly": { fr: "Le talonneur n'entre pas dans les 7 postes de touche.", en: "The hooker is not part of the 7 lineout slots." },
  "team.lineoutTitle": { fr: "Joueurs retenus pour la touche", en: "Players selected for the lineout" },
  "team.activePosition": { fr: "Poste actif", en: "Active slot" },
  "team.reserveCount": { fr: "Remplaçants", en: "Bench" },
  "team.rosterTitle": { fr: "Effectif disponible", en: "Available squad" },
  "team.rosterHint": { fr: "Choisis un poste puis un joueur à affecter.", en: "Pick a slot, then assign a player." },
  "team.assignToPosition": { fr: "Affecter au poste", en: "Assign to slot" },
  "team.status.lineout": { fr: "Déjà retenu pour la touche", en: "Already selected for the lineout" },
  "team.status.reserve": { fr: "Disponible comme remplaçant", en: "Available as bench player" },
  "team.status.lineoutShort": { fr: "TOUCHE", en: "LINEOUT" },
  "team.status.reserveShort": { fr: "BAN", en: "BENCH" },
  "team.throwing": { fr: "Lancer", en: "Throwing" },
  "team.numberPrefix": { fr: "N°", en: "#" },
  "team.stat.jump": { fr: "Saut", en: "Jump" },
  "team.stat.lift": { fr: "Lift", en: "Lift" },
  "team.stat.hands": { fr: "Main", en: "Hands" },
  "team.stat.jumpAbbr": { fr: "S", en: "J" },
  "team.stat.liftAbbr": { fr: "L", en: "L" },
  "team.stat.handsAbbr": { fr: "M", en: "H" },
  "championship.season": { fr: "Saison", en: "Season" },
  "championship.round": { fr: "Journée", en: "Round" },
  "championship.rank": { fr: "Classement", en: "Rank" },
  "championship.tableRank": { fr: "Rg", en: "Rk" },
  "championship.tableClub": { fr: "Club", en: "Club" },
  "championship.tablePoints": { fr: "Pts", en: "Pts" },
  "championship.goalAverageShort": { fr: "Ga", en: "Pd" },
  "championship.nextOpponent": { fr: "Prochain adversaire :", en: "Next opponent:" },
  "championship.nextMatchShort": { fr: "Prochain", en: "Next" },
  "championship.finished": { fr: "Saison terminée", en: "Season complete" },
  "championship.top2Hint": { fr: "Objectif de saison : finir dans les 2 premiers pour monter.", en: "Season goal: finish in the top 2 for promotion." },
  "options.language.fr": { fr: "Français", en: "French" },
  "options.language.en": { fr: "English", en: "English" },
  "settings.languageTitle": { fr: "Langue", en: "Language" },
  "settings.resetConfirmTitle": { fr: "Supprimer la partie ?", en: "Delete the save?" },
  "settings.resetConfirmBody": {
    fr: "Toute ta progression sera définitivement supprimée. Veux-tu continuer ?",
    en: "All your progress will be permanently deleted. Do you want to continue?"
  },
  "settings.resetDone": { fr: "Sauvegarde réinitialisée", en: "Save reset" },
  "division.regionale_3": { fr: "Régionale 3", en: "Regional 3" },
  "division.regionale_2": { fr: "Régionale 2", en: "Regional 2" },
  "division.regionale_1": { fr: "Régionale 1", en: "Regional 1" },
  "division.federale_3": { fr: "Fédérale 3", en: "Federal 3" },
  "division.federale_2": { fr: "Fédérale 2", en: "Federal 2" },
  "division.federale_1": { fr: "Fédérale 1", en: "Federal 1" },
  "division.nationale_2": { fr: "Nationale 2", en: "National 2" },
  "division.nationale": { fr: "Nationale", en: "National" },
  "division.pro_d2": { fr: "Pro D2", en: "Pro D2" },
  "division.top_14": { fr: "Top 14", en: "Top 14" }
};
