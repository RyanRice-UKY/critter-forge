# Workshop Phase — Full Dialogue + Problems (for Ryan's simplification pass)

Transcribed verbatim from lesson1.js as of commit aa43b81. Edit this file
freely; the marked-up version drives the rewrite. Notes:
- Python fact: "7.5" * 2 prints 7.57.5 (the whole text repeats), not 7575.
- Queued flow changes (implement with the rewrite): demonstrate the uncast
  stutter FIRST, then cast, for both the 12 -> 24 beat and the 7.5 -> 15 beat.
- No em dashes in player-facing copy.

## SCENE OPEN (first visit)

CRAFTSMAN: So you are the scout. The captain's runner said you carry something that should not exist. Hand it here. Careful. CAREFUL.
NARRATOR: He sets the implant in a brass vice like it might bite, runs a patch cable down from his switchboard wall, and drags the slate board where you both can see it.
CRAFTSMAN: It still ANSWERS. Look. I crank a signal IN, it answers OUT. Every machine keeps rules between the in and the out. You and I are going to steal them.

## BEAT 1 — Run the craftsman's failed probe

CRAFTSMAN: Before we steal its rules, you should know why I FAILED all night. Look at the board. I cranked twelve into it. It answered one-two-one-two. Garbage.
  [board: IN 12 -> OUT 1212 ??]
CRAFTSMAN: And it was not the machine mocking me. It was the wire. A wire cannot hand you a NUMBER, scout. It hands you MARKS. Text. And all night, I was doing arithmetic on text.

GIVEN CODE (read-only, player presses Run):
    raw = "12"
    print(raw * 2)
PANEL: This is exactly what the craftsman ran all night. Read it before you run it: the quotes around "12" matter. Run it and watch what the machine answers.

CRAFTSMAN (after): One-two-one-two. Do you see it now? "12" in quotes is not a number. It is a str, a STRING of text marks. Multiply marks and Python politely repeats them.

## BEAT 2 — Recreate the stutter with your own marks

CRAFTSMAN: Do not take my word for it. PROVE it. And this time YOU feed the wire: input() will ask for your marks. Type any two-digit number when it does.

GIVEN (line 1): marks = input()
POPUP: The crank is yours. Type any two-digit number:  (default 34)
ANSWER:
    marks = input()
    print(marks * 2)
    print(type(marks))
PANEL: Line 1 is written: marks = input() takes whatever you type. Here is the trap: even when your fingers type digits, input() hands back MARKS, text, a str. Print marks * 2 and watch the stutter happen with YOUR number, then print type(marks) to see the shape with your own eyes. Do NOT cast anything yet.
HINTS: "No casting yet. This beat is about what happens WITHOUT the mold." / "Type a two-digit number when the box appears (line 1 does the asking)." / "Print marks * 2. With your NN the machine should stutter NNNN." / "Now print type(marks) and read the shape it names."

CRAFTSMAN (after): There it is, on the board, in your own hand: your digits doubled into LONGER MARKS, and the caliper naming the shape. str. input() ALWAYS hands you marks, scout. A keyboard makes marks, not numbers.
CRAFTSMAN: What a value CAN DO is decided by its shape, and that shape has a name: its TYPE. And marks is only the first of the shapes.

## BEAT 3 — Check the shape of every variable

CRAFTSMAN: Here is your experiment back. I stripped the prints and wired three more values beside it, with the marks check already written. Check the rest.

GIVEN:
    marks = "34"
    echo = marks * 2
    count = 34
    volts = 7.5
    armed = True
    print(type(marks))
PLAYER ADDS:
    print(type(echo))
    print(type(count))
    print(type(volts))
    print(type(armed))
PANEL: The first six lines are given: your experiment, three new values, and one caliper line already checking marks. Add caliper lines for the REST: echo, count, volts, armed. The shapes on the board are the clue to how this machine thinks.
HINTS: "Check echo too: print(type(echo))." (same pattern per variable) / "Run all five checks and read the shapes off the board."

