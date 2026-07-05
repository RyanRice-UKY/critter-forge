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
    teach: "input() pauses the program and asks YOU a question. Whatever you type comes back as text, always, even digits.",
    remind: "Read the answer with input().",
  },
  float: {
    journal: "float", link: "float",
    teach: "A float is a number with a decimal point, like 7.5. Math on floats works exactly like whole numbers, and the answer keeps its point.",
    remind: "It is a float. The math works the same.",
  },
  bool: {
    journal: "equals", link: "True or False",
    teach: "A comparison like signal > 0 comes out True or False. That is a bool. You can store it in a variable like any number. Chain questions with and: the whole thing is True only when both sides are.",
    remind: "Store the comparison itself: it is already True or False.",
  },
  intdiv: {
    journal: "floordiv", link: "floor division",
    teach: "Two operators split things into whole shares. Floor division, written //, finds how many whole times one number fits inside another. Modulo, written %, gives what is left over after those whole shares.",
    remind: "Use // for whole shares and % for the remainder.",
  },
  types: {
    journal: "types", link: "data types",
    teach: "Every value has a type. str is text: \"12\". int is a whole number: 12. float keeps a decimal point: 7.5. bool is True or False. The type decides what a value can do. Numbers calculate. Text repeats. type() names the type.",
    remind: "Check it with type().",
  },
  convert: {
    journal: "convert", link: "casting",
    teach: "Casting converts a value to another type. int(raw) makes a whole number from text. float(raw) keeps the point. str(out) makes text from a number. Two laws: int() cuts, it never rounds. input() always hands you text, so cast before you calculate.",
    remind: "Cast first: int(raw) before math.",
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
