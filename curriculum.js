// curriculum.js — adaptive concept scaffolding for Survive the Stack.
// Every exercise is tagged with concept ids. A concept's familiarity (times used,
// persisted in the save) decides how much help the player gets:
//   0 uses      → full teaching text + ghost text showing the whole answer shape
//   1–2 uses    → one-line reminder + skeleton ghost (structure, answers blanked)
//   3+ uses     → reminder only, no ghost (the Hint button remains as a fallback)
// Concept terms in lesson text are clickable and open the Command Journal entry.

export const CONCEPTS = {
  print: {
    journal: "print", link: "print statement",
    teach: 'A print statement writes words on the screen. It is how your character speaks. Whatever you place inside the parentheses gets shown, and text must sit inside quotation marks: print("hello") says hello.',
    remind: "Use a print statement to respond.",
  },
  "print-var": {
    journal: "print", link: "print statement",
    teach: 'A print statement can also show what a variable holds. Leave the quotation marks off and Python prints the value in the box instead of its name: print(gold) shows the number, print("gold") shows the word gold.',
    remind: "Print the variable, no quotes.",
  },
  variable: {
    journal: "variables", link: "variable",
    teach: "A variable is a labelled box that remembers a value. You create one with the equals sign: sticks = 10 stores ten in a box named sticks. Use the name later and Python fetches what is inside.",
    remind: "Store the values in variables with =.",
  },
  add: {
    journal: "plus", link: "plus sign",
    teach: "The plus sign adds. To grow a variable, take its current value, add more, and store the result back in the same box: sticks = sticks + 10.",
    remind: "Add with +.",
  },
  subtract: {
    journal: "minus", link: "minus sign",
    teach: "The minus sign subtracts. Taking things away is adding in reverse: sticks = sticks - 10 removes ten and stores what is left.",
    remind: "Subtract with -.",
  },
  walk: {
    journal: "you.walk", link: "walk command",
    teach: 'Commands can belong to a thing in the world. The walk command you.walk("place") tells your character, you, to walk, and the place to go sits inside the quotation marks.',
    remind: 'Use the walk command: you.walk("place").',
  },
  fire: {
    journal: "bow.fire", link: "bow.fire()",
    teach: "bow.fire() calls the fire action on your bow. Commands with empty parentheses need nothing extra. The parentheses alone make the action happen.",
    remind: "Fire with bow.fire().",
  },
  "for-loop": {
    journal: "for", link: "for loop",
    teach: "A for loop repeats a block of code so you do not have to. for i in range(4): runs the indented line under it four times. The colon and the four space indent matter, they tell Python what to repeat.",
    remind: "Repeat with a for loop and range(n).",
  },
  constant: {
    journal: "variables", link: "constant",
    teach: "A constant is a variable you set once and never change, written in CAPITALS so every reader knows: CONST_QUARTER = 0.25. Naming a number makes code easier to read than the bare number.",
    remind: "Name the value as a constant first.",
  },
  if: {
    journal: "ifelse", link: "if statement",
    teach: "An if statement is how code makes a decision. You write if, then a condition, then a colon: if food >= 2:. The indented lines under it run ONLY when the condition is true. When it is false, Python skips them entirely and carries on below, as if they were never there. Add an else block to catch the false case. Everything smart a program ever does, every gate, guard and checklist, is built from decisions like this one.",
    remind: "Make the choice with an if statement.",
  },
  input: {
    journal: "input", link: "input()",
    teach: "input() is the program asking YOU a question. The program pauses, a box pops up, and whatever you type becomes the value input() hands back.",
    remind: "Read the answer with input().",
  },
  float: {
    journal: "float", link: "float",
    teach: "A float is a number with a decimal point, like 1.75. Coins smaller than one whole gold need one. Python does math on floats exactly like whole numbers.",
    remind: "It is a float. The math works the same.",
  },
  bool: {
    journal: "equals", link: "True or False",
    teach: "A comparison is itself a value: arrows_fired > 0 comes out as True or False, and you can store it in a variable like any number. Chain comparisons with and: the whole thing is True only when BOTH sides are. This is boolean logic, and it is how programs weigh evidence.",
    remind: "Store the comparison itself: it is already True or False.",
  },
  intdiv: {
    journal: "floordiv", link: "floor division",
    teach: "Two operators split things into whole shares. Floor division, written //, finds how many whole times one number fits inside another. Modulo, written %, gives what is left over after those whole shares.",
    remind: "Use // for whole shares and % for the remainder.",
  },
  types: {
    journal: "types", link: "data types",
    teach: "Every value in Python has a SHAPE, called its type. \"12\" in quotes is a str: a string of text marks. 12 bare is an int: a whole number arithmetic works on. 7.5 is a float: a number that carries a point. True is a bool: one of exactly two values. The shape decides what a value can DO: multiply an int and you get arithmetic, multiply a str and the marks just repeat. Hold any value up to type() and it names the shape.",
    remind: "Check the shape with type().",
  },
  convert: {
    journal: "convert", link: "casting",
    teach: "Casting pours a value into a new mold: int(raw) makes a whole number from marks, float(raw) keeps the point, str(out) makes marks from a number. Two laws. The int mold CUTS, it never rounds: int(7.9) is 7. And input() always hands you marks, even when your fingers typed digits, so cast before you calculate.",
    remind: "Cast first: int(raw) before arithmetic.",
  },
};

// blank the answers out of a ghost answer, keeping the structure:
// numbers → …, quoted text → "…"
export function skeletonize(src) {
  return String(src).replace(/"[^"]*"/g, '"…"').replace(/\b\d+(\.\d+)?\b/g, "…");
}

// 0 → teach, 1..2 → remind + skeleton, 3+ → remind only
export function helpLevel(uses) { return uses === 0 ? 0 : uses <= 2 ? 1 : 2; }

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// build the lesson pane HTML: teach/remind per concept (by familiarity) + the
// task-specific line, with each concept's key term linkified to its journal entry.
export function buildLessonHTML(conceptIds, usesOf, task) {
  const ids = [].concat(conceptIds || []).filter((id) => CONCEPTS[id]);
  const parts = [];
  for (const id of ids) {
    const c = CONCEPTS[id];
    parts.push({ text: usesOf(id) === 0 ? c.teach : c.remind, id });
  }
  if (task) parts.push({ text: task, id: null });
  return parts
    .map((p) => {
      let html = escapeHtml(p.text);
      // linkify each of this exercise's concept terms (first occurrence, case-insensitive)
      for (const id of ids) {
        const c = CONCEPTS[id];
        const re = new RegExp("(" + c.link.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "i");
        if (re.test(html) && !html.includes('data-j="' + c.journal + '"')) html = html.replace(re, `<a class="concept" data-j="${c.journal}">$1</a>`);
      }
      return html;
    })
    .join("\n");
}