CRAFTSMAN (after): READ them, scout. marks is str, and echo is str too: marks times two is just LONGER MARKS. But count is int, volts is float, armed is bool. Four shapes.
CRAFTSMAN: There is the clue. The machine repeats TEXT and calculates NUMBERS. Everything it does flows from which shape it holds. Now the trick I never knew. The one where you teach ME.

## BEAT 4 — Cast the marks into a number

CRAFTSMAN: I crank twelve in. The board shows the IN and waits on the OUT, because the missing half of this circuit is YOU.
  [board: IN 12 -> OUT ?]

GIVEN (line 1): raw = "12"
ANSWER:
    raw = "12"
    signal = int(raw)
    print(signal * 2)
PANEL: In this trade we CAST: pour metal into a mold and it takes the mold's shape. int(raw) is Python casting. The parentheses are the crucible: marks go in, a true int comes out. The declaration sits on line 1 where you can see it. Beneath it, cast raw into a variable named signal, then print signal * 2.
HINTS: "Pour it through the mold: signal = int(raw)." / "signal is still marks. Cast it: signal = int(raw)." / "Cast raw itself; do not type your own number." / "Now print signal * 2 and let the machine answer with real arithmetic."

  [board completes: IN 12 -> OUT 24]
CRAFTSMAN (after): TWENTY-FOUR. All night I fought this thing, and you fix it with one cast. The board just logged its first honest pair. We are not done: the wire has more shapes in it.

## BEAT 5 — A probe with a point in it

  [board: IN 7.5 -> OUT ?]

GIVEN (line 1): raw = "7.5"
ANSWER:
    raw = "7.5"
    strength = float(raw)
    print(strength * 2)
PANEL: He cranks a half-strength probe and the wire hands you "7.5". Try int(raw) first if you like; the int mold refuses marks that carry a point. The right mold is float(raw): a float is a number that keeps its point. Cast, then print strength * 2. The declaration sits on line 1 where you can see it.
HINTS: "These marks carry a point. The int mold refuses them; cast with float(raw)." / "strength should come out a number: strength = float(raw)." / "Print strength * 2. Watch closely: the answer will carry a point." / (naive int(raw) attempt) "The int mold only takes whole-number marks. These marks carry a point in them; cast with float() instead."

  [board completes: IN 7.5 -> OUT 15.0]
CRAFTSMAN (after): Fifteen POINT ZERO. A float never drops its point, even with nothing riding behind it. Now the law every smith learns the hard way. What happens when you pour a float into the int mold?

## BEAT 6 — Pour a float into the int mold

GIVEN (line 1): strength = 7.5
ANSWER:
    strength = 7.5
    whole = int(strength)
    print(whole)
    print(int(7.9))
PANEL: Cast strength (it holds 7.5) into the int mold as whole, and print it. Then also print int(7.9), a value sitting a hair from 8. Predict both answers before you run. The declaration sits on line 1.
HINTS: "Use the int mold: whole = int(strength)." / "whole = int(strength). Let the mold do the cutting." / "Print whole, then print int(7.9). Two lines, two answers."

CRAFTSMAN (after): Seven. And seven AGAIN, from a value nearly touching eight. The int mold does not round, scout. It CUTS. Everything after the point drips off the edge of the crucible and is gone. If you ever want rounding, you must ask for rounding. The mold gives nothing for free.

## BEAT 7 — Label the board

GIVEN (line 1): out = 15
ANSWER:
    out = 15
    label = "OUT " + str(out)
    print(label)
PANEL: The board wants a label that reads OUT 15. Try print("OUT " + out) first if you like: Python refuses to glue marks to a bare number. str(out) is the mold that runs backward, numbers into marks. Build label from "OUT " plus str(out), then print it.
HINTS: "Cast the number into marks first: str(out)." / "Store the joined marks: label = \"OUT \" + str(out)." / "Print the label. It should read: OUT 15" / (naive glue attempt) "You mixed bare numbers with marks. Cast the number into marks first: str(out)."

