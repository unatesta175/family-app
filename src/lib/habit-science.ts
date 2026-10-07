/**
 * The "Habit science" content: tips graded by how strong the research behind them is, popular claims
 * checked against that research, and the sources. Written from the published literature, with the
 * figures stated only as loosely as the studies allow. Pure data, so the page can be rendered and
 * filtered anywhere.
 */

export type Evidence = "strong" | "moderate" | "emerging";
export type TipGroup = "start" | "stay" | "environment" | "mindset" | "study";

export const EVIDENCE_META: Record<Evidence, { label: string; blurb: string }> = {
  strong: { label: "Strong", blurb: "Replicated in many studies, or confirmed by a meta-analysis" },
  moderate: { label: "Moderate", blurb: "Several studies agree, but results are mixed or modest" },
  emerging: { label: "Emerging", blurb: "Promising, but from few studies or small effects" },
};

export const GROUP_META: Record<TipGroup, { label: string }> = {
  start: { label: "Getting started" },
  stay: { label: "Staying consistent" },
  environment: { label: "Your surroundings" },
  mindset: { label: "Mindset" },
  study: { label: "Studying and deep work" },
};

export type SourceId = "lally2010" | "singh2024" | "gardner2012" | "gollwitzer2006" | "wood2007" | "wood2002" | "wood2016" | "harkin2016" | "kivetz2006" | "milkman2014" | "polivy1985" | "adams2007" | "breines2012" | "bryan2010" | "bryan2011" | "locke2002" | "dunlosky2013" | "ariga2011";

export type Source = { id: SourceId; cite: string; finding: string };

