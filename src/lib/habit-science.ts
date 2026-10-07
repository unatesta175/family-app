export type Evidence = "strong" | "moderate" | "emerging";

export const EVIDENCE_META: Record<Evidence, { label: string; blurb: string }> = {
  strong: { label: "Strong", blurb: "Backed by many studies or reviews" },
  moderate: { label: "Moderate", blurb: "Good studies, but fewer or mixed results" },
  emerging: { label: "Promising", blurb: "Early research or sound reasoning; less proven" },
};

export type StartTip = {
  id: string;
  title: string;
  /** The instruction, short and direct. */
  action: string;
  /** Why it works, in plain words. */
  why: string;
  evidence: Evidence;
  /** The research it rests on, by name (no figures). */
  basis: string;
};

/** Twenty ways to get started on something you keep putting off, ordered roughly by how much they help. */
export const START_TIPS: StartTip[] = [
  {
    id: "one-minute",
    title: "Just start for 1 minute",
    action: "Open the book and study for one minute. Give yourself full permission to stop after that.",
    why: "Starting is the hardest part. The dread is almost always bigger than the task, and once you are in it, carrying on is far easier than beginning.",
    evidence: "moderate",
    basis: "Task-initiation and behavioural-activation research",
  },
  {
    id: "tiny",
    title: "Shrink it until it's impossible to refuse",
    action: "Your habit today is 'open the notes and read one page', not 'study 4 hours'.",
    why: "A tiny version removes the need for motivation. You build the routine first and let the time grow after.",
    evidence: "moderate",
    basis: "Habit-formation studies (Lally 2010) and behavioural-design work",
  },
  {
    id: "if-then",
    title: "Decide the when and where in advance",
    action: "Write it down: 'If it is 7 pm, then I sit at my desk and open my notes.' Then do exactly that.",
    why: "Deciding ahead moves the choice out of the moment, when you are most likely to dodge it.",
    evidence: "strong",
    basis: "Implementation intentions (Gollwitzer & Sheeran 2006, a large review)",
  },
  {
    id: "same-spot",
    title: "Same time, same place, every day",
    action: "Pick one desk and one start time, and keep them. Use it only for studying if you can.",
    why: "Repeating the same context turns the place and time into the trigger, so you start without having to decide.",
    evidence: "strong",
    basis: "Habit and context research (Wood & Neal 2007)",
  },
  {
    id: "mood",
    title: "Name the feeling, then start anyway",
    action: "Say it: 'I feel anxious about this.' Do not wait for the feeling to go away. Start while it is there.",
    why: "Procrastination is mostly a mood problem, not laziness. We avoid the task to avoid the bad feeling, which only feeds it.",
    evidence: "strong",
    basis: "Procrastination as emotion regulation (Sirois & Pychyl 2013)",
  },
  {
    id: "phone",
    title: "Put your phone in another room",
    action: "Not face down on the desk. Out of sight, ideally out of the room, before you begin.",
    why: "Distraction you have to resist costs focus. Removing it costs nothing.",
    evidence: "moderate",
    basis: "Studies on a phone's mere presence (results are mixed, but the effect is plausible)",
  },
  {
    id: "setup",
    title: "Set it up the night before",
    action: "Leave the book open, the pen out and the laptop on the right page. Make starting the easiest thing in the room.",
    why: "Every step between you and the first minute is a chance to quit. Cut the steps.",
    evidence: "moderate",
    basis: "Friction and choice-architecture research",
  },
  {
    id: "easy-first",
    title: "Begin with the easiest part",
    action: "Start with a topic you like or already know. Save the hard chapter for when you are warmed up.",
    why: "A quick win builds momentum, and momentum makes the hard parts feel smaller.",
    evidence: "emerging",
    basis: "Progress and momentum research (e.g. Amabile & Kramer 2011)",
  },
  {
    id: "next-step",
    title: "End each session mid-task, with the next step written",
    action: "Stop in the middle of something and write 'next: do problems 5 to 10'. Tomorrow's start is already decided.",
    why: "An unfinished task nags at you and pulls you back, and a written next step means no blank-page moment.",
    evidence: "emerging",
    basis: "Unfinished-task effects (Zeigarnik) and planning research",
  },
  {
    id: "timer",
    title: "Set a timer for 25 minutes",
    action: "Work until it rings, take 5 minutes, repeat. You only have to survive one block at a time.",
    why: "A clear end makes starting feel safe. Four hours is scary; 25 minutes is not.",
    evidence: "emerging",
    basis: "Time-boxing and the role of breaks in sustaining focus (Ariga & Lleras 2011)",
  },
  {
    id: "ramp",
    title: "Build up to 4 hours, don't begin there",
    action: "Start at 30 to 60 minutes, add 15 minutes every few days. Reaching 4 hours steadily beats failing at it on day one.",
    why: "A target that is too big makes you avoid it. Habits form faster when the behaviour is easy to repeat.",
    evidence: "moderate",
    basis: "Habit-formation research and goal-difficulty findings",
  },
  {
    id: "specific",
    title: "Know exactly what you will do in each block",
    action: "'Study' is vague. 'Chapter 4, questions 1 to 12' is a plan. Write the list before you sit down.",
    why: "Vague tasks feel heavy. Specific, concrete goals get done far more often than 'do your best'.",
    evidence: "strong",
    basis: "Goal-setting theory (Locke & Latham 2002)",
  },
  {
    id: "commit",
    title: "Lock yourself in",
    action: "Block distracting sites and apps, tell someone your plan, or book a seat at the library.",
    why: "You know your future self will be tempted. Make quitting harder in advance.",
    evidence: "moderate",
    basis: "Commitment-device studies (Bryan, Karlan & Nelson 2010)",
  },
  {
    id: "body-double",
    title: "Study alongside someone",
    action: "Go to the library, join a study call, or sit with a friend who is also working.",
    why: "Seeing others work makes it feel normal, and being seen makes you less likely to drift.",
    evidence: "emerging",
    basis: "Social-facilitation research; studies on co-working are still limited",
  },
  {
    id: "bundle",
    title: "Pair it with something you enjoy",
    action: "Keep your favourite drink, playlist or snack for study time only.",
    why: "If studying comes with something you look forward to, the start feels less like a chore.",
    evidence: "moderate",
    basis: "Temptation bundling (Milkman, Minson & Volpp 2014)",
  },
  {
    id: "reward",
    title: "Reward yourself right after",
    action: "Finish a block, then do something you like straight away: tea, a walk, a short game.",
    why: "The brain learns from rewards that come soon after the behaviour. Distant rewards like exam results are too far away to help.",
    evidence: "moderate",
    basis: "Reinforcement and present-bias research",
  },
  {
    id: "track",
    title: "Tick it off every day",
    action: "Log each session in your habit tracker. Watching the days stack up pulls you in.",
    why: "Tracking is one of the most reliable ways to keep going. It makes progress visible and keeps you honest.",
    evidence: "strong",
    basis: "Progress monitoring meta-analysis (Harkin 2016)",
  },
  {
    id: "forgive",
    title: "If you miss a day, don't punish yourself",
    action: "Say 'it happens' and start again tomorrow. Do not add guilt, and do not try to make up for it by doing double.",
    why: "Guilt makes you avoid the task even more. Being kind to yourself after a slip is linked to less procrastination next time.",
    evidence: "moderate",
    basis: "Self-forgiveness and procrastination (Wohl, Pychyl & Bennett 2010)",
  },
  {
    id: "sleep",
    title: "Protect your sleep",
    action: "Keep a steady bedtime. A tired brain is much harder to start.",
    why: "When you are short on sleep, self-control and mood both suffer, and avoidance gets easier.",
    evidence: "moderate",
    basis: "Sleep and self-regulation research",
  },
  {
    id: "identity",
    title: "Be someone who studies",
    action: "Tell yourself 'I'm a person who studies every day', and then back it with the next small action.",
    why: "Seeing the habit as part of who you are helps you keep it. It only works if the small actions follow.",
    evidence: "emerging",
    basis: "Identity-based motivation research; a plausible but less tested idea",
  },
];
