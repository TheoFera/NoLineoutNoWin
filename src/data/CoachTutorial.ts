export type CoachStep = {
  key: string;
  target?: string;
  wait?: string;
  destination?: string;
  live?: boolean;
};
export type CoachLesson = {
  id: string;
  scope: string;
  min: number;
  max?: number;
  requires?: string[];
  steps: CoachStep[];
};

export const coachTranslations: Record<string, { fr: string; en: string }> = {};
function line(id: string, fr: string, en: string, target?: string, wait?: string, destination?: string, live = false): CoachStep {
  const key = `coach.${id}`;
  coachTranslations[key] = { fr, en };
  return { key, target, wait, destination, live };
}
const navigate = (id: string, fr: string, en: string, target: string, wait: string) => line(id, fr, en, target, wait);

export const COACH_LESSONS: CoachLesson[] = [
  { id: "team.first", scope: "team", min: 0, max: 0, steps: [
    line("welcome", "Notre équipe de joueurs de devant, numérotés de 1 à 8 sur leur maillot, est maintenant au complet ! Nous allons donc pouvoir réaliser notre première touche.", "Now I know this young team! Let's help them win their first lineouts."),
    line("whyCombinations", "Les touches au rugby, ça ne s’improvise pas. C’est pour ça que l’on prépare à l’entraînement ce que l’on appelle des combinaisons, que l’on pourra jouer en match pour surprendre l’adversaire.", "Lineouts take preparation. We practise combinations in training so we can use them to surprise our opponents in matches."),
    line("three", "On va commencer par la combinaison en touche la plus simple qui soit : 3 joueurs dans l’alignement, avec un sauteur au milieu porté par ses 2 coéquipiers.", "Let's start with three players: a jumper between two lifters."),
    navigate("prepare", "Pour préparer cette première combinaison, va dans « Combinaisons ».", "Let's prepare our first combination.", "team.combinations", "open.combinations"),
  ] },
  { id: "list.first", scope: "list", min: 0, max: 1, steps: [
    navigate("simple", "Puis, sélectionne la combinaison que tu veux créer ou modifier. Chaque combinaison a un nom que tu peux modifier.", "Here's our first plan. Open it so we can look at our players.", "combination.charles-simple", "select.charles-simple"),
  ] },
  { id: "editor.first", scope: "editor.simple", min: 0, max: 0, steps: [
    line("meeting", "Une combinaison indique à tes joueurs où se placer, comment se déplacer, s’il faut feinter et quand sauter pour récupérer le ballon.", "A combination is a meeting: your players need to know where and when to meet the ball."),
    line("jumper", "Au centre, entre les deux autres joueurs, voici notre sauteur. C’est lui qui sera porté par ses deux coéquipiers pour tenter de capter le ballon en l’air.", "Our jumper stands between his two teammates, who will lift him to catch the ball.", "player.3"),
    navigate("inspectJumper", "Tu peux cliquer dessus pour observer ses qualités.", "Click him to inspect his qualities.", "player.3", "inspect.3"),
    line("technique", "Un bon score de Technique aide à mieux sauter et à attraper le ballon proprement.", "His Technique helps him jump and catch the ball.", "stat.technique"),
    line("lifter", "Mais il ne montera pas en l’air tout seul ! Les joueurs de part et d’autre de lui sont appelés ses « lifteurs », c’est-à-dire ses porteurs. Ce terme vient de l’anglais, comme beaucoup de mots du rugby.", "The players on either side are his lifters: they lift him into the air.", "player.2"),
    navigate("inspectLifter", "Tu peux cliquer sur lui aussi pour observer ses qualités.", "Click him too to inspect his qualities.", "player.2", "inspect.2"),
    line("strength", "Plus la Force de ses 2 lifteurs est importante, plus le sauteur montera haut et pourra rester en l’air longtemps, tant qu’il n’a pas attrapé le ballon.", "Beside him, Strength helps lift him and keep him in the air.", "stat.strength"),
    line("coachJob", "Je te conseille donc de placer tes joueurs là où ils seront les plus efficaces : un sauteur habile entouré de lifteurs puissants.", "That's your first coaching task: make everyone's strengths work together."),
    navigate("firstJumpPhase", "Sélectionne le premier temps de la combinaison pour préparer le saut.", "Select the first phase to prepare the jump.", "phase.0", "phase.0"),
    navigate("firstJumpPlayer", "Clique sur le joueur du milieu pour le désigner comme sauteur.", "Select the middle player as your jumper.", "player.3", "inspect.3"),
    navigate("firstJumpAction", "Clique maintenant sur « Saut » pour programmer son saut dans ce temps.", "Choose Jump to schedule his jump in this phase.", "action.jump", "action.jump.3"),
    navigate("train", "Notre bloc est en place. Testons notre première combinaison à l’entraînement.", "Before the match, let's get a ball into their hands.", "combination.train", "train"),
  ] },
  { id: "practice.first", scope: "practice", min: 0, max: 0, steps: [
    line("hooker", "Voici notre talonneur. Plus son score de Lancer est élevé, plus ses lancers sont précis.", "Here's our hooker. Throwing affects the ball's accuracy.", "hooker"),
    line("throwRole", "Ça va être à toi de jouer ! Dans ce jeu, c’est toi qui décides quand il lance et à quelle distance il envoie le ballon.", "You choose how deep to throw and when."),
    line("throw", "Pose ton doigt sur le repère du bas pour démarrer la combinaison. Glisse vers le haut, puis relâche pour lancer.", "Touch the start of the guide to start the plan. Swipe up and release to throw.", "throw.start", undefined, "throw.end"),
    line("throwLength", "Plus tu glisses loin vers le haut, plus le ballon part loin dans l’alignement. À toi : suis le repère.", "A longer swipe asks for a deeper throw. Follow the guide.", "throw.start", "throw.accepted", "throw.end", true),
  ] },
  { id: "first.ready", scope: "editor.simple", min: 0, max: 0, requires: ["practice.0"], steps: [
    navigate("firstMatch", "Les exercices, c’est bien. Voyons maintenant nos joueurs face à une autre équipe !", "Practice is good. Now let's face another team!", "team.championship", "open.championship"),
  ] },
  { id: "championship.first", scope: "championship", min: 0, max: 0, steps: [
    navigate("play", "Notre premier adversaire nous attend. À toi de mener l’équipe !", "Our first opponent is waiting. Lead the team!", "match.play", "match.play"),
  ] },
  { id: "simulation", scope: "simulation", min: 0, max: 5, steps: [
    line("simulation", "Ici, tu prends les commandes sur les touches. Entre deux touches, le reste du match se joue automatiquement.", "You take control at lineouts. The rest of the match is simulated."),
    line("influence", "Les ballons gagnés ou perdus en touche influencent la suite du jeu, la possession et le terrain gagné.", "Balls won or lost at lineouts affect what follows, possession and territory."),
    line("points", "Une touche gagnée ne rapporte pas directement de points, mais elle permet à ton équipe de lancer une attaque.", "Winning a lineout doesn't automatically score points. It gives your team a chance to build an attack."),
  ] },
  { id: "attack.choose", scope: "choice", min: 0, max: 1, steps: [
    navigate("announce", "On connaît notre plan. Annonce cette combinaison aux joueurs, puis retrouve le geste de l’entraînement.", "We know our plan. Choose it, then use the throw you practised.", "match.combo.charles-simple", "select.charles-simple"),
  ] },
  { id: "attack.first", scope: "attack", min: 0, max: 0, steps: [
    line("attackThrow", "Notre bloc est prêt. Retrouve ton geste : le ballon doit rejoindre notre sauteur.", "Our block is ready. Use your swipe to reach our jumper.", "throw.start", "throw.accepted", "throw.end", true),
  ] },
  { id: "defense.first", scope: "defense", min: 0, max: 5, steps: [
    line("theirBall", "Cette fois, ce sont eux qui lancent. Notre travail, c’est de leur disputer le ballon.", "They're throwing this time. Let's contest their ball."),
    line("defenseTiming", "Pour déclencher le saut, pose ton doigt sur notre sauteur et glisse vers la droite. Il doit être en l’air au passage du ballon.", "Swipe right on our jumper to jump. He needs time to rise and meet the ball.", "defense.jumper", undefined, "defense.swipeEnd"),
    line("defenseWatch", "Regarde le ballon. Pour cette première fois, je vais t’aider à trouver le moment.", "Watch the ball. I'll help you find the moment this first time."),
  ] },
  { id: "defense.jump", scope: "defense.jump", min: 0, max: 5, steps: [
    line("jumpNow", "C’est le moment ! Pose ton doigt sur le sauteur encadré, puis glisse vers la droite pour le faire sauter.", "Now! Swipe right on the highlighted jumper to make him jump.", "defense.jumper", "defense.jump", "defense.swipeEnd"),
  ] },
  { id: "team.movement", scope: "team", min: 1, max: 1, steps: [
    line("moveIntro", "Tu connais les bases du saut et du lancer. Apprenons maintenant à déplacer notre bloc avant la réception.", "Our block can jump. Now let's teach it to move before receiving."),
    navigate("moveOpen", "Un défenseur a la vie facile si notre sauteur l’attend toujours au même endroit. Faisons-le travailler un peu.", "Defenders have it easy if our jumper stays in the same place. Let's make them work.", "team.combinations", "open.combinations"),
  ] },
  { id: "movement", scope: "editor.simple", min: 1, max: 1, steps: [
    line("start", "Le placement de départ indique où tes joueurs commencent. Chaque temps de la combinaison définit leur prochaine action.", "Start shows their initial positions. Phases describe what they do next.", "combination.placement"),
    navigate("phase", "Ouvre le premier temps. Nous allons y préparer le déplacement.", "Open the first phase to prepare the movement.", "phase.0", "phase.0"),
    line("moveRear", "Commençons par le lifteur arrière. Amène-le jusqu’au repère.", "Start with the rear lifter. Move him to the marker.", "player.4", "move.4.5", "destination.5"),
    line("moveJumper", "Déplace maintenant le sauteur jusqu’au repère, juste devant le lifteur arrière.", "Now the jumper. He needs to follow his lifter.", "player.3", "move.3.4", "destination.4"),
    line("moveFront", "Déplace enfin le lifteur avant. Le sauteur doit rester entre ses deux lifteurs, assez près pour être soulevé.", "And the front lifter. Keep the jumper between his two lifters, within lifting reach.", "player.2", "move.2.3", "destination.3"),
    navigate("speedInspect", "Regardons maintenant ce qui règle la vitesse de ce déplacement.", "Let's look at what controls the speed of this movement.", "player.3", "inspect.3"),
    line("speed", "La Vitesse permet à tes joueurs de rejoindre leur place plus rapidement. Pense aux trois joueurs, pas seulement au sauteur.", "Speed helps players reach their positions faster. Think about all three, not just the jumper.", "stat.speed"),
    navigate("addJump", "Ajoute un temps : après le déplacement, nous préparerons le saut.", "Add a phase: after moving, we'll prepare the jump.", "combination.add-phase", "phase.add"),
    navigate("selectJumper", "Désigne notre sauteur.", "Select our jumper.", "player.3", "inspect.3"),
    navigate("setJump", "Programme son saut dans ce dernier temps.", "Give him the jump in this last phase.", "action.jump", "action.jump.3"),
    navigate("moveTrain", "Vise l’endroit où notre sauteur recevra le ballon après son déplacement. Essayons cette combinaison !", "The ball should meet them at reception, not at their starting position. Try your plan!", "combination.train", "train"),
  ] },
  { id: "practice.movement", scope: "practice", min: 1, max: 1, steps: [
    line("movingThrow", "Pose ton doigt sur le repère du bas pour lancer le déplacement. Laisse le bloc avancer, puis glisse vers le haut et relâche.", "Let the block reach its position, then throw for the jump. Here's the depth to aim for.", "throw.start", "throw.accepted", "throw.end", true),
  ] },
  { id: "movement.ready", scope: "editor.simple", min: 1, max: 1, requires: ["practice.1"], steps: [
    navigate("movementMatch", "Notre combinaison prend vie. Voyons ce qu’elle donne en match.", "Our combination is coming alive. Let's try it in a match.", "team.championship", "open.championship"),
  ] },
  { id: "team.choice", scope: "team", min: 2, max: 2, steps: [
    line("second", "Préparons une deuxième combinaison. Tu pourras ainsi varier tes choix pendant le match.", "We need a second answer now. A coach must be able to change the plan."),
    navigate("secondOpen", "Je t’ai préparé une combinaison avec une réception plus loin dans l’alignement. Viens la découvrir.", "I've prepared a different reception. Come and see.", "team.combinations", "open.combinations"),
  ] },
  { id: "list.second", scope: "list", min: 2, max: 2, steps: [
    navigate("deep", "Ouvre cette deuxième combinaison pour voir où notre sauteur va recevoir le ballon.", "This second combination reaches deeper. Open it.", "combination.charles-profonde", "select.charles-profonde"),
  ] },
  { id: "choice.plan", scope: "editor.second", min: 2, max: 2, steps: [
    line("options", "Avec cette combinaison, notre sauteur reçoit le ballon plus loin du talonneur qu’avec la première.", "Our first option receives closer to the thrower. This one receives deeper.", "player.5"),
    navigate("deepPractice", "Il faudra allonger ton geste. Faisons un essai avant de choisir entre nos deux plans en match.", "You'll need a longer swipe. Try it before choosing between our plans in a match.", "combination.train", "train"),
  ] },
  { id: "choice.ready", scope: "editor.second", min: 2, max: 2, requires: ["practice.2"], steps: [
    navigate("choiceMatch", "Tu disposes maintenant de deux combinaisons. En match, choisis celle qui te semble la mieux adaptée à la défense.", "You have two answers. Choose the one your players can execute well against the defense.", "team.championship", "open.championship"),
  ] },
  { id: "choice.read", scope: "choice", min: 2, max: 5, steps: [
    line("readDefense", "Avant de choisir, repère où ton bloc va recevoir et où la défense risque de te gêner.", "Before choosing, consider where your block will receive and where the defense could interfere."),
    line("chooseWell", "Ne cherche pas seulement la combinaison la plus compliquée. Cherche celle que tes joueurs peuvent bien exécuter.", "Don't just pick the most complicated plan. Pick one your players can execute well."),
  ] },
  { id: "adaptation", scope: "repetition", min: 2, max: 5, steps: [
    line("habits", "On revient souvent au même endroit. Les autres commencent à connaître nos habitudes.", "We keep coming back to the same spot. They're learning our habits."),
    line("adapt", "L’adversaire apprend de tes choix et ajuste progressivement sa défense. Certains le font mieux que d’autres.", "Opponents learn from your choices and gradually adjust their defense. Some learn better than others."),
    line("vary", "Tu peux reprendre une combinaison qui fonctionne. Mais garde une autre solution pour éviter de devenir prévisible.", "You can reuse a successful plan. But keep another option so you don't become predictable."),
  ] },
  { id: "recruit.need", scope: "team", min: 3, max: 5, steps: [
    navigate("need", "On connaît mieux notre groupe. Regardons où un renfort pourrait nous aider.", "We know our squad better. Let's see where a recruit could help.", "recruit.target", "inspect.recruitTarget"),
    line("needStrength", "Ici, davantage de Force pourrait aider notre bloc à mieux porter le sauteur. C’est le profil qu’on va chercher.", "More Strength here could help our block lift the jumper. That's the profile we're looking for.", "stat.strength"),
    navigate("recruitOpen", "Allons voir qui pourrait rejoindre notre jeune équipe.", "Let's see who could join our young team.", "team.recruit", "recruit.open"),
  ] },
  { id: "recruit.wheel", scope: "wheel", min: 3, max: 5, steps: [
    navigate("chance", "Allez… laissons faire la chance.", "Come on… let's leave it to luck.", "recruit.spin", "recruit.spin"),
  ] },
  { id: "recruit.result", scope: "recruitResult", min: 3, max: 5, steps: [
    line("twoStars", "Eh bien ! Un joueur à deux étoiles : voilà un renfort prometteur. Regardons ses qualités de plus près.", "Well! A two-star recruit from the level above ours. Let's take a closer look."),
    line("compare", "Voilà ce qui nous intéresse : sa Force est de {recruit}, contre {starter} pour notre titulaire à cette place.", "Here's what matters: Strength {recruit}, compared with our starter's {starter}.", "recruit.stats"),
    line("stars", "Les étoiles donnent une indication de niveau. Mais c’est en regardant ses qualités que tu sauras où le faire jouer.", "Stars indicate level. His actual qualities tell you where to play him."),
    navigate("integrate", "Fais-lui une place dans le groupe.", "Make room for him in the squad.", "recruit.keep", "recruit.keep"),
  ] },
  { id: "recruit.swap", scope: "team", min: 3, max: 5, requires: ["recruit.result"], steps: [
    line("swap", "À toi de composer l’équipe : fais entrer notre recrue à cette place.", "Pick your team: bring our recruit into this spot.", "recruit.bench", "recruit.swap", "recruit.target"),
    line("bench", "Bien. L’autre joueur reste sur le banc, disponible pour un prochain changement.", "Good. The other player stays on the bench, ready for another change."),
    line("reinforce", "Tu n’as pas seulement recruté un joueur : tu as choisi comment renforcer ta combinaison.", "You didn't just recruit a player: you chose how to strengthen your combination."),
    line("between", "Ces changements se préparent entre les matchs. Une fois le match commencé, tu fais avec le groupe choisi.", "Make these changes between matches. Once the match starts, you use your chosen squad."),
    navigate("autonomy", "Tu as préparé ton groupe et plusieurs plans. Cette fois, je te laisse davantage la main.", "Your squad and plans are ready. I'll let you take the lead this time.", "team.championship", "open.championship"),
  ] },
  { id: "team.five", scope: "team", min: 4, max: 4, steps: [
    navigate("fiveOpen", "Avec davantage de joueurs, tu peux préparer d’autres mouvements. Voyons une touche à cinq.", "More players let you prepare other movements. Let's look at a five-player lineout.", "team.combinations", "open.combinations"),
  ] },
  { id: "list.five", scope: "list", min: 4, max: 5, steps: [
    navigate("fiveSelect", "Retrouvons notre deuxième combinaison.", "Let's open our second combination.", "combination.charles-profonde", "select.charles-profonde"),
  ] },
  { id: "five", scope: "editor.second", min: 4, max: 4, steps: [
    line("fivePurpose", "Chaque joueur doit servir ton plan. Ajouter du monde ne suffit pas à gagner le ballon.", "Every player should serve your plan. More players don't automatically win the ball."),
    navigate("fiveTrain", "Familiarise-toi avec cet alignement avant de le retrouver en match.", "Get familiar with this formation before using it in a match.", "combination.train", "train"),
  ] },
  { id: "five.ready", scope: "editor.second", min: 4, max: 4, requires: ["practice.4"], steps: [
    navigate("fiveMatch", "Tu peux maintenant jouer cet alignement. En défense aussi, nous allons apprendre à bouger ensemble.", "You can now use this formation. We'll also learn to move together in defense.", "team.championship", "open.championship"),
  ] },
  { id: "defense.move", scope: "defense", min: 4, max: 5, requires: ["defense.first"], steps: [
    line("defenseMove", "Toi aussi, tu peux répondre à ce que tu observes. Notre bloc n’est pas obligé de rester à son point de départ.", "You can respond to what you see too. Our block doesn't have to stay in its starting position."),
    line("group", "Amène cette poignée jusqu’au repère. Le sauteur et ses lifteurs se déplacent ensemble.", "Move this handle to the marker. The jumper and lifters move together.", "defense.handle", "defense.move", "defense.destination"),
    line("locked", "Dès que le talonneur adverse lâche le ballon, tu ne peux plus déplacer tes joueurs. À toi de déclencher le saut au bon moment.", "Once the ball is released, movement is locked. Then it's about timing your jump."),
  ] },
  { id: "team.feint", scope: "team", min: 5, max: 5, steps: [
    navigate("feintOpen", "Leur défense commence à nous connaître. Préparons une feinte pour tenter de la surprendre.", "Watching our movements? Let's show one intention… then play the real one.", "team.combinations", "open.combinations"),
  ] },
  { id: "feint", scope: "editor.second", min: 5, max: 5, steps: [
    navigate("feintPhase", "Commençons par le premier temps.", "Start with the first phase.", "phase.0", "phase.0"),
    navigate("feintPlayer", "Ce joueur va faire croire qu’il attend le ballon.", "This player will pretend he's expecting the ball.", "player.5", "inspect.5"),
    navigate("feintAction", "Programme une feinte pour ce premier temps.", "Give him a feint.", "action.feint", "action.feint.5"),
    navigate("feintNext", "Ajoute maintenant le temps du vrai saut.", "Now add the real jump phase.", "combination.add-phase", "phase.add"),
    navigate("feintJumper", "Désigne notre sauteur pour la réception.", "Select our jumper for the reception.", "player.5", "inspect.5"),
    navigate("feintJump", "Programme son saut dans ce dernier temps, après la feinte.", "He should catch the ball in this last phase.", "action.jump", "action.jump.5"),
    line("feintWarning", "Une feinte peut faire hésiter la défense. Mais elle ne remplace ni un bon placement, ni un bon lancer.", "A feint can make defenders hesitate. It doesn't replace good positioning or a good throw."),
    navigate("feintTrain", "Le ballon doit arriver pendant le vrai saut, après la feinte. Essayons à l’entraînement !", "Your throw should arrive for the second meeting. Let's try!", "combination.train", "train"),
  ] },
  { id: "feint.ready", scope: "editor.second", min: 5, max: 5, requires: ["practice.5"], steps: [
    navigate("feintMatch", "À toi de choisir le bon moment pour surprendre leur défense en match.", "Choose the right moment to surprise their defense in the match.", "team.championship", "open.championship"),
  ] },
  { id: "graduation", scope: "team", min: 6, steps: [
    line("graduate", "Tu sais observer tes joueurs, préparer leurs mouvements et choisir ton plan. C’est comme ça qu’on commence à devenir coach.", "You can assess your players, prepare their moves and choose a plan. That's how coaching begins."),
    line("remember", "Je te laisse mener cette équipe. Et souviens-toi : pour gagner ses matchs, il faut commencer par gagner ses touches.", "I'll let you lead this team. Remember: winning matches starts with winning lineouts."),
  ] },
  { id: "standings", scope: "championship", min: 1, steps: [
    line("standings", "Voici notre place. À la fin de la saison, les deux premiers montent dans la division supérieure.", "Here's our position. At the end of the season, the top two get promoted.", "championship.table"),
  ] },
  { id: "defense.organization", scope: "defenseEditor", min: 4, steps: [
    line("organization", "Tu peux préparer une organisation pour chaque taille de touche. Tu la retrouveras quand l’adversaire choisira ce nombre de joueurs.", "Prepare a formation for each lineout size. It returns when your opponent chooses that size."),
    line("organizationMove", "Place un sauteur entre deux lifteurs selon leurs qualités. En match, tu pourras déplacer ce bloc avant le lancer adverse.", "Position players by their qualities. Keep lifters within reach of a jumper, then adjust in the match."),
  ] },
  { id: "fatigue", scope: "fatigue", min: 1, steps: [
    line("fatigue", "La fatigue monte pendant le match et réduit l’efficacité des joueurs. Elle ne change pas leurs statistiques de départ.", "Fatigue builds during the match and reduces effectiveness. It doesn't change permanent stats."),
  ] },
  { id: "progression", scope: "progression", min: 1, steps: [
    line("progression", "Les matchs font aussi progresser tes joueurs. Regarde les qualités qu’ils ont améliorées avant de préparer la suite.", "Matches also help your players improve. Look at their gains before preparing the next match."),
  ] },
  { id: "reminder.roles", scope: "reminder", min: 0, steps: [
    line("reminderRoles", "Technique pour sauter et capter, Force pour soulever, Vitesse pour se déplacer. Le talonneur compte sur son Lancer.", "Technique for jumping and catching, Strength for lifting, Speed for movement. The hooker relies on Throwing."),
    line("reminderPlans", "Choisis une combinaison selon sa réception et la défense. Varie tes intentions : l’adversaire apprend de tes habitudes.", "Choose a plan by its reception and the defense. Vary your intentions: opponents learn your habits."),
    line("reminderDefense", "En défense, déplace ton bloc avant le lancer. Une fois le ballon parti, glisse vers la droite sur le sauteur pour déclencher son saut.", "In defense, move the block before the throw. After release, swipe right on the jumper at the right moment."),
  ] },
];