export const SOURCES: Record<SourceId, Source> = {
  lally2010: {
    id: "lally2010",
    cite: "Lally, van Jaarsveld, Potts & Wardle (2010). How are habits formed: Modelling habit formation in the real world. European Journal of Social Psychology, 40(6), 998-1009.",
    finding: "96 people built a daily habit. Automaticity levelled off after a median of about 66 days, with a huge range (18 to 254 days). Simpler habits formed faster, and missing a single day did not meaningfully set things back.",
  },
  singh2024: {
    id: "singh2024",
    cite: "Singh et al. (2024). Time to form a habit: A systematic review and meta-analysis of health behaviour habit formation and its determinants. Healthcare, 12(23).",
    finding: "Pooled many studies and found a typical habit takes roughly two months, with a very wide spread from a few days to most of a year, depending on the behaviour and the person.",
  },
  gardner2012: {
    id: "gardner2012",
    cite: "Gardner, Lally & Wardle (2012). Making health habitual: the psychology of habit-formation and general practice. British Journal of General Practice, 62(605), 664-666.",
    finding: "Practical advice from habit researchers: pick a simple action, tie it to a regular cue, repeat it daily, be patient, and don't worry about an occasional miss.",
  },
  gollwitzer2006: {
    id: "gollwitzer2006",
    cite: "Gollwitzer & Sheeran (2006). Implementation intentions and goal achievement: A meta-analysis of effects and processes. Advances in Experimental Social Psychology, 38, 69-119.",
    finding: "Across about 94 studies, making an if-then plan (\"When X happens, I will do Y\") had a medium-to-large effect on reaching a goal.",
  },
  wood2007: {
    id: "wood2007",
    cite: "Wood & Neal (2007). A new look at habits and the habit-goal interface. Psychological Review, 114(4), 843-863.",
    finding: "Habits are triggered by cues in a stable context (a time, a place, a previous action). Repeating a behaviour in the same context is what makes it automatic.",
  },
  wood2002: {
    id: "wood2002",
    cite: "Wood, Quinn & Kashy (2002). Habits in everyday life: Thought, emotion, and action. Journal of Personality and Social Psychology, 83(6), 1281-1297.",
    finding: "A diary study found that roughly 40 percent of what people did each day was repeated in the same place, close to automatically.",
  },
  wood2016: {
    id: "wood2016",
    cite: "Wood & Neal (2016). Healthy through habit: Interventions for initiating and maintaining health behavior change. Behavioral Science & Policy, 2(1), 71-83.",
    finding: "Changing the context works better than relying on willpower: make the wanted action easy and add friction to the unwanted one.",
  },
  harkin2016: {
    id: "harkin2016",
    cite: "Harkin et al. (2016). Does monitoring goal progress promote goal attainment? A meta-analysis of the experimental evidence. Psychological Bulletin, 142(2), 198-229.",
    finding: "Monitoring progress toward a goal helped people reach it, and the effect was larger when the progress was written down or reported to others.",
  },
  kivetz2006: {
    id: "kivetz2006",
    cite: "Kivetz, Urminsky & Zheng (2006). The goal-gradient hypothesis resurrected: Purchase acceleration, illusionary goal progress, and customer retention. Journal of Marketing Research, 43(1), 39-58.",
    finding: "People speed up as they get closer to a goal. Even a small head start on a loyalty card made people complete it sooner.",
  },
  milkman2014: {
    id: "milkman2014",
    cite: "Milkman, Minson & Volpp (2014). Holding the Hunger Games hostage at the gym: An evaluation of temptation bundling. Management Science, 60(2), 283-299.",
    finding: "Letting people enjoy a favourite audiobook only at the gym raised gym visits, though the effect was modest and faded over time.",
  },
  polivy1985: {
    id: "polivy1985",
    cite: "Polivy & Herman (1985). Dieting and binging: A causal analysis. American Psychologist, 40(2), 193-201.",
    finding: "Described the \"what-the-hell effect\": after breaking a rigid rule, people often abandon the whole goal. Rigid all-or-nothing rules make a single slip more costly.",
  },
  adams2007: {
    id: "adams2007",
    cite: "Adams & Leary (2007). Promoting self-compassionate attitudes toward eating among restrictive and guilty eaters. Journal of Social and Clinical Psychology, 26(10), 1120-1144.",
    finding: "A short self-compassion prompt after a slip reduced the overeating that normally follows breaking a diet rule.",
  },
  breines2012: {
    id: "breines2012",
    cite: "Breines & Chen (2012). Self-compassion increases self-improvement motivation. Personality and Social Psychology Bulletin, 38(9), 1133-1143.",
    finding: "Treating a failure with self-compassion, instead of harsh self-criticism, made people more motivated to try again and improve.",
  },
  bryan2010: {
    id: "bryan2010",
    cite: "Bryan, Karlan & Nelson (2010). Commitment devices. Annual Review of Economics, 2, 671-698.",
    finding: "Reviewed studies where people bind themselves in advance (deposits, public pledges). Commitment helps many people, but results are mixed and depend on the design.",
  },
  bryan2011: {
    id: "bryan2011",
    cite: "Bryan, Walton, Rogers & Dweck (2011). Motivating voter turnout by invoking the self. Proceedings of the National Academy of Sciences, 108(31), 12653-12656.",
    finding: "Asking people about being a voter (an identity) raised turnout more than asking about voting (an action). A real effect, shown in one setting.",
  },
  locke2002: {
    id: "locke2002",
    cite: "Locke & Latham (2002). Building a practically useful theory of goal setting and task motivation: A 35-year odyssey. American Psychologist, 57(9), 705-717.",
    finding: "Specific, challenging-but-achievable goals produce better performance than vague ones (\"do your best\"), as long as people have the means to succeed.",
  },
  dunlosky2013: {
    id: "dunlosky2013",
    cite: "Dunlosky, Rawson, Marsh, Nathan & Willingham (2013). Improving students' learning with effective learning techniques. Psychological Science in the Public Interest, 14(1), 4-58.",
    finding: "Of ten popular study techniques, practice testing and spreading study out over time had the strongest support. Re-reading and highlighting were the least useful.",
  },
  ariga2011: {
    id: "ariga2011",
    cite: "Ariga & Lleras (2011). Brief and rare mental \"breaks\" keep you focused: Deactivation and reactivation of task goals preempt vigilance decrements. Cognition, 118(3), 439-443.",
    finding: "In a long, repetitive task, brief breaks kept performance steady, while people who never paused got steadily worse.",
  },
};

export type Tip = {
  id: string;
  group: TipGroup;
  title: string;
  /** The one-line takeaway. */
  summary: string;
  evidence: Evidence;
  /** Concrete steps. */
  doThis: string[];
  /** What the research says, in plain words. */
  why: string;
  /** An honest caveat, where there is one. */
  caveat?: string;
  sources: SourceId[];
  /** Where to do it in the app. */
  inApp?: { label: string; href: string };
};