CRAFTSMAN (after): Three molds now. int() for whole numbers, float() for numbers with a point, str() for marks. Any value, any shape, so long as the marks fit the mold. One shape left, and for that one YOU crank.

## BEAT 8 — Crank your own probe

POPUP: Your hand is on the crank. Send a whole number down the wire:  (default 14)
ANSWER:
    raw = input("signal to send:")
    signal = int(raw)
    strong = signal >= 10
    print(strong)
PANEL: Your turn at the crank again, and this time you know the trap: input() hands back marks even when you type digits, so cast before you compare. Take the signal, cast it to int, then store the question signal >= 10 in a variable named strong, and print it.
HINTS: "Take the crank: raw = input(...)." / "input() handed you marks. Cast before you compare: signal = int(raw)." / "Store the question itself: strong = signal >= 10. It comes out True or False." / "strong must hold exactly the question signal >= 10."

CRAFTSMAN (after): And there is the fourth shape: bool. Two values fit that mold, True and False, and nothing else ever will. The machine's whole soul, wait or move or hunt, is questions poured into that smallest mold.

## SLATE WALKTHROUGH (line-by-line overlay, once)

CODE:
    marks = "12"
    signal = int(marks)
    volts = 7.5
    cut = int(volts)
    label = "OUT " + str(cut)
    strong = signal >= 10
STEP 1: Quotes make a str, a string of text marks. "12" is not twelve. It is two marks standing side by side, a one and a two: text wearing a number's face.
STEP 2: Casting. int(marks) pours the marks into the int mold and a true whole number comes out. The parentheses are the crucible: marks go in, a number arithmetic works on comes out.
STEP 3: A bare number carrying a point is a float. It keeps the point forever: half strength is 7.5, and doubling it gives 15.0, point and all.
STEP 4: Pour a float into the int mold and the mold CUTS. cut is 7. int(7.9) is also 7, though it sits a hair from 8. Everything after the point drips off the crucible's edge and is gone. The int mold never rounds.
STEP 5: str() is the mold that runs backward: numbers into marks. You cannot glue marks straight onto a bare number. Cast it first, then + joins marks to marks.
STEP 6: A question is a value too. signal >= 10 comes out True or False and nothing else: a bool, the smallest mold there is. Every decision the machine makes is built from this shape.

CRAFTSMAN (after): Four shapes. Three molds. One law about the cut. NOW we are fit to steal its rules.

## ROUND 1 — Decipher rule 1: set out from signal

CRAFTSMAN: First rule. The shallow one. Watch the board.
  [board animates: IN 2 -> OUT 5, IN 4 -> OUT 9, IN 7 -> OUT 15, then pending IN 7 -> OUT ?]
GIVEN (line 1): raw = input()   (machine feeds 7)
ANSWER:
    raw = input()
    signal = int(raw)
    out = signal * 2 + 1
PANEL: The wire feeds your code through input(): line 1 is already written. The crank is sending 7. Cast before you calculate. The board shows what the machine did: IN 2 -> OUT 5, IN 4 -> OUT 9, IN 7 -> OUT 15. Write the steps between IN and OUT: set out from signal so your steps match EVERY pair, not just this one.
HINTS: "The wire gave you marks, not a number. Cast before you calculate: signal = int(raw)." / "The board disagrees. IN 7 must come OUT 15; your steps made X. Set out from signal." / "The craftsman cranks a fresh probe: IN 2. Your steps say 15. The machine says 5. It answers EVERY signal, not just one."

CRAFTSMAN (after): That is it. That is exactly it. Two rules left.

## ROUND 2 — Decipher rule 2: the machine ignores weak signals

CRAFTSMAN: Second rule. Stranger. Watch what it does to WEAK signals.
  [board: IN 4 -> OUT 0, IN 9 -> OUT 0, IN 12 -> OUT 2, IN 15 -> OUT 5, pending IN 12 -> OUT ?]