const extras: Record<string, [string, string]> = {
  "combo.simple": ["La simple", "The simple one"], "combo.deep": ["La profonde", "The deep one"],
  next: ["À toi de me guider", "Guide me"], continue: ["Continuer", "Continue"],
  action: ["À toi de jouer", "Your turn"], skip: ["Quitter le tutoriel", "Leave tutorial"],
  replay: ["Les conseils de Charles", "Charles's advice"],
  "resume.team": ["Reprenons notre préparation. Ouvre les combinaisons pour poursuivre l’entraînement.", "Let's resume our preparation. Open the combinations."],
  "resume.list": ["Retrouvons le plan sur lequel nous travaillions.", "Let's return to the plan we were working on."],
  "resume.practice": ["Notre plan est prêt. Retrouvons-le sur le terrain d’entraînement.", "Our plan is ready. Let's try it on the practice pitch."],
  "resume.match": ["L’équipe est prête. Notre prochain adversaire nous attend.", "The team is ready. Our next opponent is waiting."],
  "resume.recruit": ["Notre renfort nous attend. Retrouvons-le pour préparer l’équipe.", "Our recruit is waiting. Let's get back to preparing the squad."],
  "comment.won": ["Beau travail du bloc. Le ballon est à nous !", "Good work from the block. The ball is ours!"],
  "comment.lost": ["Ils ont gagné ce duel. Préparons la prochaine occasion.", "They won this contest. Let's prepare for the next chance."],
  "comment.steal": ["Bien joué ! Celui-là, ils pensaient le garder.", "Well done! They thought they'd keep that one."],
  "comment.tooEarly": ["Tu as déclenché le saut trop tôt. Attends que le ballon se rapproche avant de faire sauter notre bloc.", "You jumped too early. We need to meet the ball during the jump."],
  "comment.tooLate": ["Le saut est parti trop tard. Déclenche-le un peu plus tôt pour laisser au sauteur le temps de monter.", "A little late. Give our jumper time to rise."],
  "comment.goodTiming": ["Le saut est bien déclenché ! Garde ce repère pour la prochaine touche.", "Well timed! That's the moment to look for."],
  "comment.short": ["Ton geste était trop court pour atteindre la réception prévue. Allonge-le un peu au prochain essai.", "Your swipe asked for a short throw. Lengthen it next time."],
  "comment.long": ["Ton geste était trop long : tu visais au-delà de notre sauteur. Raccourcis-le un peu au prochain essai.", "Your swipe asked for a throw beyond our block. Shorten it a little."],
  "comment.dosed": ["Ton geste était bien dosé. Mais le lancer réel et le duel à la réception comptent aussi.", "Your swipe was well measured. The actual throw and reception contest matter too."],
  "comment.tooShort": ["Ton geste est trop court pour lancer. Glisse un peu plus loin vers le haut, puis relâche.", "Make your swipe a little longer. Try again."],
  "comment.tooSlow": ["Glisse un peu plus vite vers le haut. Réessaie.", "Swipe upward a little faster. Try again."],
};
for (const [id, [fr, en]] of Object.entries(extras)) coachTranslations[`coach.${id}`] = { fr, en };
