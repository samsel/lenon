export type SkillId =
  | "skill_math_quest"
  | "skill_story_builder"
  | "skill_science_explainer"
  | "skill_reading_buddy"
  | "skill_code_playground";

export interface LenonSkillMeta {
  id: SkillId;
  name: string;
  glyph: string;
  color: string;
  bg: string;
  accent: string;
  short: string;
  tag: string;
  sys: string;
}

export const LENON_SKILLS: LenonSkillMeta[] = [
  {
    id: "skill_math_quest",
    name: "Math Quest",
    glyph: "∑",
    color: "#1F6E5A",
    bg: "#10302A",
    accent: "#3FB68C",
    short: "Adaptive math through quests",
    tag: "A galaxy of number puzzles awaits.",
    sys: "ACTIVE SKILL - Math Quest: act as an adaptive math tutor. Give one short problem at a time, celebrate effort, and give a gentle hint before answers."
  },
  {
    id: "skill_story_builder",
    name: "Story Builder",
    glyph: "✦",
    color: "#9A86D8",
    bg: "#2A2150",
    accent: "#B6A4F0",
    short: "Co-write safe stories and worlds",
    tag: "Open the book. Anything kind can happen.",
    sys: "ACTIVE SKILL - Story Builder: co-create an imaginative, non-scary story. Write a sentence or two, then ask what happens next. Keep it wholesome and age-appropriate."
  },
  {
    id: "skill_science_explainer",
    name: "Science Lab",
    glyph: "◎",
    color: "#4F9DD9",
    bg: "#123A54",
    accent: "#6FB8E6",
    short: "Safe experiments and big questions",
    tag: "Let's find out how the world works.",
    sys: "ACTIVE SKILL - Science Lab: explain science in age-appropriate ways using everyday analogies. Suggest only safe observations with grown-up supervision."
  },
  {
    id: "skill_reading_buddy",
    name: "Reading Buddy",
    glyph: "❧",
    color: "#E07A5F",
    bg: "#4A241B",
    accent: "#F0A088",
    short: "Vocabulary and comprehension",
    tag: "Words are doors. Pick one and step through.",
    sys: "ACTIVE SKILL - Reading Buddy: build vocabulary and comprehension. Define words simply, give an example sentence, and ask a light question."
  },
  {
    id: "skill_code_playground",
    name: "Code Playground",
    glyph: "›_",
    color: "#3D4A57",
    bg: "#1A2531",
    accent: "#7FA0BD",
    short: "Beginner coding puzzles",
    tag: "Tiny puzzles, big ideas.",
    sys: "ACTIVE SKILL - Code Playground: teach beginner coding concepts with small puzzles. Explain errors kindly and avoid copy-paste full solutions."
  }
];

export const skillMeta = (id: string | undefined) => LENON_SKILLS.find((skill) => skill.id === id);

export interface MathProblem {
  text: string;
  ans: number;
  choices: number[];
}

export function genMathProblem(level: number): MathProblem {
  const random = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
  let a: number;
  let b: number;
  let op: string;
  let ans: number;
  if (level === 0) {
    a = random(2, 9);
    b = random(2, 9);
    op = "+";
    ans = a + b;
  } else if (level === 1) {
    a = random(11, 28);
    b = random(6, 18);
    op = "+";
    ans = a + b;
  } else if (level === 2) {
    a = random(12, 20);
    b = random(3, 9);
    op = "−";
    ans = a - b;
  } else if (level === 3) {
    a = random(2, 6);
    b = random(2, 6);
    op = "×";
    ans = a * b;
  } else if (level === 4) {
    a = random(3, 9);
    b = random(4, 9);
    op = "×";
    ans = a * b;
  } else {
    a = random(6, 9);
    b = random(6, 9);
    op = "×";
    ans = a * b;
  }

  const choices = new Set<number>([ans]);
  while (choices.size < 4) {
    const candidate = ans + random(-6, 6);
    if (candidate > 0 && candidate !== ans) choices.add(candidate);
  }

  return { text: `${a} ${op} ${b}`, ans, choices: [...choices].sort(() => Math.random() - 0.5) };
}

export const STORY_OPTIONS = {
  heroes: [
    { short: "Brave fox", label: "a brave little fox", emoji: "🦊" },
    { short: "Friendly robot", label: "a friendly robot", emoji: "🤖" },
    { short: "Young explorer", label: "a young explorer", emoji: "🧭" },
    { short: "Tiny dragon", label: "a tiny dragon", emoji: "🐉" }
  ],
  places: [
    { short: "Glowing forest", label: "a glowing forest", emoji: "🌲" },
    { short: "Outer space", label: "outer space", emoji: "🚀" },
    { short: "Under the sea", label: "under the sea", emoji: "🌊" },
    { short: "Cloud castle", label: "a castle in the clouds", emoji: "🏰" }
  ],
  problems: [
    { short: "Lost treasure", label: "a lost treasure to find", emoji: "💎" },
    { short: "A mystery", label: "a curious mystery", emoji: "🔍" },
    { short: "A new friend", label: "a brand-new friend to help", emoji: "🤝" },
    { short: "A big storm", label: "a big storm coming", emoji: "⛈️" }
  ]
};

export function buildStoryPrompt(hero: string, place: string, problem: string): string {
  return (
    "You are Lenon, a kind storyteller for kids. Write a short, wholesome, age-appropriate story (4-6 sentences) for a 9-12 year old. " +
    `Hero: ${hero}. Setting: ${place}. Adventure: ${problem}. ` +
    "Make it imaginative, warm and never scary, and end on a gentle cliffhanger that invites what happens next. Write plain story prose only."
  );
}

export function buildContinuePrompt(storySoFar: string, flavor: string): string {
  return (
    `Continue this children's story with 3-4 more sentences, making what happens next ${flavor}. ` +
    "Keep it safe, kind and wholesome, ending on another little hook. Write plain story prose only. Story so far:\n" +
    storySoFar
  );
}

export function cleanStory(text: string): string {
  return (text || "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*?/g, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/`/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
