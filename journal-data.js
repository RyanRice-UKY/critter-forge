// journal-data.js — Command Journal catalog + pure unlock matcher.
// No DOM, no Pyodide — safe to import from Node tests.

export const JOURNAL_SECTIONS = [
  {
    name: "Output",
    entries: [
      {
        id: "print", label: "print()", section: "Output",
        match: /print\s*\(/,
        summary: "Shows a message on screen — your character speaks it aloud.",
        syntax: "print(value)",
        parts: [
          ["print", "the command"],
          ["( )", "hold what to show"],
          ["value", 'text in "quotes", or a variable'],
        ],
        usage: ['print("Hello")', "print(gold)", 'print("HP:", hp)'],
        tryCode: 'print("test")',
      },
    ],
  },
  {
    name: "Movement",
    entries: [
      {
        id: "you.wake_up", label: "you.wake_up()", section: "Movement",
        match: /you\.wake_up\s*\(/,
        summary: "Your character stirs awake at the start of the story.",
        syntax: "you.wake_up()",
        parts: [["you", "your character"], [".wake_up()", "the action to perform"]],
        usage: ["you.wake_up()"],
        tryCode: "you.wake_up()",
      },
      {
        id: "you.walk", label: "you.walk()", section: "Movement",
        match: /you\.walk\s*\(/,
        summary: "Walk your character to a named place in the world.",
        syntax: 'you.walk("place")',
        parts: [
          ["you", "your character"],
          [".walk( )", "the action; what's inside is where to go"],
          ['"place"', "the destination name, in quotes"],
        ],
        usage: ['you.walk("tree")', 'you.walk("bridge")', 'you.walk("keep")'],
        tryCode: 'you.walk("tree")',
      },
      {
        id: "bow.fire", label: "bow.fire()", section: "Movement",
        match: /bow\.fire\s*\(/,
        summary: "Loose an arrow at the nearest enemy.",
        syntax: "bow.fire()",
        parts: [["bow", "your equipped bow"], [".fire()", "the action to perform"]],
        usage: ["bow.fire()", "for i in range(4):\n    bow.fire()"],
        tryCode: "bow.fire()",
      },
    ],
  },
  {
    name: "Math & variables",
    entries: [
      {
        id: "variables", label: "variables  ( = )", section: "Math & variables",
        match: /(^|[^=!<>+\-*/%])=(?!=)/,
        summary: "A variable is a labelled box that remembers a value for later.",
        syntax: "name = value",
        parts: [
          ["name", "the label you choose"],
          ["=", "put the value into the box"],
          ["value", "a number, text, or another variable"],
        ],
        usage: ["sticks = 10", "gold = 2.55", "name = hero"],
        tryCode: "sticks = 10\nprint(sticks)",
      },
      {
        id: "plus", label: "+  add", section: "Math & variables",
        match: /[\w)\]"']\s*\+(?!=)/,
        summary: "Adds two numbers together (or joins two pieces of text).",
        syntax: "a + b",
        parts: [["a", "first value"], ["+", "add them"], ["b", "second value"]],
        usage: ["sticks = sticks + 10", "total = 3 + 4"],
        tryCode: "print(3 + 4)",
      },
      {
        id: "minus", label: "−  subtract", section: "Math & variables",
        match: /[\w)\]"']\s*-(?![=>])/,
        summary: "Subtracts the second number from the first.",
        syntax: "a - b",
        parts: [["a", "start value"], ["-", "take away"], ["b", "amount to remove"]],
        usage: ["string = string - 3", "left = 10 - 6"],
        tryCode: "print(10 - 6)",
      },
      {
        id: "times", label: "*  multiply", section: "Math & variables",
        match: /[\w)\]"']\s*\*(?!=)/,
        summary: "Multiplies two numbers.",
        syntax: "a * b",
        parts: [["a", "first value"], ["*", "multiply"], ["b", "second value"]],
        usage: ["reward = arrows * coins", "area = w * h"],
        tryCode: "print(6 * 7)",
      },
      {
        id: "divide", label: "/  divide", section: "Math & variables",
        match: /(?<!\/)\/(?!\/)/,
        summary: "Divides the first number by the second (gives a decimal).",
        syntax: "a / b",
        parts: [["a", "the total"], ["/", "split it"], ["b", "into this many parts"]],
        usage: ["chips = change / 2", "half = 10 / 4"],
        tryCode: "print(10 / 4)",
      },
      {
        id: "floordiv", label: "//  floor divide", section: "Math & variables",
        match: /\/\//,
        summary: "Divides and throws away the remainder — a whole-number result.",
        syntax: "a // b",
        parts: [["a", "the total"], ["//", "split into whole groups"], ["b", "group size"]],
        usage: ["pieces = reward // price"],
        tryCode: "print(7 // 2)",
      },
      {
        id: "modulo", label: "%  remainder", section: "Math & variables",
        match: /%(?!=)/,
        summary: "Gives what's left over after dividing.",
        syntax: "a % b",
        parts: [["a", "the total"], ["%", "the leftover after grouping"], ["b", "group size"]],
        usage: ["change = reward % price"],
        tryCode: "print(7 % 2)",
      },
      {
        id: "plusassign", label: "+=  add to", section: "Math & variables",
        match: /\+=/,
        summary: "Shorthand: add a value straight into an existing variable.",
        syntax: "name += value",
        parts: [["name", "the variable to grow"], ["+=", "add this much to it"], ["value", "how much"]],
        usage: ["gold += 1.75", "score += 1"],
        tryCode: "gold = 2\ngold += 1.75\nprint(gold)",
      },
    ],
  },
  {
    name: "Control flow",
    entries: [
      {
        id: "ifelse", label: "if / else", section: "Control flow",
        match: /\b(if|elif|else)\b/,
        summary: "Make a choice: run one block when a condition is true, another when false.",
        syntax: "if condition:\n    ...\nelse:\n    ...",
        parts: [
          ["if", "test a condition"],
          ["condition:", "the question being asked"],
          ["else:", "what to do when it's false"],
        ],
        usage: ['if gold > 5:\n    print("rich")', 'if word == "ironwatch":\n    pass\nelse:\n    print("no")'],
        tryCode: 'gold = 6\nif gold > 5:\n    print("rich")\nelse:\n    print("poor")',
      },
      {
        id: "equals", label: "==  is equal to", section: "Control flow",
        match: /==/,
        summary: "Checks whether two values are equal. Works on numbers and words.",
        syntax: "a == b",
        parts: [["a", "first value"], ["==", "are they the same?"], ["b", "second value"]],
        usage: ['word == "ironwatch"', "hp == 0"],
        tryCode: 'print("a" == "a")',
      },
      {
        id: "for", label: "for loop", section: "Control flow",
        match: /\bfor\b/,
        summary: "Repeat the same action a set number of times.",
        syntax: "for i in range(n):\n    ...",
        parts: [
          ["for i", "a counter that steps each pass"],
          ["range(n)", "how many times to repeat"],
          [":", "the indented block below repeats"],
        ],
        usage: ["for i in range(4):\n    bow.fire()"],
        tryCode: 'for i in range(3):\n    print("shot", i)',
      },
      {
        id: "input", label: "input()", section: "Control flow",
        match: /input\s*\(/,
        summary: "The program asks YOU a question — what you type becomes a value.",
        syntax: "name = input()",
        parts: [["input()", "pops up a box and waits for you"], ["name =", "stores what you typed"]],
        usage: ["secret = input()"],
        tryCode: 'print("(input is interactive — try it in the lesson)")',
      },
    ],
  },
];

export function allEntries() {
  return JOURNAL_SECTIONS.flatMap((s) => s.entries);
}

export function findUnlocks(line) {
  const out = [];
  for (const e of allEntries()) if (e.match.test(line)) out.push(e.id);
  return out;
}