export const TIPS: Tip[] = [
  {
    id: "if-then",
    group: "start",
    title: "Decide the when and where in advance",
    summary: "Write an if-then plan: \"When [cue], I will [action] in [place].\"",
    evidence: "strong",
    doThis: [
      "Fill in the sentence: \"After I pour my morning coffee, I will study at my desk for 15 minutes.\"",
      "Add a plan for the obstacle you expect: \"If I feel tired, I will still do 5 minutes.\"",
      "Put the plan in the habit's description so you see it every time.",
    ],
    why: "A meta-analysis of about 94 studies found that people who pre-decide when, where and how they will act are much more likely to follow through. The plan hands the decision to the situation, so you don't have to find motivation at the moment.",
    caveat: "It works for actions you already want to do. It will not make you want something you don't.",
    sources: ["gollwitzer2006", "gardner2012"],
    inApp: { label: "Create a habit with a plan", href: "/habits/manage" },
  },
  {
    id: "start-small",
    group: "start",
    title: "Start with a version you can do on your worst day",
    summary: "A small, simple action is repeated more often, and repetition is what builds the habit.",
    evidence: "moderate",
    doThis: [
      "Pick the smallest version that still counts, for example 15 minutes of study or one page.",
      "Do it every day first. Raise the amount only when it feels easy, not on a fixed calendar.",
      "On a bad day, the small version is the minimum. Doing it counts.",
    ],
    why: "In the habit-formation study, simpler behaviours (like drinking a glass of water) became automatic faster than complex ones (like exercise). Habit researchers advise starting with a simple, specific action.",
    caveat: "\"Tiny habits\" is a popular method, but its bold claims come from the author, not controlled trials. A gradual ramp such as 15, 25, 45, 60 minutes is sensible, but that exact schedule has not been tested.",
    sources: ["lally2010", "gardner2012"],
    inApp: { label: "Set a small daily goal", href: "/habits/manage" },
  },
  {
    id: "cue",
    group: "stay",
    title: "Anchor it to a steady cue and place",
    summary: "Repeat it in the same context, right after something you already do.",
    evidence: "strong",
    doThis: [
      "Choose an anchor you never skip: waking up, coffee, getting home, brushing teeth.",
      "Do the habit at the same time and place as often as you can.",
      "Use the formula: \"After [anchor], I will [habit].\"",
    ],
    why: "Habits are triggered by cues in a stable context. A diary study found that around 40 percent of daily actions were repeated in the same place, close to automatically. The context does the work that willpower otherwise has to.",
    sources: ["wood2007", "wood2002"],
    inApp: { label: "Add a habit", href: "/habits/manage" },
  },
  {
    id: "one-miss",
    group: "stay",
    title: "One missed day doesn't undo your progress",
    summary: "Return the next day. Consistency over months matters more than a perfect streak.",
    evidence: "strong",
    doThis: [
      "If you miss a day, do the smallest version the next day. Don't try to make it up.",
      "Use Skip for a planned rest day (illness, travel) so it doesn't count against you.",
      "Judge yourself on the month, not on a single day.",
    ],
    why: "In the study that measured habit formation, missing one opportunity did not meaningfully affect how automatic the habit became. A habit is built by the overall pattern of repetition.",
    caveat: "\"Never miss twice\" is a handy rule of thumb, not a scientific threshold. Two misses do not \"erase a neural pathway\".",
    sources: ["lally2010", "gardner2012"],
    inApp: { label: "See your month", href: "/habits/week?view=month" },
  },
  {
    id: "track",
    group: "stay",
    title: "Track it, and make the progress visible",
    summary: "Recording your progress helps you reach the goal, especially when it's written down or shared.",
    evidence: "strong",
    doThis: [
      "Log the habit the same day you do it. Seeing the record grow is part of the effect.",
      "Review your month once a week: what happened, what got in the way?",
      "Look at the trend, not a single day.",
    ],
    why: "A meta-analysis of experiments found that monitoring progress toward a goal increased the chance of reaching it, and the effect was larger when progress was physically recorded or reported to someone. People also speed up as they near a goal (the goal-gradient effect).",
    caveat: "Tracking is well supported. The 40 to 60 percent boost sometimes quoted is not from any study.",
    sources: ["harkin2016", "kivetz2006"],
    inApp: { label: "Open your progress", href: "/habits/week?view=month" },
  },
  {
    id: "goals",
    group: "start",
    title: "Make the target specific and achievable",
    summary: "\"Study 25 minutes at 6 am\" beats \"study more\".",
    evidence: "strong",
    doThis: [
      "Say exactly what, how much and when.",
      "Make it challenging enough to matter, but within reach this week.",
      "Break a big goal (like a long study day) into steps you can finish.",
    ],
    why: "Decades of goal-setting research show that specific, challenging-but-achievable goals lead to better performance than vague ones, as long as the person has the means to do it.",
    sources: ["locke2002"],
    inApp: { label: "Set a measurable goal", href: "/habits/manage" },
  },
  {
    id: "friction",
    group: "environment",
    title: "Remove friction from the habit you want, add it to the one you don't",
    summary: "Set up the environment the night before so starting takes no decisions.",
    evidence: "moderate",
    doThis: [
      "Lay out what you need: open the book, charge the laptop, put your shoes by the door.",
      "Put the phone in another room while you work.",
      "Make the habit you're quitting a little harder: log out, delete the app, move it out of reach.",
    ],
    why: "Habit researchers recommend changing the context instead of relying on willpower: make the wanted action easy and the unwanted one inconvenient. This is consistent with how cue-driven habits work.",
    caveat: "The idea is well supported in general. Exact figures like \"80 percent more likely to start\" are not from studies.",
    sources: ["wood2016", "wood2007"],
  },
  {
    id: "bundle",
    group: "start",
    title: "Pair it with something you enjoy",
    summary: "Save a treat for the habit: a favourite podcast, drink or place.",
    evidence: "emerging",
    doThis: [
      "Choose a pleasure you only allow yourself while doing the habit.",
      "Study at a café you like, or listen to a favourite playlist during a workout.",
    ],
    why: "In one field experiment, people who could only listen to a gripping audiobook at the gym went more often.",
    caveat: "The effect was modest and faded over time, so treat it as a boost for starting, not a long-term fix.",
    sources: ["milkman2014"],
  },
  {
    id: "self-compassion",
    group: "mindset",
    title: "Plan how to treat a slip",
    summary: "Talk to yourself as you would to a friend. Harsh self-criticism makes people quit.",
    evidence: "moderate",
    doThis: [
      "Decide in advance what you'll do after a miss: \"I'll do the small version tomorrow.\"",
      "Avoid all-or-nothing rules. A shorter session still counts.",
      "Notice the thought \"I've already failed, so why bother\" and treat it as a trap.",
    ],
    why: "Breaking a rigid rule often leads people to drop the whole goal (the \"what-the-hell effect\"). In experiments, self-compassion after a failure reduced that spiral and increased the motivation to try again.",
    sources: ["polivy1985", "adams2007", "breines2012"],
  },
  {
    id: "commit",
    group: "mindset",
    title: "Tell someone, specifically",
    summary: "A clear public commitment can help you start. Vague ones don't.",
    evidence: "moderate",
    doThis: [
      "Say it precisely: \"I'm studying 6 to 6:30 am every day this week.\"",
      "Choose one person who will ask, or share your progress with someone each week.",
      "Consider a small stake you set yourself, if it motivates you.",
    ],
    why: "Research on commitment devices shows that binding yourself in advance helps many people follow through. Results are mixed and depend on how it's designed, so use it as a support, not a guarantee.",
    sources: ["bryan2010", "harkin2016"],
  },
  {
    id: "identity",
    group: "mindset",
    title: "Frame it as who you are, and back it with action",
    summary: "\"I'm someone who studies\" can help, but only alongside the repetition.",
    evidence: "emerging",
    doThis: [
      "Phrase it as a noun: \"I'm a runner\" rather than \"I run.\"",
      "Keep it honest and small to begin with: \"I'm someone who studies every morning.\"",
      "Let each completed day be the evidence.",
    ],
    why: "In one well-known study, asking people about being a voter raised turnout more than asking about voting. Identity framing can strengthen motivation, but the evidence is from specific settings.",
    caveat: "The claim that identity is \"3 times more powerful than goals\" is not from research. Treat identity as a helpful extra, not a replacement for planning and repetition.",
    sources: ["bryan2011"],
  },
  {
    id: "study",
    group: "study",
    title: "Study by testing yourself and spreading it out",
    summary: "Quiz yourself and revisit topics over days. Re-reading and highlighting are weak.",
    evidence: "strong",
    doThis: [
      "After reading, close the book and write down or say what you remember (practice testing).",
      "Spread a topic over several days instead of one long session (distributed practice).",
      "Do practice questions regularly. They are more useful than re-reading your notes.",
    ],
    why: "A large review of ten popular study techniques rated practice testing and distributed practice as the most useful, and highlighting and re-reading as the least.",
    sources: ["dunlosky2013"],
    inApp: { label: "Start a focus session", href: "/focus" },
  },
  {
    id: "breaks",
    group: "study",
    title: "Take short breaks during long work",
    summary: "Brief pauses keep attention steady. Working without a pause makes it drift.",
    evidence: "emerging",
    doThis: [
      "Work in blocks (25 to 50 minutes) with a short break between.",
      "During the break, step away from the screen.",
      "Use the Pomodoro option in the Focus timer for longer sessions.",
    ],
    why: "In a long, repetitive task, people who took brief breaks stayed steady while those who didn't got steadily worse. The effect is shown mostly in lab tasks.",
    caveat: "The Pomodoro method has little direct testing. The idea that short breaks help is supported, but the exact 25 and 5 minute rhythm is a convention.",
    sources: ["ariga2011"],
    inApp: { label: "Try Pomodoro in Focus", href: "/focus" },
  },
];

