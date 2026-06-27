// tower-levels.js — Tower Logic slice: 2 worlds × 5 levels.
// World 1 forces "fire only what's in range" (because fire costs scarce energy).
// World 2 forces writing your own targeting loop + priority (brutes appear).

const W = (rng, base, amt) => Math.max(0, base + Math.round((rng() * 2 - 1) * amt));

export const TOWER_TOPICS = [
  { key: "first", label: "First Shots" },
  { key: "target", label: "Choose Your Target" },
];

const W1_STARTER = `def decide(t):
    # nearest(t) = the closest enemy in THIS turret's lane (or None).
    e = nearest(t)
    if e is not None and e["dist"] <= t["range"]:
        return fire(e)        # fire costs energy even if it misses — only fire in range
    return hold()
`;

const W2_STARTER = `def decide(t):
    # Find the in-range enemy CLOSEST to the house (smallest col) yourself.
    target = None
    for e in t["enemies"]:
        if e["dist"] <= t["range"]:
            if target is None or e["col"] < target["col"]:
                target = e
    return fire(target) if target else hold()
`;

export const TOWER_LEVELS = [
  // ───────────── WORLD 1 · FIRST SHOTS ─────────────
  {
    topic: "first", id: "1.1", name: "Open Fire", concept: "Calling fire()",
    blurb: "One lane, one turret, a trickle of walkers. nearest(t) gives you the closest enemy; just fire at it.",
    rows: 1, cols: 9, range: 9, damage: 2, energyStart: 50, regenEvery: 2, lives: 3,
    turrets: [{ row: 0, col: 1 }],
    randomize: true, passThreshold: 0.9,
    starter: `def decide(t):
    # nearest(t) returns the closest enemy in this lane, or None.
    return fire(nearest(t))   # fire(None) safely holds
`,
    waves: (rng) => [0, 6, 12, 18].map((tk, i) => ({ tick: W(rng, tk, 2), row: 0, type: "walker" })),
  },
  {
    topic: "first", id: "1.2", name: "In Range", concept: "if + range (don't waste energy)",
    blurb: "Long lane, short range, scarce energy. Every shot costs energy even if it misses — fire at out-of-range enemies and you'll run dry before they arrive. Only fire when dist ≤ range.",
    rows: 1, cols: 11, range: 3, damage: 2, energyStart: 5, regenEvery: 4, lives: 2,
    turrets: [{ row: 0, col: 1 }],
    randomize: true, passThreshold: 0.85, starter: W1_STARTER,
    waves: (rng) => [0, 7, 14, 21].map((tk) => ({ tick: W(rng, tk, 2), row: 0, type: "walker" })),
  },
  {
    topic: "first", id: "1.3", name: "Hold the Line", concept: "Same rule, denser wave",
    blurb: "A longer column of walkers and tighter energy. Two turrets share the lane — the same in-range rule has to hold up under pressure.",
    rows: 1, cols: 10, range: 4, damage: 2, energyStart: 7, regenEvery: 2, lives: 3,
    turrets: [{ row: 0, col: 1 }, { row: 0, col: 2 }],
    randomize: true, passThreshold: 0.8, starter: W1_STARTER,
    waves: (rng) => [0, 4, 8, 12, 16, 20, 24].map((tk) => ({ tick: W(rng, tk, 2), row: 0, type: "walker" })),
  },
  {
    topic: "first", id: "1.4", name: "Two Lanes", concept: "One brain, every lane",
    blurb: "Two lanes now, a turret on each. decide() runs per turret on its OWN lane — the same code defends both.",
    rows: 2, cols: 9, range: 4, damage: 2, energyStart: 10, regenEvery: 2, lives: 3,
    turrets: [{ row: 0, col: 1 }, { row: 1, col: 1 }],
    randomize: true, passThreshold: 0.8, starter: W1_STARTER,
    waves: (rng) => {
      const out = [];
      for (let i = 0; i < 8; i++) out.push({ tick: W(rng, i * 5, 2), row: i % 2, type: "walker" });
      return out;
    },
  },
  {
    topic: "first", id: "1.5", name: "Boss: First Swarm", concept: "Synthesis under load",
    blurb: "A real swarm across two lanes. Same in-range discipline, three turrets, no panic firing.",
    rows: 2, cols: 10, range: 5, damage: 2, energyStart: 12, regenEvery: 2, lives: 4,
    turrets: [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 0, col: 2 }],
    randomize: true, passThreshold: 0.75, starter: W1_STARTER,
    waves: (rng) => {
      const out = [];
      for (let i = 0; i < 12; i++) out.push({ tick: W(rng, i * 4, 2), row: i % 2, type: "walker" });
      return out;
    },
  },

  // ───────────── WORLD 2 · CHOOSE YOUR TARGET ─────────────
  {
    topic: "target", id: "2.1", name: "Tougher Skin", concept: "for loop over t['enemies']",
    blurb: "Brutes! They have lots of HP. nearest() is gone — loop over t['enemies'] to find the in-range enemy nearest the house and focus it.",
    rows: 1, cols: 10, range: 5, damage: 2, energyStart: 14, regenEvery: 2, lives: 3,
    turrets: [{ row: 0, col: 1 }, { row: 0, col: 2 }],
    randomize: true, passThreshold: 0.8, starter: W2_STARTER,
    waves: (rng) => [
      { tick: W(rng, 0, 1), row: 0, type: "walker" },
      { tick: W(rng, 4, 1), row: 0, type: "brute" },
      { tick: W(rng, 12, 2), row: 0, type: "walker" },
      { tick: W(rng, 18, 2), row: 0, type: "brute" },
    ],
  },
  {
    topic: "target", id: "2.2", name: "Pick the Threat", concept: "Priority = closest to the house",
    blurb: "Walkers and brutes mixed. Whatever is nearest the house leaks first — your loop must always focus that one.",
    rows: 1, cols: 11, range: 6, damage: 2, energyStart: 16, regenEvery: 2, lives: 3,
    turrets: [{ row: 0, col: 1 }, { row: 0, col: 2 }],
    randomize: true, passThreshold: 0.75, starter: W2_STARTER,
    waves: (rng) => {
      const out = [];
      const types = ["walker", "brute", "walker", "brute", "walker", "brute"];
      for (let i = 0; i < types.length; i++) out.push({ tick: W(rng, i * 5, 2), row: 0, type: types[i] });
      return out;
    },
  },
  {
    topic: "target", id: "2.3", name: "Mixed Lane", concept: "Loop holds under variety",
    blurb: "A messy, interleaved column of walkers and brutes. The same focus-the-nearest loop should clear it — if it's robust.",
    rows: 1, cols: 11, range: 6, damage: 2, energyStart: 18, regenEvery: 2, lives: 4,
    turrets: [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }],
    randomize: true, passThreshold: 0.75, starter: W2_STARTER,
    waves: (rng) => {
      const out = [];
      for (let i = 0; i < 9; i++) out.push({ tick: W(rng, i * 4, 2), row: 0, type: rng() < 0.4 ? "brute" : "walker" });
      return out;
    },
  },
  {
    topic: "target", id: "2.4", name: "Three Lanes", concept: "Per-lane targeting at scale",
    blurb: "Three lanes, a turret pair on each. Your one decide() handles all of them, each on its own lane's threats.",
    rows: 3, cols: 10, range: 5, damage: 2, energyStart: 22, regenEvery: 1, lives: 4,
    turrets: [
      { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 },
      { row: 0, col: 2 }, { row: 1, col: 2 }, { row: 2, col: 2 },
    ],
    randomize: true, passThreshold: 0.7, starter: W2_STARTER,
    waves: (rng) => {
      const out = [];
      for (let i = 0; i < 12; i++) out.push({ tick: W(rng, i * 4, 2), row: i % 3, type: rng() < 0.35 ? "brute" : "walker" });
      return out;
    },
  },
  {
    topic: "target", id: "2.5", name: "Boss: Breakthrough", concept: "Full synthesis",
    blurb: "The final slice trial: three lanes, heavy brute pressure, held-out waves. Prove your targeting loop generalizes.",
    rows: 3, cols: 11, range: 6, damage: 2, energyStart: 26, regenEvery: 1, lives: 5,
    turrets: [
      { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 },
      { row: 0, col: 2 }, { row: 1, col: 2 }, { row: 2, col: 2 },
    ],
    randomize: true, passThreshold: 0.65, starter: W2_STARTER,
    waves: (rng) => {
      const out = [];
      for (let i = 0; i < 16; i++) out.push({ tick: W(rng, i * 3, 2), row: i % 3, type: rng() < 0.45 ? "brute" : "walker" });
      return out;
    },
  },
];
