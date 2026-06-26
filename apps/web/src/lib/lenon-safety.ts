export type LenonAgeBand = "6-8" | "9-12" | "13-15";

export interface BlockedTopics {
  violence: boolean;
  dating: boolean;
  politics: boolean;
}

export type GateAction =
  | "block"
  | "crisis_escalation"
  | "educational_redirect"
  | "ask_parent_permission"
  | "answer_with_caution";

export interface GateHit {
  category: string;
  action: GateAction;
  reply: string;
}

export function safetyGate(text: string, blocked: BlockedTopics): GateHit | null {
  const normalized = text.toLowerCase();
  const test = (regex: RegExp) => regex.test(normalized);

  if (test(/\b(\d+\s*\w+\s*(street|st|avenue|ave|road|rd|lane)|my address is|i live at|my phone|my school is|phone number)\b/)) {
    return {
      category: "personal data",
      action: "block",
      reply:
        "Let's keep things like your address, school and phone number private, even from me. Want to make up a pretend place for a story instead?"
    };
  }

  if (test(/\b(kill myself|hurt myself|self.?harm|want to die)\b/)) {
    return {
      category: "self-harm",
      action: "crisis_escalation",
      reply:
        "I'm really glad you told me. This is something to share with a grown-up you trust right now, like a parent, teacher, or caregiver."
    };
  }

  if (blocked.violence && test(/\b(gun|weapon|kill|blood|gore|fight|punch|stab|bomb|knife)\b/)) {
    return {
      category: "violence",
      action: "educational_redirect",
      reply:
        "That's not something I can help make. I can help turn it into a clever, safe adventure where the hero solves things with kindness."
    };
  }

  if (blocked.dating && test(/\b(boyfriend|girlfriend|dating|crush|kiss)\b/)) {
    return {
      category: "dating",
      action: "ask_parent_permission",
      reply:
        "That's a topic your grown-up asked me to check in on first. We can chat about friends, stories, or something you're curious about today."
    };
  }

  if (blocked.politics && test(/\b(election|democrat|republican|president|vote for)\b/)) {
    return {
      category: "politics",
      action: "answer_with_caution",
      reply:
        "I try not to take sides on grown-up topics like that. A trusted grown-up is the best person to talk it through with."
    };
  }

  return null;
}

export const AGE_CONFIG: Record<
  LenonAgeBand,
  { greet: string; sub: string; intro: string; sys: string }
> = {
  "6-8": {
    greet: "Hi friend! What should we explore?",
    sub: "Tap a quest, or just say hi to me!",
    intro: "Hi! I'm Lenon. We can read, make up stories, and play with numbers. What sounds fun?",
    sys: "The child is 6-8 years old, an early reader. Use very short sentences and simple, playful words. Be warm and full of encouragement. Offer to read things aloud. Keep replies to 2-3 short sentences."
  },
  "9-12": {
    greet: "Hi Ava! Ready to explore?",
    sub: "Pick a quest, keep chatting, or ask a grown-up.",
    intro:
      "Hi Ava! I can help you learn, make stories, solve puzzles and explore ideas. I'll keep things safe, and sometimes I'll suggest asking a grown-up. What should we do?",
    sys: "The child is 9-12, a curious learner. Use friendly examples and analogies. For homework, give hints and ask guiding questions before answers. Keep replies to 2-4 sentences."
  },
  "13-15": {
    greet: "Hey, what are you working on?",
    sub: "Homework, a project, or something you're curious about.",
    intro: "Hey, I'm Lenon. I can help with schoolwork, writing, coding, or whatever you're into. What's up?",
    sys: "The teen is 13-15. Respect their autonomy, keep a calm and genuine tone. Help with projects, coding, writing and research. Give hints before full answers on homework. Keep replies concise."
  }
};

export function buildSafetyPrompt(ageBand: LenonAgeBand, skillSys?: string): string {
  const cfg = AGE_CONFIG[ageBand];
  const skillLine = skillSys ? `${skillSys} ` : "";
  return (
    skillLine +
    "You are Lenon, a kind, patient AI companion for children inside a parent-governed safe app. " +
    cfg.sys +
    " Core rules you never break: teach and encourage effort instead of just handing over answers; never ask for or store personal info; never claim to be a human, parent, doctor, therapist, or best friend; never encourage keeping secrets from parents. If a request is unsafe, scary, adult, violent, or about self-harm, gently decline in one kind sentence and offer a fun, safe alternative. For anything serious or upsetting, warmly encourage talking to a trusted grown-up. Never use more than 4 sentences."
  );
}