GIVEN (line 1): raw = input()   (machine feeds 12)
ANSWER:
    raw = input()
    signal = int(raw)
    if signal < 10:
        out = 0
    else:
        out = signal - 10
PANEL: The wire feeds your code through input(): line 1 is already written. The crank is sending 12. Cast first. IN 4 -> OUT 0. IN 9 -> OUT 0. IN 12 -> OUT 2. IN 15 -> OUT 5. Below ten it answers nothing: out is 0. Ten and above, it answers signal minus 10. You know if. Now meet else: the if answers the YES, and the else catches every NO.
HINTS: cast hint (as R1) / "Ask the question first: an if line about signal, ending with a colon." / "The if answers the yes. You still need an else: for every no." / board-disagrees + fresh-probe (as R1).

CRAFTSMAN (after): An if with an else. You just taught a machine's whole heart to hold a coin. One left.

## ROUND 3 — Decipher rule 3: two behaviours, one machine

CRAFTSMAN: Last rule. The deep one. This is where it keeps its orders.
  [board: IN 3 -> OUT 4, IN 8 -> OUT 9, IN 12 -> OUT 24, IN 20 -> OUT 40, pending IN 20 -> OUT ?]
GIVEN (line 1): raw = input()   (machine feeds 20)
ANSWER:
    raw = input()
    signal = int(raw)
    if signal < 10:
        out = signal + 1
    else:
        out = signal * 2
PANEL: The wire feeds your code through input(): line 1 is already written. The crank is sending 20. Cast first. IN 3 -> OUT 4. IN 8 -> OUT 9. IN 12 -> OUT 24. IN 20 -> OUT 40. Weak signals gain one. Strong signals are doubled. One if, one else, and the machine has no secrets left.
HINTS: same family as Round 2.

CRAFTSMAN (after): All three rules, stolen clean. Now for the part that has kept my hands shaking.

## THE REVEAL

  [legend on the board: 1 = WAIT   2 = MOVE   4 = HUNT]
CRAFTSMAN: The plate keeps a BUFFER: the last orders it was ever fed. I pulled three of them. The legend is on the board. Hold on to something.
  [board: ORDER 4   HUNT, three times, red]
CRAFTSMAN: Three orders in the buffer. Three. And every one of them decodes the same. HUNT. HUNT. HUNT.
CRAFTSMAN: This is not plague, scout. This is COMMAND. Somebody out there is speaking to the dead in numbers, and the dead are LISTENING.
NARRATOR: The knight must hear this now. you.walk("knight").

## CONCEPT-PANE TEXTS (shown in the lesson panel when a beat is tagged)

types (teach): Every value in Python has a SHAPE, called its type. "12" in quotes is a str: a string of text marks. 12 bare is an int: a whole number arithmetic works on. 7.5 is a float: a number that carries a point. True is a bool: one of exactly two values. The shape decides what a value can DO: multiply an int and you get arithmetic, multiply a str and the marks just repeat. Hold any value up to type() and it names the shape.
types (remind): Check the shape with type().
convert (teach): Casting pours a value into a new mold: int(raw) makes a whole number from marks, float(raw) keeps the point, str(out) makes marks from a number. Two laws. The int mold CUTS, it never rounds: int(7.9) is 7. And input() always hands you marks, even when your fingers typed digits, so cast before you calculate.
convert (remind): Cast first: int(raw) before arithmetic.
float (teach, OLD 1.3-era text, candidate for rewrite): A float is a number with a decimal point, like 1.75. Coins smaller than one whole gold need one. Python does math on floats exactly like whole numbers.
float (remind): It is a float. The math works the same.
input (teach): input() is the program asking YOU a question. The program pauses, a box pops up, and whatever you type becomes the value input() hands back.
bool (teach): A comparison is itself a value: arrows_fired > 0 comes out as True or False, and you can store it in a variable like any number. Chain comparisons with and: the whole thing is True only when BOTH sides are. This is boolean logic, and it is how programs weigh evidence.
