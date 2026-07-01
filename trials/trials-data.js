// trials/trials-data.js — the Proving Grounds trials (Chapter 1–2 ceiling: seeded
// variables in, expected variables/stdout out; no def, no lists).
// Each trial: 2 visible examples, 3 hidden cases, 2 hints, a canonical solution,
// and a cheat (hardcodes example 1) that trials-verify.mjs proves gets caught.
// Copy rule: plain and human, no em dashes.

export const TRIALS = [
  {
    id: "stock-quiver", n: 1, title: "Stock the Quiver", concept: "add", xp: 25,
    brief: "The quartermaster tips a sack of loose arrows onto the table next to the ones you already carry. Count the lot: add what was found to what you had, and store the answer in a variable named total.",
    starter: "# arrows and found are already set\n",
    requireOps: ["+"],
    examples: [
      { seed: { arrows: 12, found: 5 }, expect: { vars: { total: 17 } } },
      { seed: { arrows: 3, found: 9 }, expect: { vars: { total: 12 } } },
    ],
    hidden: [
      { seed: { arrows: 40, found: 2 }, expect: { vars: { total: 42 } } },
      { seed: { arrows: 0, found: 7 }, expect: { vars: { total: 7 } } },
      { seed: { arrows: 118, found: 106 }, expect: { vars: { total: 224 } } },
    ],
    hints: ["The two counts are already in the variables arrows and found. You only need one line.", "total = arrows + found"],
    canonical: "total = arrows + found",
    cheat: "total = 17",
  },
  {
    id: "call-it-out", n: 2, title: "Call It Out", concept: "print-var", xp: 25,
    brief: "You are on watch and the sergeant wants numbers, not stories. The count of infected you can see is stored in the variable sighted. Print the variable so the number itself lands on the screen. No quotes around it, or you will report the word instead of the count.",
    starter: "# sighted is already set\n",
    requireOps: ["print"],
    examples: [
      { seed: { sighted: 4 }, expect: { stdout: "4" } },
      { seed: { sighted: 11 }, expect: { stdout: "11" } },
    ],
    hidden: [
      { seed: { sighted: 0 }, expect: { stdout: "0" } },
      { seed: { sighted: 73 }, expect: { stdout: "73" } },
      { seed: { sighted: 9 }, expect: { stdout: "9" } },
    ],
    hints: ["print(sighted) shows the value in the box. print(\"sighted\") shows the word.", "print(sighted)"],
    canonical: "print(sighted)",
    cheat: 'print("4")',
  },
  {
    id: "hand-them-over", n: 3, title: "Hand Them Over", concept: "subtract", xp: 25,
    brief: "A patrol heading out needs supplies from your pack. Your stock and the amount you give away are in the variables stock and given. Work out what remains and store it in a variable named left.",
    starter: "# stock and given are already set\n",
    requireOps: ["-"],
    examples: [
      { seed: { stock: 20, given: 6 }, expect: { vars: { left: 14 } } },
      { seed: { stock: 9, given: 9 }, expect: { vars: { left: 0 } } },
    ],
    hidden: [
      { seed: { stock: 55, given: 13 }, expect: { vars: { left: 42 } } },
      { seed: { stock: 7, given: 0 }, expect: { vars: { left: 7 } } },
      { seed: { stock: 300, given: 128 }, expect: { vars: { left: 172 } } },
    ],
    hints: ["Giving away is subtraction: start from stock and take given away.", "left = stock - given"],
    canonical: "left = stock - given",
    cheat: "left = 14",
  },
  {
    id: "toll-ledger", n: 4, title: "Toll Ledger", concept: "float", xp: 25,
    brief: "The gatekeeper charges a quarter gold for every head that passes. The number of travellers is in heads and your purse is in gold. Set pay to the total toll, then set gold_left to what remains in your purse after paying.",
    starter: "# gold and heads are already set\n",
    requireOps: ["*", "-"],
    examples: [
      { seed: { gold: 2.55, heads: 2 }, expect: { vars: { pay: 0.5, gold_left: 2.05 } } },
      { seed: { gold: 1.0, heads: 1 }, expect: { vars: { pay: 0.25, gold_left: 0.75 } } },
    ],
    hidden: [
      { seed: { gold: 5.0, heads: 6 }, expect: { vars: { pay: 1.5, gold_left: 3.5 } } },
      { seed: { gold: 0.25, heads: 1 }, expect: { vars: { pay: 0.25, gold_left: 0.0 } } },
      { seed: { gold: 10.75, heads: 9 }, expect: { vars: { pay: 2.25, gold_left: 8.5 } } },
    ],
    hints: ["The toll is 0.25 multiplied by heads. Work that out first and call it pay.", "pay = 0.25 * heads, then gold_left = gold - pay"],
    canonical: "pay = 0.25 * heads\ngold_left = gold - pay",
    cheat: "pay = 0.5\ngold_left = 2.05",
  },
  {
    id: "ration-split", n: 5, title: "Ration Split", concept: "intdiv", xp: 25,
    brief: "The cook has a tray of loaves and a line of hungry mouths. Everyone gets the same whole number of loaves and the cook keeps the leftovers. Set each to the whole loaves per person and spare to what is left over.",
    starter: "# loaves and mouths are already set\n",
    requireOps: ["//", "%"],
    examples: [
      { seed: { loaves: 7, mouths: 2 }, expect: { vars: { each: 3, spare: 1 } } },
      { seed: { loaves: 12, mouths: 4 }, expect: { vars: { each: 3, spare: 0 } } },
    ],
    hidden: [
      { seed: { loaves: 23, mouths: 5 }, expect: { vars: { each: 4, spare: 3 } } },
      { seed: { loaves: 3, mouths: 7 }, expect: { vars: { each: 0, spare: 3 } } },
      { seed: { loaves: 100, mouths: 9 }, expect: { vars: { each: 11, spare: 1 } } },
    ],
    hints: ["Floor division // gives whole shares. Modulo % gives what does not divide out.", "each = loaves // mouths and spare = loaves % mouths"],
    canonical: "each = loaves // mouths\nspare = loaves % mouths",
    cheat: "each = 3\nspare = 1",
  },
  {
    id: "gate-check", n: 6, title: "Gate Check", concept: "if", xp: 25,
    brief: "Night watch at the gate. The true watchword is in secret, and what the traveller whispered is in word. If they match exactly, print pass. If they do not, print halt.",
    starter: "# secret and word are already set\n",
    requireOps: ["if", "=="],
    examples: [
      { seed: { secret: "ironwatch", word: "ironwatch" }, expect: { stdout: "pass" } },
      { seed: { secret: "ironwatch", word: "oakwatch" }, expect: { stdout: "halt" } },
    ],
    hidden: [
      { seed: { secret: "embers", word: "embers" }, expect: { stdout: "pass" } },
      { seed: { secret: "embers", word: "Embers" }, expect: { stdout: "halt" } },
      { seed: { secret: "north", word: "" }, expect: { stdout: "halt" } },
    ],
    hints: ["An if with == runs its block only when the two values are equal. else catches everything different.", 'if word == secret:\n    print("pass")\nelse:\n    print("halt")'],
    canonical: 'if word == secret:\n    print("pass")\nelse:\n    print("halt")',
    cheat: 'print("pass")',
  },
  {
    id: "volley-count", n: 7, title: "Volley Count", concept: "for-loop", xp: 40,
    brief: "Drill practice. The line fires a number of volleys, and every volley looses the same number of arrows. Start total at 0, then use a for loop that adds per on every volley. Do not multiply, the drillmaster wants to see the loop.",
    starter: "total = 0\n# volleys and per are already set\n",
    requireOps: ["for", "range"],
    examples: [
      { seed: { volleys: 3, per: 4 }, expect: { vars: { total: 12 } } },
      { seed: { volleys: 1, per: 7 }, expect: { vars: { total: 7 } } },
    ],
    hidden: [
      { seed: { volleys: 6, per: 5 }, expect: { vars: { total: 30 } } },
      { seed: { volleys: 0, per: 9 }, expect: { vars: { total: 0 } } },
      { seed: { volleys: 13, per: 3 }, expect: { vars: { total: 39 } } },
    ],
    hints: ["for i in range(volleys): repeats a block once per volley. Inside it, grow total by per.", "total = 0\nfor i in range(volleys):\n    total = total + per"],
    canonical: "total = 0\nfor i in range(volleys):\n    total = total + per",
    cheat: "total = 12\nfor i in range(0):\n    total = total",
  },
  {
    id: "supply-manifest", n: 8, title: "Supply Manifest", concept: "if", xp: 40,
    brief: "The captain's manifest again, but this time the requirements change with every run. You have armor, food and water on hand, and the manifest demands at least need_a armor, need_f food and need_w water. Count how many of the three requirements you meet and store the count in packed.",
    starter: "packed = 0\n# armor, food, water, need_a, need_f, need_w are already set\n",
    requireOps: ["if", ">="],
    examples: [
      { seed: { armor: 1, food: 2, water: 1, need_a: 1, need_f: 2, need_w: 1 }, expect: { vars: { packed: 3 } } },
      { seed: { armor: 0, food: 5, water: 1, need_a: 1, need_f: 2, need_w: 2 }, expect: { vars: { packed: 1 } } },
    ],
    hidden: [
      { seed: { armor: 2, food: 1, water: 0, need_a: 2, need_f: 2, need_w: 1 }, expect: { vars: { packed: 1 } } },
      { seed: { armor: 0, food: 0, water: 0, need_a: 1, need_f: 1, need_w: 1 }, expect: { vars: { packed: 0 } } },
      { seed: { armor: 4, food: 4, water: 4, need_a: 3, need_f: 4, need_w: 5 }, expect: { vars: { packed: 2 } } },
    ],
    hints: ["Three separate if checks, one per supply. Each met requirement grows packed by 1.", "packed = 0\nif armor >= need_a:\n    packed = packed + 1\n(and the same for food and water)"],
    canonical: "packed = 0\nif armor >= need_a:\n    packed = packed + 1\nif food >= need_f:\n    packed = packed + 1\nif water >= need_w:\n    packed = packed + 1",
    cheat: "packed = 3",
  },
];

export function trialById(id) { return TRIALS.find((t) => t.id === id) || null; }
