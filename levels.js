// levels.js — Act 1, 7 topics × 5 levels = 35.
// Authoring rule: a level is valid only if its canonical solution uses a
// construct the previous level's canonical did NOT. Difficulty comes from the
// construct, not the map. Command mode (1–3) runs the player's code once as a
// plan; reflex mode (4–7) calls decide(sensors) every tick.

const SIZE = 11;

function frame(extra = []) {
  const walls = [];
  for (let i = 0; i < SIZE; i++) walls.push([i, 0], [i, SIZE - 1], [0, i], [SIZE - 1, i]);
  return walls.concat(extra);
}
// Build walls = everything EXCEPT the carved-open cells (for corridors/mazes).
function carve(open, size = SIZE) {
  const o = new Set(open.map(([x, y]) => x + "," + y));
  const walls = [];
  for (let x = 0; x < size; x++) for (let y = 0; y < size; y++) if (!o.has(x + "," + y)) walls.push([x, y]);
  return walls;
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

export const TOPICS = [
  { key: "commands", label: "Commands", growth: "Hatchling" },
  { key: "math", label: "Variables & Math", growth: "Nibbler" },
  { key: "branching", label: "Branching", growth: "Forager" },
  { key: "reflexes", label: "Reflexes", growth: "Skittish" },
  { key: "scanning", label: "Scanning", growth: "Scout" },
  { key: "memory", label: "Memory", growth: "Tracker" },
  { key: "functions", label: "Functions", growth: "Hunter" },
];

export const LEVELS = [
  // ───────────── TOPIC 1 · COMMANDS (Egg → Hatchling) ─────────────
  {
    topic: "commands", id: "1.1", name: "One Step", mode: "script",
    concept: "A single function call with a direction", budget: 30,
    blurb: "The berry is one tile to your right. step(direction, num_steps) is defined — call it.",
    starter: `# critter.step(direction, num_steps)
critter.step("right", 1)
`,
    setup: () => ({ size: SIZE, critter: { x: 4, y: 5 }, foods: [{ x: 5, y: 5 }], walls: frame(), lava: [], predators: [], budget: 30 }),
  },
  {
    topic: "commands", id: "1.2", name: "The Count Argument", mode: "script",
    concept: "Passing a count", budget: 30,
    blurb: "The berry is 4 tiles right. One call — choose the right second argument.",
    starter: `critter.step("right", 1)   # how many steps, really?
`,
    setup: () => ({ size: SIZE, critter: { x: 2, y: 5 }, foods: [{ x: 6, y: 5 }], walls: frame(), lava: [], predators: [], budget: 30 }),
  },
  {
    topic: "commands", id: "1.3", name: "Two Directions", mode: "script",
    concept: "Sequencing two calls", budget: 40,
    blurb: "The berry is right AND up (an L-shape). One call can't turn — chain two.",
    starter: `critter.step("right", 3)
# add a second order:
`,
    setup: () => ({ size: SIZE, critter: { x: 3, y: 7 }, foods: [{ x: 6, y: 5 }], walls: frame(), lava: [], predators: [], budget: 40 }),
  },
  {
    topic: "commands", id: "1.4", name: "The Detour", mode: "script",
    concept: "A 3-segment plan around a wall", budget: 50,
    blurb: "A wall sits directly between you and the berry. Go down, across, then back up.",
    starter: `critter.step("down", 1)
# continue the detour:
`,
    setup: () => ({ size: SIZE, critter: { x: 2, y: 5 }, foods: [{ x: 7, y: 5 }], walls: frame([[4, 4], [4, 5]]), lava: [], predators: [], budget: 50 }),
  },
  {
    topic: "commands", id: "1.5", name: "Look Before You Leap", mode: "script",
    concept: "Reading a value with look() and passing it in", budget: 30, randomize: true, passThreshold: 1.0,
    blurb: "The berry is a RANDOM distance right (fresh maps when graded). Hardcoding a number fails — feed look() into step().",
    starter: `critter.step("right", critter.look()["food_dx"])
`,
    setup: (rng) => ({ size: SIZE, critter: { x: 1, y: 5 }, foods: [{ x: 4 + Math.floor(rng() * 6), y: 5 }], walls: frame(), lava: [], predators: [], budget: 30 }),
  },

  // ───────────── TOPIC 2 · VARIABLES & MATH (Hatchling → Nibbler) ─────────────
  {
    topic: "math", id: "2.1", name: "Name a Value", mode: "script",
    concept: "Assignment", budget: 30, randomize: true, passThreshold: 1.0,
    blurb: "Random distance right. Store the looked-up value in a variable, then use it.",
    starter: `s = look()
dist = s["food_dx"]
critter.step("right", dist)
`,
    setup: (rng) => ({ size: SIZE, critter: { x: 1, y: 5 }, foods: [{ x: 4 + Math.floor(rng() * 6), y: 5 }], walls: frame(), lava: [], predators: [], budget: 30 }),
  },
  {
    topic: "math", id: "2.2", name: "Two Coordinates", mode: "script",
    concept: "Two variables", budget: 40, randomize: true, passThreshold: 1.0,
    blurb: "Berry at a random (dx, dy). Read both, step on each axis.",
    starter: `s = look()
dx = s["food_dx"]
dy = s["food_dy"]
critter.step("right", dx)
critter.step("up", -dy)
`,
    setup: (rng) => ({ size: SIZE, critter: { x: 1, y: 9 }, foods: [{ x: 3 + Math.floor(rng() * 6), y: 2 + Math.floor(rng() * 5) }], walls: frame(), lava: [], predators: [], budget: 40 }),
  },
  {
    topic: "math", id: "2.3", name: "Even Spacing", mode: "script",
    concept: "Reusing a stored value", budget: 40, randomize: true, passThreshold: 1.0,
    blurb: "TWO evenly-spaced berries. look() reports the gap to the first; store it once and reuse the SAME gap to reach the second.",
    starter: `s = look()
gap = s["food_dx"]          # distance to the first berry
critter.step("right", gap)  # eat the first
critter.step("right", gap)  # the second is one more gap away
`,
    setup: (rng) => { const g = 2 + Math.floor(rng() * 3); return { size: SIZE, critter: { x: 1, y: 5 }, foods: [{ x: 1 + g, y: 5 }, { x: 1 + 2 * g, y: 5 }], walls: frame(), lava: [], predators: [], budget: 40 }; },
  },
  {
    topic: "math", id: "2.4", name: "Budgeted Detour", mode: "script",
    concept: "Arithmetic across variables", budget: 50, randomize: true, passThreshold: 1.0,
    blurb: "A wall forces a detour. Store the berry distance, drop a row, walk it, climb back: down 1, right food_dx, up 1.",
    starter: `s = look()
dx = s["food_dx"]
critter.step("down", 1)
critter.step("right", dx)
critter.step("up", 1)
`,
    setup: (rng) => { const fx = 6 + Math.floor(rng() * 3); return { size: SIZE, critter: { x: 1, y: 5 }, foods: [{ x: fx, y: 5 }], walls: frame([[4, 4], [4, 5]]), lava: [], predators: [], budget: 50 }; },
  },
  {
    topic: "math", id: "2.5", name: "Energy Math", mode: "script",
    concept: "Combining variables (sum, subtract)", budget: 22, randomize: true, passThreshold: 1.0,
    blurb: "Tight energy budget; each step costs 1. The straight L-path (food_dx + food_dy steps) is the only plan that fits.",
    starter: `s = look()
dx = s["food_dx"]
dy = s["food_dy"]
need = dx + (-dy)          # total steps required
critter.step("right", dx)
critter.step("up", -dy)
`,
    setup: (rng) => ({ size: SIZE, critter: { x: 1, y: 9 }, foods: [{ x: 5 + Math.floor(rng() * 4), y: 2 + Math.floor(rng() * 4) }], walls: frame(), lava: [], predators: [], budget: 22 }),
  },

  // ───────────── TOPIC 3 · BRANCHING (Nibbler → Forager) ─────────────
  {
    topic: "branching", id: "3.1", name: "Left or Right", mode: "script",
    concept: "if / else on a sign", budget: 30, randomize: true, passThreshold: 1.0,
    blurb: "Berry on a random side. Branch on the sign of food_dx.",
    starter: `s = look()
if s["food_dx"] > 0:
    critter.step("right", s["food_dx"])
else:
    critter.step("left", -s["food_dx"])
`,
    setup: (rng) => ({ size: SIZE, critter: { x: 5, y: 5 }, foods: [{ x: rng() < 0.5 ? 1 + Math.floor(rng() * 3) : 7 + Math.floor(rng() * 3), y: 5 }], walls: frame(), lava: [], predators: [], budget: 30 }),
  },
  {
    topic: "branching", id: "3.2", name: "Four Ways", mode: "script",
    concept: "if / elif / else chain", budget: 30, randomize: true, passThreshold: 1.0,
    blurb: "Berry in one of the four cardinal directions. Cover every case.",
    starter: `s = look()
if s["food_dx"] > 0:
    critter.step("right", s["food_dx"])
elif s["food_dx"] < 0:
    critter.step("left", -s["food_dx"])
elif s["food_dy"] < 0:
    critter.step("up", -s["food_dy"])
else:
    critter.step("down", s["food_dy"])
`,
    setup: (rng) => { const f = pick(rng, [{ x: 2, y: 5 }, { x: 8, y: 5 }, { x: 5, y: 2 }, { x: 5, y: 8 }]); return { size: SIZE, critter: { x: 5, y: 5 }, foods: [f], walls: frame(), lava: [], predators: [], budget: 30 }; },
  },
  {
    topic: "branching", id: "3.3", name: "Look Before Crossing", mode: "script",
    concept: "A nested if", budget: 50, randomize: true, passThreshold: 1.0,
    blurb: "The berry is right, but lava SOMETIMES blocks the direct path. Check danger['right']; if blocked, go around.",
    starter: `s = look()
dx = s["food_dx"]
if not s["danger"]["right"]:
    critter.step("right", dx)
else:
    critter.step("down", 1)
    critter.step("right", dx)
    critter.step("up", 1)
`,
    setup: (rng) => { const lava = rng() < 0.5 ? [[3, 5]] : []; return { size: SIZE, critter: { x: 2, y: 5 }, foods: [{ x: 8, y: 5 }], walls: frame(), lava, predators: [], budget: 50 }; },
  },
  {
    topic: "branching", id: "3.4", name: "Two Conditions", mode: "script",
    concept: "and / or", budget: 50, randomize: true, passThreshold: 1.0,
    blurb: "Cross the gap only if it's clear AND you have enough energy; otherwise take the long way around.",
    starter: `s = look()
dx = s["food_dx"]
if (not s["danger"]["right"]) and s["energy"] > dx + 2:
    critter.step("right", dx)
else:
    critter.step("down", 1)
    critter.step("right", dx)
    critter.step("up", 1)
`,
    setup: (rng) => { const lava = rng() < 0.5 ? [[3, 5]] : []; return { size: SIZE, critter: { x: 2, y: 5 }, foods: [{ x: 8, y: 5 }], walls: frame(), lava, predators: [], budget: 50 }; },
  },
  {
    topic: "branching", id: "3.5", name: "Computed Branch", mode: "script",
    concept: "Branch on a computed value (folds in Topic 2)", budget: 50, randomize: true, passThreshold: 1.0,
    blurb: "Pick the direction from the sign, the count from abs(food_dx) and abs(food_dy) — corners at varying distance.",
    starter: `s = look()
h = "right" if s["food_dx"] > 0 else "left"
v = "down" if s["food_dy"] > 0 else "up"
critter.step(h, abs(s["food_dx"]))
critter.step(v, abs(s["food_dy"]))
`,
    setup: (rng) => { const f = pick(rng, [{ x: 2, y: 2 }, { x: 9, y: 2 }, { x: 2, y: 9 }, { x: 9, y: 9 }, { x: 3, y: 8 }, { x: 8, y: 3 }]); return { size: SIZE, critter: { x: 5, y: 5 }, foods: [f], walls: frame(), lava: [], predators: [], budget: 50 }; },
  },

  // ───────────── TOPIC 4 · REFLEXES (Forager → Skittish) ─────────────
  // Predators move every tick → a planned script can't react → decide() per tick.
  {
    topic: "reflexes", id: "4.1", name: "It Moves!", mode: "reactive",
    concept: "decide(sensors), called every tick", budget: 50, randomize: true, passThreshold: 0.85,
    blurb: "A predator now MOVES. No berry yet — just survive. decide() runs every tick; return flee_dir, the safe direction away from the nearest predator.",
    starter: `def decide(s):
    # decide() is called every single tick. Survive the whole round.
    return s["flee_dir"]
`,
    setup: (rng) => ({ size: SIZE, critter: { x: 5, y: 5 }, foods: [], walls: frame(), lava: [], predators: [{ x: 1 + Math.floor(rng() * 9), y: 1, speed: 3 }], budget: 50, survive: true }),
  },
  {
    topic: "reflexes", id: "4.2", name: "Seek Unless Threatened", mode: "reactive",
    concept: "A boolean threshold + priority", budget: 70, randomize: true, passThreshold: 0.8,
    blurb: "Chase the berry, but flee if a predator is within 3 tiles. Survival comes first.",
    starter: `def decide(s):
    if s["predator_dist"] is not None and s["predator_dist"] < 3:
        return s["flee_dir"]
    return "right" if s["food_dx"] > 0 else "left"
`,
    setup: (rng) => ({ size: SIZE, critter: { x: 2, y: 5 }, foods: [{ x: 8, y: 5 }], walls: frame(), lava: [], predators: [{ x: 6, y: 5, speed: 3 }], budget: 70 }),
  },
  {
    topic: "reflexes", id: "4.3", name: "Nearest of Two", mode: "reactive",
    concept: "Comparing two distances", budget: 80, randomize: true, passThreshold: 0.75,
    blurb: "Two predators. Flee whichever is closer (sensors give them sorted — predators[0] is nearest).",
    starter: `def decide(s):
    if s["predator_dist"] is not None and s["predator_dist"] < 3:
        return s["flee_dir"]
    return "right" if s["food_dx"] > 0 else "left"
`,
    setup: (rng) => ({ size: SIZE, critter: { x: 2, y: 5 }, foods: [{ x: 8, y: 2 + Math.floor(rng() * 7) }], walls: frame(), lava: [], predators: [{ x: 4, y: 2, speed: 4 }, { x: 4, y: 8, speed: 4 }], budget: 80 }),
  },
  {
    topic: "reflexes", id: "4.4", name: "Safest Direction", mode: "reactive",
    concept: "Combining booleans across the danger dict", budget: 80, randomize: true, passThreshold: 0.75,
    blurb: "A pack of 3. When threatened, prefer a direction that isn't dangerous (flee_dir already does this) — then resume seeking.",
    starter: `def decide(s):
    if s["predator_dist"] is not None and s["predator_dist"] < 4:
        return s["flee_dir"]
    if s["food_dx"] != 0:
        return "right" if s["food_dx"] > 0 else "left"
    return "down" if s["food_dy"] > 0 else "up"
`,
    setup: (rng) => ({ size: SIZE, critter: { x: 1, y: 5 }, foods: [{ x: 9, y: 2 + Math.floor(rng() * 7) }], walls: frame(), lava: [], predators: [{ x: 4, y: 3, speed: 4 }, { x: 4, y: 7, speed: 4 }, { x: 5, y: 9, speed: 4 }], budget: 80 }),
  },
  {
    topic: "reflexes", id: "4.5", name: "Priority Brain", mode: "reactive",
    concept: "Ordered if/elif priority (synthesis)", budget: 90, randomize: true, passThreshold: 0.7,
    blurb: "Predators + lava + berry. Order matters: flee, else avoid lava, else seek. Build the priority ladder.",
    starter: `def decide(s):
    if s["predator_dist"] is not None and s["predator_dist"] < 4:
        return s["flee_dir"]
    if s["food_dx"] > 0 and not s["danger"]["right"]:
        return "right"
    if s["food_dy"] > 0 and not s["danger"]["down"]:
        return "down"
    if s["food_dy"] < 0 and not s["danger"]["up"]:
        return "up"
    if not s["danger"]["right"]:
        return "right"
    return s["flee_dir"]
`,
    setup: (rng) => ({ size: SIZE, critter: { x: 1, y: 5 }, foods: [{ x: 9, y: 2 + Math.floor(rng() * 7) }], walls: frame(), lava: [[5, 4], [5, 6]], predators: [{ x: 4, y: 3, speed: 4 }, { x: 4, y: 7, speed: 4 }], budget: 90 }),
  },

  // ───────────── TOPIC 5 · SCANNING (Skittish → Scout) ─────────────
  {
    topic: "scanning", id: "5.1", name: "Follow the Scent", mode: "reactive",
    concept: "for loop over directions", budget: 70, randomize: true, passThreshold: 0.85,
    blurb: "Stop hand-writing each direction. Loop over all four and step toward the strongest scent.",
    starter: `def decide(s):
    best, best_dir = -1.0, "stay"
    for d in ("up", "down", "left", "right"):
        if s["scent"][d] > best:
            best, best_dir = s["scent"][d], d
    return best_dir
`,
    setup: (rng) => { const f = pick(rng, [{ x: 2, y: 2 }, { x: 8, y: 2 }, { x: 2, y: 8 }, { x: 8, y: 8 }]); return { size: SIZE, critter: { x: 5, y: 5 }, foods: [f], walls: frame(), lava: [], predators: [], budget: 70 }; },
  },
  {
    topic: "scanning", id: "5.2", name: "Skip the Dangerous Ones", mode: "reactive",
    concept: "A condition inside the loop (continue)", budget: 80, randomize: true, passThreshold: 0.8,
    blurb: "Walls and lava. Same scan, but skip any direction that's dangerous before comparing scent.",
    starter: `def decide(s):
    best, best_dir = -1.0, "stay"
    for d in ("up", "down", "left", "right"):
        if s["danger"][d]:
            continue
        if s["scent"][d] > best:
            best, best_dir = s["scent"][d], d
    return best_dir
`,
    setup: (rng) => { const f = pick(rng, [{ x: 9, y: 9 }, { x: 9, y: 1 }]); return { size: SIZE, critter: { x: 1, y: 1 }, foods: [f], walls: frame([[5, 1], [5, 2], [5, 3], [5, 7], [5, 8], [5, 9]]), lava: [[5, 5]], predators: [], budget: 80 }; },
  },
  {
    topic: "scanning", id: "5.3", name: "Score Each Move", mode: "reactive",
    concept: "Iterate, track a running best score", budget: 90, randomize: true, passThreshold: 0.8,
    blurb: "Maze. Score each safe move = scent, keep the highest. The scent gradient never traps; trust the loop.",
    starter: `def decide(s):
    best, best_dir = -1.0, "stay"
    for d in ("up", "down", "left", "right"):
        if s["danger"][d]:
            continue
        score = s["scent"][d]
        if score > best:
            best, best_dir = score, d
    return best_dir
`,
    setup: (rng) => { const f = pick(rng, [{ x: 9, y: 9 }, { x: 9, y: 5 }, { x: 5, y: 9 }]); return { size: SIZE, critter: { x: 1, y: 1 }, foods: [f], walls: frame([[2, 1], [2, 2], [2, 3], [4, 3], [4, 4], [4, 5], [4, 6], [6, 6], [6, 7], [6, 8], [3, 7], [3, 8], [7, 2], [7, 3], [7, 4], [8, 4]]), lava: [], predators: [], budget: 90 }; },
  },
  {
    topic: "scanning", id: "5.4", name: "Count the Threats", mode: "reactive",
    concept: "for over a list with an accumulator", budget: 90, randomize: true, passThreshold: 0.75,
    blurb: "Iterate the predators list and COUNT how many are within 3. If two or more, flee; otherwise follow scent.",
    starter: `def best_scent_dir(s):
    best, best_dir = -1.0, "stay"
    for d in ("up", "down", "left", "right"):
        if not s["danger"][d] and s["scent"][d] > best:
            best, best_dir = s["scent"][d], d
    return best_dir

def decide(s):
    nearby = 0
    for p in s["predators"]:
        if p["dist"] <= 3:
            nearby += 1
    if nearby >= 1:
        return s["flee_dir"]
    return best_scent_dir(s)
`,
    setup: (rng) => { const f = pick(rng, [{ x: 9, y: 9 }, { x: 9, y: 1 }]); return { size: SIZE, critter: { x: 1, y: 1 }, foods: [f], walls: frame([[5, 1], [5, 2], [5, 3], [5, 7], [5, 8], [5, 9]]), lava: [], predators: [{ x: 8, y: 5, speed: 5 }], budget: 90 }; },
  },
  {
    topic: "scanning", id: "5.5", name: "Hunted Maze", mode: "reactive",
    concept: "Loop + branching composed (synthesis)", budget: 110, randomize: true, passThreshold: 0.7,
    blurb: "Twisting maze, two predators. Scent-scan loop plus a flee guard — composed, the whole topic at once.",
    starter: `def decide(s):
    if s["predator_dist"] is not None and s["predator_dist"] < 3:
        return s["flee_dir"]
    best, best_dir = -1.0, "stay"
    for d in ("up", "down", "left", "right"):
        if s["danger"][d]:
            continue
        if s["scent"][d] > best:
            best, best_dir = s["scent"][d], d
    return best_dir
`,
    setup: (rng) => { const f = pick(rng, [{ x: 9, y: 9 }, { x: 9, y: 5 }]); return { size: SIZE, critter: { x: 1, y: 1 }, foods: [f], walls: frame([[3, 1], [3, 2], [3, 3], [5, 3], [5, 4], [5, 5], [5, 6], [7, 6], [7, 7], [7, 8], [3, 6], [3, 7]]), lava: [], predators: [{ x: 9, y: 1, speed: 6 }, { x: 1, y: 9, speed: 6 }], budget: 110 }; },
  },

  // ───────────── TOPIC 6 · MEMORY (Scout → Tracker) ─────────────
  // Scent only carries 2 tiles. Far from food you get NO signal, so a memoryless
  // scan stalls. You must remember a heading / where you've been, until you smell
  // the berry. memory is a dict that persists across ticks (read AND write it).
  {
    topic: "memory", id: "6.1", name: "Hold a Heading", mode: "reactive",
    concept: "A persistent variable in memory", budget: 40, randomize: true, passThreshold: 0.9,
    blurb: "Long corridor; the berry is out of smelling range at first. With no scent, a plain scan freezes. Remember a heading and keep walking it until you smell food.",
    starter: `def decide(s):
    # follow scent if we can smell it
    best, best_dir = 0.0, None
    for d in ("up", "down", "left", "right"):
        if not s["danger"][d] and s["scent"][d] > best:
            best, best_dir = s["scent"][d], d
    if best_dir is not None:
        return best_dir
    # no scent: keep heading the way we were going
    h = s["memory"].get("heading", "right")
    if s["danger"][h]:                      # turn if blocked
        for d in ("up", "down", "left", "right"):
            if not s["danger"][d]:
                h = d
                break
    s["memory"]["heading"] = h
    return h
`,
    setup: (rng) => { const y = 5; const open = []; for (let x = 1; x <= 9; x++) open.push([x, y]); const fx = 9; return { size: SIZE, critter: { x: 1, y }, foods: [{ x: fx, y }], walls: carve(open), lava: [], predators: [], budget: 40, scentRadius: 2 }; },
  },
  {
    topic: "memory", id: "6.2", name: "Turn at the Wall", mode: "reactive",
    concept: "Updating remembered state at a junction", budget: 55, randomize: true, passThreshold: 0.85,
    blurb: "An L-shaped corridor. Hold your heading until a wall blocks it, then commit to the new open direction — and remember it.",
    starter: `def decide(s):
    best, best_dir = 0.0, None
    for d in ("up", "down", "left", "right"):
        if not s["danger"][d] and s["scent"][d] > best:
            best, best_dir = s["scent"][d], d
    if best_dir is not None:
        return best_dir
    h = s["memory"].get("heading", "right")
    if s["danger"][h]:
        for d in ("up", "down", "left", "right"):
            if not s["danger"][d]:
                h = d
                break
    s["memory"]["heading"] = h
    return h
`,
    setup: (rng) => { const open = []; for (let x = 1; x <= 9; x++) open.push([x, 5]); for (let y = 2; y <= 5; y++) open.push([9, y]); return { size: SIZE, critter: { x: 1, y: 5 }, foods: [{ x: 9, y: 2 }], walls: carve(open), lava: [], predators: [], budget: 55, scentRadius: 2 }; },
  },
  {
    topic: "memory", id: "6.3", name: "Right-Hand Rule", mode: "reactive",
    concept: "Heading + relative turns (the wall-follower)", budget: 80, randomize: true, passThreshold: 0.8,
    blurb: "A snaking corridor. Keep one hand on the wall: try to turn right of your heading, else go straight, else left, else back. Remember the heading each tick.",
    starter: `CW = {"up":"right","right":"down","down":"left","left":"up"}
CCW = {v: k for k, v in CW.items()}

def decide(s):
    best, best_dir = 0.0, None
    for d in ("up", "down", "left", "right"):
        if not s["danger"][d] and s["scent"][d] > best:
            best, best_dir = s["scent"][d], d
    if best_dir is not None:
        s["memory"]["heading"] = best_dir
        return best_dir
    h = s["memory"].get("heading", "right")
    for d in (CW[h], h, CCW[h], CW[CW[h]]):   # right, straight, left, back
        if not s["danger"][d]:
            s["memory"]["heading"] = d
            return d
    return "stay"
`,
    setup: (rng) => { const open = []; for (let x = 1; x <= 9; x++) open.push([x, 2]); for (let y = 2; y <= 5; y++) open.push([9, y]); for (let x = 1; x <= 9; x++) open.push([x, 5]); for (let y = 5; y <= 8; y++) open.push([1, y]); for (let x = 1; x <= 9; x++) open.push([x, 8]); return { size: SIZE, critter: { x: 1, y: 2 }, foods: [{ x: 9, y: 8 }], walls: carve(open), lava: [], predators: [], budget: 80, scentRadius: 2 }; },
  },
  {
    topic: "memory", id: "6.4", name: "Don't Re-Explore", mode: "reactive",
    concept: "A remembered set of visited tiles (in / not in)", budget: 90, randomize: true, passThreshold: 0.75,
    blurb: "A maze with dead-end branches. Wall-following can re-enter places it's been. Remember visited tiles and prefer somewhere new.",
    starter: `CW = {"up":"right","right":"down","down":"left","left":"up"}
CCW = {v: k for k, v in CW.items()}
STEP = {"up":(0,-1),"down":(0,1),"left":(-1,0),"right":(1,0)}

def decide(s):
    best, best_dir = 0.0, None
    for d in ("up", "down", "left", "right"):
        if not s["danger"][d] and s["scent"][d] > best:
            best, best_dir = s["scent"][d], d
    if best_dir is not None:
        return best_dir
    visited = s["memory"].setdefault("visited", {})
    x, y = s["pos"]
    visited[(x, y)] = True
    h = s["memory"].get("heading", "right")
    order = (CW[h], h, CCW[h], CW[CW[h]])
    # prefer a safe direction whose next tile we have NOT visited
    for d in order:
        if s["danger"][d]:
            continue
        nx, ny = x + STEP[d][0], y + STEP[d][1]
        if (nx, ny) not in visited:
            s["memory"]["heading"] = d
            return d
    for d in order:                  # fall back to any safe move
        if not s["danger"][d]:
            s["memory"]["heading"] = d
            return d
    return "stay"
`,
    setup: (rng) => { const open = []; for (let x = 1; x <= 9; x++) open.push([x, 2]); for (let y = 2; y <= 8; y++) open.push([5, y]); for (let x = 1; x <= 9; x++) open.push([x, 8]); open.push([2, 4], [2, 5], [8, 4], [8, 5]); const f = pick(rng, [{ x: 9, y: 8 }, { x: 1, y: 8 }]); return { size: SIZE, critter: { x: 1, y: 2 }, foods: [f], walls: carve(open), lava: [], predators: [], budget: 90, scentRadius: 2 }; },
  },
  {
    topic: "memory", id: "6.5", name: "Escape the Dead End", mode: "reactive",
    concept: "while + break over ranked options", budget: 95, randomize: true, passThreshold: 0.7,
    blurb: "Dead ends everywhere. Each tick, scan your ranked options with a while loop and break out on the first safe, unvisited move.",
    starter: `CW = {"up":"right","right":"down","down":"left","left":"up"}
CCW = {v: k for k, v in CW.items()}
STEP = {"up":(0,-1),"down":(0,1),"left":(-1,0),"right":(1,0)}

def decide(s):
    best, best_dir = 0.0, None
    for d in ("up", "down", "left", "right"):
        if not s["danger"][d] and s["scent"][d] > best:
            best, best_dir = s["scent"][d], d
    if best_dir is not None:
        return best_dir
    visited = s["memory"].setdefault("visited", {})
    x, y = s["pos"]
    visited[(x, y)] = True
    h = s["memory"].get("heading", "right")
    options = [CW[h], h, CCW[h], CW[CW[h]]]
    i = 0
    while i < len(options):
        d = options[i]
        nx, ny = x + STEP[d][0], y + STEP[d][1]
        if not s["danger"][d] and (nx, ny) not in visited:
            s["memory"]["heading"] = d
            return d                          # break out on first good move
        i += 1
    for d in options:
        if not s["danger"][d]:
            s["memory"]["heading"] = d
            return d
    return "stay"
`,
    setup: (rng) => { const open = []; for (let y = 1; y <= 9; y++) open.push([1, y]); for (let x = 1; x <= 9; x++) open.push([x, 1]); for (let x = 1; x <= 9; x++) open.push([x, 9]); for (let y = 5; y <= 9; y++) open.push([5, y]); for (let y = 1; y <= 5; y++) open.push([9, y]); open.push([3, 3], [3, 4], [3, 5], [7, 7], [7, 8]); const f = pick(rng, [{ x: 9, y: 9 }, { x: 5, y: 5 }]); return { size: SIZE, critter: { x: 1, y: 1 }, foods: [f], walls: carve(open), lava: [], predators: [], budget: 95, scentRadius: 2 }; },
  },

  // ───────────── TOPIC 7 · FUNCTIONS (Tracker → Hunter) ─────────────
  {
    topic: "functions", id: "7.1", name: "Name Your Reflexes", mode: "reactive",
    concept: "Defining and calling helper functions", budget: 90, randomize: true, passThreshold: 0.8,
    blurb: "Pull flee and seek out of decide() into named helpers, so decide() reads like a sentence.",
    starter: `def threatened(s):
    return s["predator_dist"] is not None and s["predator_dist"] < 3

def seek(s):
    best, best_dir = -1.0, "stay"
    for d in ("up", "down", "left", "right"):
        if not s["danger"][d] and s["scent"][d] > best:
            best, best_dir = s["scent"][d], d
    return best_dir

def decide(s):
    if threatened(s):
        return s["flee_dir"]
    return seek(s)
`,
    setup: (rng) => { const f = pick(rng, [{ x: 9, y: 9 }, { x: 9, y: 1 }]); return { size: SIZE, critter: { x: 1, y: 1 }, foods: [f], walls: frame([[5, 1], [5, 2], [5, 3], [5, 7], [5, 8], [5, 9]]), lava: [[5, 5]], predators: [{ x: 9, y: 5, speed: 5 }], budget: 90 }; },
  },
  {
    topic: "functions", id: "7.2", name: "Parameters & Return", mode: "reactive",
    concept: "A helper with parameters and a return value", budget: 100, randomize: true, passThreshold: 0.75,
    blurb: "Write best_direction(scent, danger) that returns a move, and reuse it. Pass data IN, get an answer OUT.",
    starter: `def best_direction(scent, danger):
    best, best_dir = -1.0, "stay"
    for d in ("up", "down", "left", "right"):
        if not danger[d] and scent[d] > best:
            best, best_dir = scent[d], d
    return best_dir

def decide(s):
    if s["predator_dist"] is not None and s["predator_dist"] < 3:
        return s["flee_dir"]
    return best_direction(s["scent"], s["danger"])
`,
    setup: (rng) => { const f = pick(rng, [{ x: 9, y: 9 }, { x: 9, y: 1 }]); return { size: SIZE, critter: { x: 1, y: 1 }, foods: [f], walls: frame([[5, 1], [5, 2], [5, 3], [5, 7], [5, 8], [5, 9]]), lava: [[5, 5]], predators: [{ x: 9, y: 5, speed: 4 }], budget: 100 }; },
  },
  {
    topic: "functions", id: "7.3", name: "Compose Three", mode: "reactive",
    concept: "Multi-function structure and clean separation", budget: 120, randomize: true, passThreshold: 0.75,
    blurb: "decide() calls is_threatened(), pick_safe(), pick_food(). Three small functions, one readable brain.",
    starter: `def is_threatened(s):
    return s["predator_dist"] is not None and s["predator_dist"] < 3

def pick_food(s):
    best, best_dir = -1.0, "stay"
    for d in ("up", "down", "left", "right"):
        if not s["danger"][d] and s["scent"][d] > best:
            best, best_dir = s["scent"][d], d
    return best_dir

def decide(s):
    if is_threatened(s):
        return s["flee_dir"]
    return pick_food(s)
`,
    setup: (rng) => { const f = pick(rng, [{ x: 9, y: 9 }, { x: 9, y: 1 }, { x: 1, y: 9 }]); return { size: SIZE, critter: { x: 1, y: 1 }, foods: [f], walls: frame([[3, 1], [3, 2], [3, 3], [5, 3], [5, 4], [5, 5], [7, 5], [7, 6], [7, 7], [3, 6], [3, 7]]), lava: [[5, 7]], predators: [{ x: 9, y: 5, speed: 4 }], budget: 120 }; },
  },
  {
    topic: "functions", id: "7.4", name: "Apex Trial I", mode: "reactive",
    concept: "Every Act-1 skill in one brain", budget: 130, randomize: true, passThreshold: 0.7,
    blurb: "Walls, lava, predators, scent maze. Your composed brain handles it — no new constructs, just everything together.",
    starter: `def is_threatened(s):
    return s["predator_dist"] is not None and s["predator_dist"] < 3

def pick_food(s):
    best, best_dir = -1.0, "stay"
    for d in ("up", "down", "left", "right"):
        if not s["danger"][d] and s["scent"][d] > best:
            best, best_dir = s["scent"][d], d
    return best_dir

def decide(s):
    if is_threatened(s):
        return s["flee_dir"]
    return pick_food(s)
`,
    setup: (rng) => { const f = pick(rng, [{ x: 9, y: 9 }, { x: 9, y: 1 }]); return { size: SIZE, critter: { x: 1, y: 1 }, foods: [f], walls: frame([[5, 1], [5, 2], [5, 3], [5, 7], [5, 8], [5, 9]]), lava: [[5, 5]], predators: [{ x: 8, y: 5, speed: 5 }], budget: 130 }; },
  },
  {
    topic: "functions", id: "7.5", name: "Boss: Apex Trial", mode: "reactive",
    concept: "Full synthesis → Hunter", budget: 150, randomize: true, passThreshold: 0.65,
    blurb: "The final Act 1 trial: maze, lava, three predators, held-out seeds. Clear it and your critter becomes a Hunter.",
    starter: `def is_threatened(s):
    return s["predator_dist"] is not None and s["predator_dist"] < 4

def pick_food(s):
    best, best_dir = -1.0, "stay"
    for d in ("up", "down", "left", "right"):
        if not s["danger"][d] and s["scent"][d] > best:
            best, best_dir = s["scent"][d], d
    return best_dir

def decide(s):
    if is_threatened(s):
        return s["flee_dir"]
    return pick_food(s)
`,
    setup: (rng) => { const f = pick(rng, [{ x: 9, y: 9 }, { x: 9, y: 5 }]); return { size: SIZE, critter: { x: 1, y: 1 }, foods: [f], walls: frame([[3, 1], [3, 2], [3, 3], [5, 3], [5, 4], [5, 5], [7, 5], [7, 6], [7, 7], [3, 6], [3, 7]]), lava: [[5, 7], [4, 7]], predators: [{ x: 9, y: 1, speed: 7 }, { x: 1, y: 9, speed: 7 }], budget: 170 }; },
  },
];
