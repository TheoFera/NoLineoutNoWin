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
  "club.title": { fr: "Création du club", en: "Club creation" },
  "club.defaultName": { fr: "Mon club", en: "My club" },
  "club.nameLabel": { fr: "Nom du club", en: "Club name" },
  "club.namePlaceholder": { fr: "Ex. Les XV du Parc", en: "E.g. Park XV" },
  "club.locationQuestion": { fr: "Où est localisé le club ?", en: "Where is the club located?" },
  "club.locationPlaceholder": { fr: "Choisis une ligue FFR", en: "Choose an FFR league" },
  "club.locationRequired": { fr: "Choisis la ligue où ton club est localisé.", en: "Choose the league where your club is located." },
  "club.primaryColor": { fr: "Couleur principale", en: "Primary color" },
  "club.secondaryColor": { fr: "Couleur secondaire", en: "Secondary color" },
  "club.preview": { fr: "Maillot", en: "Kit" },
  "club.continue": { fr: "Continuer", en: "Continue" },
  "club.backMenu": { fr: "Retour", en: "Back" },
  "club.nameRequired": { fr: "Le nom du club est obligatoire.", en: "Club name is required." },
  "league.auvergne_rhone_alpes": { fr: "Auvergne-Rhône-Alpes", en: "Auvergne-Rhône-Alpes" },
  "league.bourgogne_franche_comte": { fr: "Bourgogne-Franche-Comté", en: "Burgundy-Franche-Comté" },
  "league.bretagne": { fr: "Bretagne", en: "Brittany" },
  "league.centre_val_de_loire": { fr: "Centre-Val de Loire", en: "Centre-Val de Loire" },
  "league.corse": { fr: "Corse", en: "Corsica" },
  "league.grand_est": { fr: "Grand Est", en: "Grand Est" },
  "league.hauts_de_france": { fr: "Hauts-de-France", en: "Hauts-de-France" },
  "league.normandie": { fr: "Normandie", en: "Normandy" },
  "league.nouvelle_aquitaine": { fr: "Nouvelle-Aquitaine", en: "Nouvelle-Aquitaine" },
  "league.occitanie": { fr: "Occitanie", en: "Occitanie" },
  "league.pays_de_la_loire": { fr: "Pays de la Loire", en: "Pays de la Loire" },
  "league.provence_alpes_cote_d_azur": { fr: "Provence Alpes Côte d’Azur", en: "Provence-Alpes-Côte d’Azur" },
  "league.ile_de_france": { fr: "Île-de-France", en: "Île-de-France" },
  "teamCreation.title": { fr: "Création de l'équipe", en: "Team creation" },
  "teamCreation.subtitle": { fr: "Personnalise tes 8 joueurs", en: "Customize your 8 players" },
  "teamCreation.nicknameForPlayer": { fr: "Nom du joueur n° {number}", en: "Name of player #{number}" },
  "teamCreation.nicknamePlaceholder": { fr: "Ex. Nono", en: "E.g. Nono" },
  "teamCreation.chooseBodyShape": { fr: "Choisis le gabarit de ton joueur", en: "Choose your player's body shape" },
  "teamCreation.skinTone": { fr: "Couleur de peau", en: "Skin tone" },
  "teamCreation.skinToneOption": { fr: "Teinte {number}", en: "Tone {number}" },
  "teamCreation.hairStyle": { fr: "Coupes de cheveux", en: "Haircuts" },
  "teamCreation.hairStyle.short": { fr: "Courts", en: "Short" },
  "teamCreation.hairStyle.bald": { fr: "Chauve", en: "Bald" },
  "teamCreation.hairStyle.mullet": { fr: "Mulet", en: "Mullet" },
  "teamCreation.hairStyle.bun": { fr: "Chignon", en: "Bun" },
  "teamCreation.accessory": { fr: "Accessoires", en: "Accessories" },
  "teamCreation.accessory.helmet": { fr: "Casque", en: "Headguard" },
  "teamCreation.accessory.strap": { fr: "Strap", en: "Strap" },
  "teamCreation.accessory.moustache": { fr: "Moustache", en: "Moustache" },
  "teamCreation.accessory.beard": { fr: "Barbe", en: "Beard" },
  "teamCreation.previousBodyShape": { fr: "‹", en: "‹" },
  "teamCreation.nextBodyShape": { fr: "›", en: "›" },
  "teamCreation.create": { fr: "Créer mon équipe", en: "Create my team" },
  "teamCreation.nameRequired": { fr: "Chaque joueur doit avoir un nom.", en: "Every player needs a name." },
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
  "match.tryCelebration.title": { fr: "ESSAI !", en: "TRY!" },
  "match.action.restart": { fr: "Remise en jeu au centre", en: "Restart from halfway" },
  "match.action.halfTime": { fr: "Mi-temps", en: "Half-time" },
  "match.action.secondHalfKickoff": { fr: "Coup d’envoi de la deuxième mi-temps", en: "Second-half kick-off" },
  "match.halfTime": { fr: "MI-TEMPS", en: "HALF-TIME" },
  "match.halfTimeShort": { fr: "MT", en: "HT" },
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
  "lineout.defenseHint": { fr: "Réorganise ta défense puis choisis le joueur qui doit lire ou contrer la touche", en: "Reorder your defense, then choose the player who should read or contest the lineout" },
  "lineout.defenseHintShort": { fr: "Glisse puis appuie", en: "Drag then tap" },
  "lineout.playerPanel.empty": { fr: "Sélectionne un joueur pour voir ses infos.", en: "Select a player to view details." },
  "lineout.role.jumper": { fr: "Sauteur", en: "Jumper" },
  "lineout.role.lifter": { fr: "Lifteur", en: "Lifter" },
  "lineout.role.jumperAbbr": { fr: "S", en: "J" },
  "lineout.role.lifterAbbr": { fr: "L", en: "L" },
  "lineout.status.selectTarget": { fr: "Choisis d'abord un joueur cible dans l'alignement.", en: "Choose a target player first." },
  "lineout.status.notJumper": { fr: "Ce joueur n'est pas un sauteur : choisis un vrai sauteur.", en: "This player is not a jumper: choose a real jumper." },
  "lineout.status.defenderUnavailable": { fr: "Ce joueur ne peut ni sauter avec ce placement ni effectuer une lecture au sol.", en: "This player cannot jump from this setup or make a ground read." },
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
  "lineout.presentation.title.defenderKnockOn": { fr: "En-avant du défenseur", en: "Defender knock-on" },
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
  "lineout.detail.defensiveReadBonus": { fr: "Bonus de bonne lecture", en: "Correct read bonus" },
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
  "lineout.reason.defensiveReadWon": { fr: "Le défenseur avait anticipé la réception directe et remporte le duel au sol avec son bonus de lecture.", en: "The defender anticipated the direct catch and wins the ground contest with the read bonus." },
  "lineout.reason.defensiveReadBeaten": { fr: "Le défenseur avait anticipé la réception directe, mais le réceptionneur conserve le ballon.", en: "The defender anticipated the direct catch, but the receiver keeps the ball." },
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
  "lineout.explanation.defenseReadWon": { fr: "Bonne lecture : ton défenseur avait anticipé la réception directe. Son bonus de +20 lui permet de récupérer le ballon.", en: "Good read: your defender anticipated the direct catch. The +20 bonus helps him win the ball." },
  "lineout.explanation.defenseReadLost": { fr: "Bonne lecture : ton défenseur avait anticipé la réception directe et reçoit +20, mais l'adversaire conserve le ballon.", en: "Good read: your defender anticipated the direct catch and receives +20, but the opponent keeps the ball." },
  "lineout.explanation.attackReadBeaten": { fr: "Le défenseur avait anticipé la réception directe, mais ton joueur remporte le duel au sol.", en: "The defender anticipated the direct catch, but your player wins the ground contest." },
  "lineout.explanation.attackReadLost": { fr: "Le défenseur avait anticipé la réception directe et profite de son bonus de +20 pour récupérer le ballon.", en: "The defender anticipated the direct catch and uses the +20 bonus to win the ball." },
  "lineout.explanation.defenseReadOurKnockOn": { fr: "Ton défenseur avait bien lu la réception directe, mais il commet un en-avant. Mêlée pour l'adversaire.", en: "Your defender read the direct catch correctly but knocks on. Scrum to the opponent." },
  "lineout.explanation.defenseReadOpponentKnockOn": { fr: "Ton défenseur avait bien lu la réception directe et le réceptionneur adverse commet un en-avant. Mêlée pour ton équipe.", en: "Your defender read the direct catch correctly and the opposing receiver knocks on. Scrum to your team." },
  "lineout.explanation.attackReadOpponentKnockOn": { fr: "Le défenseur avait anticipé la réception directe, mais il commet un en-avant. Mêlée pour ton équipe.", en: "The defender anticipated the direct catch but knocks on. Scrum to your team." },
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
  "combo.shift_5": { fr: "Combi 3", en: "Set 3" },
  "combo.quick_four": { fr: "Combi 4", en: "Set 4" },
  "combo.four_double": { fr: "Combi 5", en: "Set 5" },
  "combo.six_middle": { fr: "Combi 6", en: "Set 6" },
  "combo.six_long": { fr: "Combi 7", en: "Set 7" },
  "combo.seven_double": { fr: "Combi 8", en: "Set 8" },
  "combo.seven_triple": { fr: "Combi 9", en: "Set 9" },
  ...generatedCombinationTranslations,
  "result.title": { fr: "Fin du match", en: "Full time" },
  "result.victory": { fr: "Victoire", en: "Victory" },
  "result.draw": { fr: "Match nul", en: "Draw" },
  "result.defeat": { fr: "Défaite", en: "Defeat" },
  "result.noMatch": { fr: "Aucun match", en: "No match" },
  "result.backTraining": { fr: "Retour à l'entraînement", en: "Back to training" },
  "result.viewSeasonReview": { fr: "Voir le bilan de la saison", en: "View season review" },
  "result.viewProgression": { fr: "Voir la progression", en: "View progression" },
  "result.continue": { fr: "Continuer", en: "Continue" },
  "result.totalLineouts": { fr: "Touches", en: "Lineouts" },
  "result.offensiveLineouts": { fr: "Touches offensives", en: "Offensive lineouts" },
  "result.defensiveLineouts": { fr: "Touches défensives", en: "Defensive lineouts" },
  "result.combinationsTitle": { fr: "Statistiques par combinaison", en: "Combination stats" },
  "result.noCombinationStats": { fr: "Aucune combinaison offensive n'a été jouée sur ce match.", en: "No offensive combination was used in this match." },
  "result.comboLine": { fr: "{count} joueurs · {played} jouée(s) · {won} gagnée(s) · {lost} perdue(s)", en: "{count} players · {played} played · {won} won · {lost} lost" },
  "playerProgression.title": { fr: "Progression de l'équipe", en: "Team progression" },
  "playerProgression.playersImproved": { fr: "Joueurs améliorés", en: "Improved players" },
  "playerProgression.totalTeamGain": { fr: "Gain total", en: "Total gain" },
  "playerProgression.noneTitle": { fr: "Aucune statistique en hausse", en: "No stat increases" },
  "playerProgression.noneBody": {
    fr: "Les joueurs progressent en répétant leurs rôles pendant les matchs. Continue à les utiliser pour améliorer leurs statistiques.",
    en: "Players improve by repeating their roles during matches. Keep using them to increase their stats."
  },
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
  "seasonResult.change.lineouts": { fr: "Touches par match", en: "Lineouts per match" },
  "seasonResult.change.activeCombinations": { fr: "Combinaisons offensives", en: "Attacking combinations" },
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
  "team.stat.speed": { fr: "Vitesse", en: "Speed" },
  "team.stat.strength": { fr: "Force", en: "Strength" },
  "team.stat.technique": { fr: "Technique", en: "Technique" },
  "team.stat.speedAbbr": { fr: "V", en: "S" },
  "team.stat.strengthAbbr": { fr: "F", en: "P" },
  "team.stat.techniqueAbbr": { fr: "T", en: "T" },
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
  "settings.resolutionTitle": { fr: "Résolution", en: "Resolution" },
  "settings.resolutionStandard": { fr: "Standard (1×)", en: "Standard (1×)" },
  "settings.resolutionHigh": { fr: "Haute (2×)", en: "High (2×)" },
  "settings.languageTitle": { fr: "Langue", en: "Language" },
  "settings.currentGameTitle": { fr: "Partie en cours", en: "Current game" },
  "settings.resetConfirmTitle": { fr: "Supprimer la partie ?", en: "Delete the save?" },
  "settings.resetConfirmBody": {
    fr: "Toute ta progression sera définitivement supprimée. Veux-tu continuer ?",
    en: "All your progress will be permanently deleted. Do you want to continue?"
  },
  "settings.resetDone": { fr: "Sauvegarde réinitialisée", en: "Save reset" },
  "lineout.v3.practiceCombination": { fr: "Tester", en: "Practice" },
  "lineout.v3.defaultCombinationName": { fr: "Combi {number}", en: "Set {number}" },
  "lineout.v3.initialPlacement": { fr: "Placement initial", en: "Initial setup" },
  "lineout.v3.maximumPhases": { fr: "Trois phases maximum", en: "Three phases maximum" },
  "lineout.v3.movePlayerHint": { fr: "Fais glisser le joueur jusqu'à sa position finale.", en: "Drag the player to their final position." },
  "lineout.v3.defensivePlayerCountError": { fr: "La touche défensive à {size} doit comporter {size} joueurs", en: "The {size}-player defensive lineout must contain {size} players" },
  "button.confirm": { fr: "Valider", en: "Confirm" },
  "lineout.v3.editTimeline": { fr: "Chronologie", en: "Timeline" },
  "lineout.v3.planSubtitle": { fr: "Construis la combinaison phase par phase", en: "Build the move phase by phase" },
  "lineout.v3.phase": { fr: "Phase {current} / {total}", en: "Phase {current} / {total}" },
  "lineout.v3.addPhase": { fr: "Ajouter", en: "Add" },
  "lineout.v3.deletePhase": { fr: "Supprimer", en: "Delete" },
  "lineout.v3.phaseActions": { fr: "Actions de cette phase", en: "Actions in this phase" },
  "lineout.v3.noAction": { fr: "Aucune action. Sélectionne un joueur pour commencer.", en: "No action. Select a player to begin." },
  "lineout.v3.choosePlayer": { fr: "Choisis un joueur de l’alignement", en: "Choose a lineout player" },
  "lineout.v3.selectPlayerHint": { fr: "Sélectionne d’abord un joueur", en: "Select a player first" },
  "lineout.v3.selectedPlayer": { fr: "Joueur en position {position}", en: "Player in position {position}" },
  "lineout.v3.actionMove": { fr: "Déplacer", en: "Move" },
  "lineout.v3.actionFeint": { fr: "Feinte", en: "Dummy" },
  "lineout.v3.actionJump": { fr: "Saut", en: "Jump" },
  "lineout.v3.actionClear": { fr: "Effacer", en: "Clear" },
  "lineout.v3.chooseDestination": { fr: "Choisis la position d’arrivée", en: "Choose the destination" },
  "lineout.v3.chooseLifters": { fr: "Touche jusqu’à deux autres joueurs pour les choisir comme lifteurs.", en: "Tap up to two other players to select them as lifters." },
  "lineout.v3.currentLifters": { fr: "Lifteurs :", en: "Lifters:" },
  "lineout.v3.editPlacement": { fr: "Placement", en: "Setup" },
  "lineout.v3.actionDescription.move": { fr: "Position {player} : déplacement vers {destination}", en: "Position {player}: move to {destination}" },
  "lineout.v3.actionDescription.feint": { fr: "Position {player} : feinte", en: "Position {player}: dummy" },
  "lineout.v3.actionDescription.jump": { fr: "Position {player} : saut — lifteurs {lifters}", en: "Position {player}: jump — lifters {lifters}" },
  "lineout.v3.defensiveFormations": { fr: "Touches défensives", en: "Defensive lineouts" },
  "lineout.v3.defensiveFormationHint": { fr: "Prépare le placement de départ pour chaque nombre de joueurs.", en: "Prepare the starting setup for every lineout size." },
  "lineout.v3.positions": { fr: "Positions dans l’alignement", en: "Lineout positions" },
  "lineout.v3.positionShort": { fr: "Position", en: "Position" },
  "lineout.v3.emptyPosition": { fr: "Libre", en: "Empty" },
  "lineout.v3.selectFormationSlot": { fr: "Choisis une position à modifier", en: "Choose a position to edit" },
  "lineout.v3.chooseFormationPlayer": { fr: "Choisis le joueur à placer ici", en: "Choose the player to place here" },
  "lineout.v3.gesture.tooShort": { fr: "Geste trop court : glisse franchement vers le haut.", en: "Gesture too short: swipe clearly upward." },
  "lineout.v3.gesture.tooSlow": { fr: "Geste trop lent : le lancer doit être vif.", en: "Gesture too slow: the throw must be sharp." },
  "lineout.v3.status.playerMoving": { fr: "Ce joueur doit terminer son déplacement avant de pouvoir sauter.", en: "This player must finish moving before he can jump." },
  "lineout.v3.feedback.tooShort": { fr: "Trop court", en: "Too short" },
  "lineout.v3.feedback.tooLong": { fr: "Trop long", en: "Too long" },
  "lineout.v3.feedback.goodTiming": { fr: "Bon timing", en: "Good timing" },
  "lineout.v3.feedback.tooEarly": { fr: "Trop tôt", en: "Too early" },
  "lineout.v3.feedback.tooLate": { fr: "Trop tard", en: "Too late" },
  "lineout.v3.feedback.slightlyNotStraight": { fr: "Légèrement pas droit", en: "Slightly not straight" },
  "lineout.v3.feedback.tooHigh": { fr: "Lancer trop haut", en: "Throw too high" },
  "lineout.v3.feedback.tooLow": { fr: "Lancer trop bas", en: "Throw too low" },
  "lineout.v3.feedback.optimalCatch": { fr: "Réception optimale", en: "Optimal catch" },
  "lineout.v3.title.cleanWin": { fr: "Touche gagnée", en: "Lineout won" },
  "lineout.v3.title.scrappyWin": { fr: "Ballon sécurisé", en: "Ball secured" },
  "lineout.v3.title.fault": { fr: "Faute en touche", en: "Lineout fault" },
  "lineout.v3.title.lost": { fr: "Touche perdue", en: "Lineout lost" },
  "lineout.v3.reason.spatialContact": { fr: "Le ballon a été joué par le premier joueur réellement capable de l’atteindre.", en: "The ball was played by the first player physically able to reach it." },
  "lineout.v3.reason.catchWonByUs": { fr: "Un joueur de ton équipe prend le dessus au point de chute et capte le ballon : ton équipe remporte la touche.", en: "A player from your team wins the contest at the landing point and catches the ball: your team wins the lineout." },
  "lineout.v3.reason.catchWonByOpponent": { fr: "Un joueur adverse prend le dessus au point de chute et capte le ballon : ton équipe perd la touche.", en: "An opposing player wins the contest at the landing point and catches the ball: your team loses the lineout." },
  "lineout.v3.reason.knockOn": { fr: "Le joueur touche le ballon puis le laisse retomber vers l’avant : en-avant.", en: "The player touches the ball and drops it forward: knock-on." },
  "lineout.v3.reason.knockOnByUs": { fr: "Ton joueur touche le ballon puis le laisse retomber vers l’avant : il commet un en-avant et l’adversaire récupère le ballon.", en: "Your player touches the ball and drops it forward: he knocks on and the opposition gets the ball." },
  "lineout.v3.reason.knockOnByOpponent": { fr: "Le joueur adverse touche le ballon puis le laisse retomber vers l’avant : il commet un en-avant et ton équipe récupère le ballon.", en: "The opposing player touches the ball and drops it forward: he knocks on and your team gets the ball." },
  "lineout.v3.reason.notStraight": { fr: "La trajectoire sort nettement du couloir de la touche.", en: "The trajectory clearly leaves the lineout corridor." },
  "lineout.v3.reason.notStraightByUs": { fr: "Ton talonneur ne lance pas droit : le ballon sort du couloir de la touche et revient à l’équipe adverse.", en: "Your hooker's throw is not straight: the ball leaves the lineout corridor and goes to the opposing team." },
  "lineout.v3.reason.notStraightByOpponent": { fr: "Le talonneur adverse ne lance pas droit : le ballon sort du couloir de la touche et revient à ton équipe.", en: "The opposing hooker's throw is not straight: the ball leaves the lineout corridor and goes to your team." },
  "lineout.v3.reason.groundRecovery": { fr: "Personne ne touche le ballon en l’air ; le joueur le plus proche le récupère au sol.", en: "Nobody touches the ball in the air; the nearest player gathers it on the ground." },
  "lineout.v3.reason.groundRecovery.preciseByUs": { fr: "Le lancer est à bonne hauteur, mais aucun joueur ne parvient à contrôler le ballon en l’air. Il tombe au sol, puis un joueur de ton équipe le récupère.", en: "The throw is at the right height, but no player manages to control it in the air. It falls to the ground, then a player from your team gathers it." },
  "lineout.v3.reason.groundRecovery.preciseByOpponent": { fr: "Le lancer est à bonne hauteur, mais aucun joueur ne parvient à contrôler le ballon en l’air. Il tombe au sol, puis un joueur de l’équipe adverse le récupère.", en: "The throw is at the right height, but no player manages to control it in the air. It falls to the ground, then an opposing player gathers it." },
  "lineout.v3.reason.groundRecovery.lowByUs": { fr: "Le lancer est trop bas : aucun joueur ne parvient à le contrôler en l’air. Il tombe au sol, puis un joueur de ton équipe le récupère.", en: "The throw is too low: no player manages to control it in the air. It falls to the ground, then a player from your team gathers it." },
  "lineout.v3.reason.groundRecovery.lowByOpponent": { fr: "Le lancer est trop bas : aucun joueur ne parvient à le contrôler en l’air. Il tombe au sol, puis un joueur de l’équipe adverse le récupère.", en: "The throw is too low: no player manages to control it in the air. It falls to the ground, then an opposing player gathers it." },
  "lineout.v3.reason.groundRecovery.highByUs": { fr: "Le lancer est trop haut : aucun joueur ne parvient à l’atteindre. Le ballon retombe au sol, puis un joueur de ton équipe le récupère.", en: "The throw is too high: no player manages to reach it. The ball falls to the ground, then a player from your team gathers it." },
  "lineout.v3.reason.groundRecovery.highByOpponent": { fr: "Le lancer est trop haut : aucun joueur ne parvient à l’atteindre. Le ballon retombe au sol, puis un joueur de l’équipe adverse le récupère.", en: "The throw is too high: no player manages to reach it. The ball falls to the ground, then an opposing player gathers it." },
  "lineout.v3.reason.groundRecovery.unknownByUs": { fr: "Aucun joueur ne parvient à contrôler le ballon en l’air. Il tombe au sol, puis un joueur de ton équipe le récupère.", en: "No player manages to control the ball in the air. It falls to the ground, then a player from your team gathers it." },
  "lineout.v3.reason.groundRecovery.unknownByOpponent": { fr: "Aucun joueur ne parvient à contrôler le ballon en l’air. Il tombe au sol, puis un joueur de l’équipe adverse le récupère.", en: "No player manages to control the ball in the air. It falls to the ground, then an opposing player gathers it." },
  "lineout.v3.reason.untouched": { fr: "Le ballon ne rencontre aucun joueur et dépasse l’alignement.", en: "The ball reaches nobody and travels beyond the lineout." },
  "lineout.v3.reason.untouchedByUs": { fr: "Le lancer dépasse tout l’alignement sans être touché. Dans la continuité, un joueur de ton équipe récupère le ballon.", en: "The throw travels beyond the entire lineout without being touched. In open play, a player from your team recovers the ball." },
  "lineout.v3.reason.untouchedByOpponent": { fr: "Le lancer dépasse tout l’alignement sans être touché. Dans la continuité, un joueur de l’équipe adverse récupère le ballon.", en: "The throw travels beyond the entire lineout without being touched. In open play, an opposing player recovers the ball." },
  "lineout.v3.detail.requestedDepth": { fr: "Profondeur demandée", en: "Requested depth" },
  "lineout.v3.detail.actualDepth": { fr: "Profondeur réelle", en: "Actual depth" },
  "lineout.v3.detail.contactScore": { fr: "Qualité du contact", en: "Contact quality" },
  "lineout.v3.detail.trajectory": { fr: "Trajectoire", en: "Trajectory" },
  "lineout.v3.trajectory.precise": { fr: "À la bonne hauteur", en: "At the right height" },
  "lineout.v3.trajectory.low": { fr: "Trop basse", en: "Too low" },
  "lineout.v3.trajectory.high": { fr: "Trop haute", en: "Too high" },
  "lineout.v3.trajectory.notStraight": { fr: "Pas droite", en: "Not straight" },
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
