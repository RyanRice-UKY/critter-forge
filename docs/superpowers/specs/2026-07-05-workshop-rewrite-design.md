# Workshop Rewrite — EXPLANATION + TASK Format (Ryan's script)

Ryan rewrote the entire workshop phase copy (2026-07-05). His script is
the source of truth below, verbatim. This spec adds only the mechanics
mapping needed to implement it.

## Mechanics mapping (controller's notes, approved approach)

1. **Panel format:** each ask's `task:` string becomes Ryan's
   EXPLANATION paragraph, a blank line, then `TASK:` and his numbered
   steps, newlines preserved (the panel renders pre-wrap).
2. **Beat titles become the ask prompts:** "Run the failed probe",
   "Recreate the stutter yourself", "Check every type", "Cast text into
   a number", "A number with a point in it", "Pour a float into int",
   "Label the board", "Your own probe, your own question", "Steal rule
   1" / "Steal rule 2" / "Steal rule 3". (Drives update to match.)
3. **Stutter-first in Beat 4:** the validator stages it. An uncast run
   that printed the stutter gets "There is the stutter, on the board.
   Now cast it: signal = int(raw) and print signal * 2 instead." An
   uncast run without the stutter gets "See the stutter first:
   print(raw * 2). Then cast it: signal = int(raw)." The final accepted
   answer (and Tab-skip placeholder) is the cast version.
4. **Fail-first in Beats 5 and 7:** the invited failures ride the error
   translations, reworded to Ryan's text: ValueError from int() with a
   point becomes "int() only takes whole numbers. This one has a point.
   Use float()." and the text+number TypeError becomes "You mixed a
   bare number with text. Cast it: str(out)."
5. **Craftsman dialogue trimmed:** his speeches no longer carry the
   science (the panels do). Final say script:
   - OPEN: "So you are the scout. Hand it here. Careful. CAREFUL." then
     "It still ANSWERS. I crank a signal in, it answers out. Every
     machine keeps rules between the in and the out. We are going to
     steal them." (narrator vice line removed)
   - B1 pre: "Before we steal its rules, you should know why I FAILED
     all night. I cranked twelve in. It answered one-two-one-two.
     Garbage." (garbage pair pushed) B1 after: "One-two-one-two. The
     wire was handing me TEXT the whole time. See for yourself."
   - B2 pre: "This time YOU feed the wire. Type any two-digit number
     when it asks." B2 after: "Your digits, doubled into longer text. A
     keyboard makes text, not numbers."
   - B3 pre: "Here is your experiment back, with three more values
     wired beside it. The marks check is written. Check the rest."
     B3 after: "Text repeats. Numbers calculate. There is the whole
     clue. Now the trick I never knew: the one where you teach ME."
   - B4 pre: "I crank twelve in. The board waits on the OUT, because
     the missing half of this circuit is YOU." (pending pair) B4 after:
     "TWENTY-FOUR. All night I fought this thing, and you fix it with
     one cast."
   - B5 pre: "Now a half-strength probe." (pending 7.5 pair) B5 after:
     "Fifteen POINT ZERO. The float keeps its point. So what happens
     when you pour it into the int mold?"
   - B6 after: "Seven, and seven AGAIN from a value nearly touching
     eight. The mold cuts. It never rounds."
   - B7 after: "Three molds now: int(), float(), str()."
   - B8 pre: "One type left. YOU crank." B8 after: "True or False and
     nothing else: bool. The machine's whole soul is questions poured
     into that smallest mold."
   - Post-walkthrough: "Four types. Three molds. One law about the cut.
     NOW we steal its rules."
   - Round intros/afters and the reveal keep their current lines.
6. **Hints:** replaced with Ryan's per beat/round (mapped onto the
   existing validator branches; branch logic otherwise unchanged except
   Beat 4's new staged branch).
7. **Walkthrough:** WT_TYPES steps become Ryan's six one-liners (code
   block unchanged).
8. **Concept panes:** curriculum.js teach/remind texts for types,
   convert, float, input, bool replaced with Ryan's versions.
9. Unchanged: given/answer code per beat, round rules/pairs/feeds/
   reruns, pairs-first pending pairs, stdout-on-board, the reveal,
   implantStep flow, Tab-skip rule (all placeholders pass their own
   validators), no em dashes.

## Ryan's script (verbatim)

[The full rewrite as delivered, preserved in docs/dialogue-workshop.md
which is replaced by this content plus the sections above. Beat-by-beat
EXPLANATION and TASK blocks and hints are quoted directly in the
implementation plan; the plan is the executable form of this script.]