export type Verdict = "myth" | "oversimplified" | "partly" | "supported";
export const VERDICT_META: Record<Verdict, { label: string }> = {
  myth: { label: "Myth" },
  oversimplified: { label: "Oversimplified" },
  partly: { label: "Partly true" },
  supported: { label: "Supported" },
};

export type MythCheck = { id: string; claim: string; verdict: Verdict; truth: string; sources?: SourceId[] };

export const MYTHS: MythCheck[] = [
  {
    id: "21",
    claim: "It takes 21 days to form a habit.",
    verdict: "myth",
    truth: "The 21-day figure comes from a 1960 self-help book, not from research. A real study found the middle figure was about 66 days, ranging from 18 to 254. A later review found roughly two months. It depends on the person and the behaviour.",
    sources: ["lally2010", "singh2024"],
  },
  {
    id: "14",
    claim: "You only need to survive 14 days; after day 15 it's autopilot.",
    verdict: "myth",
    truth: "No study shows a switch at day 14. Habits become automatic gradually, getting easier as you repeat them, and most people still need weeks or months.",
    sources: ["lally2010", "singh2024"],
  },
  {
    id: "stages",
    claim: "Days 4 to 7 are a \"reality check\" where motivation drops 30%, and days 8 to 14 are the temptation peak.",
    verdict: "myth",
    truth: "These stages and percentages don't come from any study we could find. What research does show is a gradual curve: it takes the most effort early, and less as the behaviour repeats.",
    sources: ["lally2010"],
  },
  {
    id: "42",
    claim: "The average time is 42 days.",
    verdict: "myth",
    truth: "That number isn't from the research. The real spread is huge, so no single average fits everyone.",
    sources: ["lally2010", "singh2024"],
  },
  {
    id: "two-days",
    claim: "Missing two days in a row erodes the neural pathway and kills the habit.",
    verdict: "myth",
    truth: "There's no evidence for a two-day cliff. In the habit-formation study, missing a single day made little difference. \"Never miss twice\" is a useful rule of thumb to get back quickly, but it is not biology.",
    sources: ["lally2010", "gardner2012"],
  },
  {
    id: "identity-3x",
    claim: "Identity-based habits are 3 times more powerful than goals.",
    verdict: "oversimplified",
    truth: "No study gives a \"3x\" figure. Identity framing has some support (people respond to \"be a voter\" more than \"vote\"), but it works alongside planning and repetition, not instead of them.",
    sources: ["bryan2011"],
  },
  {
    id: "brain",
    claim: "Identity habits use a different brain region (orbitofrontal vs dorsolateral cortex), and if-then plans bypass the prefrontal cortex.",
    verdict: "myth",
    truth: "These brain-region claims are not established. What is established is the behavioural effect: if-then plans measurably improve follow-through.",
    sources: ["gollwitzer2006"],
  },
  {
    id: "dopamine",
    claim: "Habits run on an immediate dopamine reward loop, and without a reward your brain won't repeat an action.",
    verdict: "oversimplified",
    truth: "Rewards help new behaviours get learned, but habits are driven mostly by repetition in a stable context, and many become automatic with little reward. Calling it a dopamine loop is a simplification.",
    sources: ["wood2007"],
  },
  {
    id: "progress-40",
    claim: "Seeing your progress increases motivation by 40 to 60%.",
    verdict: "partly",
    truth: "Tracking progress really does help people reach goals (a meta-analysis shows it), and people speed up near a goal. But the 40 to 60 percent number isn't from any study.",
    sources: ["harkin2016", "kivetz2006"],
  },
  {
    id: "chain",
    claim: "Marking a red X every day and never breaking the chain is proven.",
    verdict: "partly",
    truth: "Tracking is supported. The \"don't break the chain\" story is an anecdote, and for some people a long streak that resets to zero can discourage them. That is why this app offers skip and rest days.",
    sources: ["harkin2016", "polivy1985"],
  },
  {
    id: "ramp",
    claim: "Start at 15 minutes and raise it gradually (15, 25, 45, 60, 90).",
    verdict: "partly",
    truth: "Starting simple is backed by research. The exact weekly schedule is sensible but untested: raise the amount when the current level feels easy.",
    sources: ["lally2010", "gardner2012"],
  },
  {
    id: "if-then-real",
    claim: "If-then plans (\"When X, I will Y\") help you follow through.",
    verdict: "supported",
    truth: "One of the best-supported techniques in the field: a meta-analysis of about 94 studies found a medium-to-large effect.",
    sources: ["gollwitzer2006"],
  },
];
