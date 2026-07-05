# Workshop Phase — Full Dialogue + Problems

Mirrors the live game (lesson1.js) as of this commit: Ryan's EXPLANATION + TASK script, shipped.

## SCENE OPEN (first visit)

CRAFTSMAN: So you are the scout. Hand it here. Careful. CAREFUL.
CRAFTSMAN: It still ANSWERS. I crank a signal in, it answers out. Every machine keeps rules between the in and the out. We are going to steal them.

## BEAT 1 — Run the failed probe

CRAFTSMAN: Before we steal its rules, you should know why I FAILED all night. I cranked twelve in. It answered one-two-one-two. Garbage.
  [board: IN 12 -> OUT 1212 ??]

GIVEN CODE (read-only, player presses Run):
    raw = "12"
    print(raw * 2)
PANEL: "12" in quotes is not a number. It is text. Python calls text a str. When you multiply text by 2, Python does not do math. It repeats the text. That is why 12 came out as 1212.

TASK:
Press Run. Watch "12" * 2 print 1212.
HINTS: "Just press Run; the code is already written."

CRAFTSMAN (after): One-two-one-two. The wire was handing me TEXT the whole time. See for yourself.

## BEAT 2 — Recreate the stutter yourself

CRAFTSMAN: This time YOU feed the wire. Type any two-digit number when it asks.

GIVEN (line 1): marks = input()
POPUP: The crank is yours. Type any two-digit number:  (default 34)
ANSWER:
    marks = input()
    print(marks * 2)
    print(type(marks))
PANEL: input() asks you a question and hands back whatever you type. Here is the trap: input() ALWAYS hands back text, even when you type digits. A keyboard makes text, not numbers.

TASK:
Line 1 is already written: marks = input()
1. Add: print(marks * 2)
2. Add: print(type(marks))
3. Run it. Type any two digit number in the box.
Your number will stutter (34 becomes 3434) and type() will say str.
Do NOT cast anything yet.
HINTS: "No casting yet. We want to see the stutter first." / "Type a two digit number in the box (line 1 does the asking)." / "Add print(marks * 2). Type NN and the machine prints NNNN." / "Now add print(type(marks)) to see the type."

CRAFTSMAN (after): Your digits, doubled into longer text. A keyboard makes text, not numbers.

## BEAT 3 — Check every type

CRAFTSMAN: Here is your experiment back, with three more values wired beside it. The marks check is written. Check the rest.

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
PANEL: Every value in Python has a type. There are four here:
str: text ("34")
int: a whole number (34)
float: a number with a decimal point (7.5)
bool: True or False
type() tells you which type a value is. The type decides what a value can do. Numbers calculate. Text repeats.

TASK:
The check for marks is already written. Add four more lines:
1. print(type(echo))
2. print(type(count))
3. print(type(volts))
4. print(type(armed))
Run it and read all five types off the board.
HINTS: "Same pattern every time: print(type(echo))." (same per variable) / "Run all five checks and read the types."

CRAFTSMAN (after): Text repeats. Numbers calculate. There is the whole clue. Now the trick I never knew: the one where you teach ME.

## BEAT 4 — Cast text into a number

CRAFTSMAN: I crank twelve in. The board waits on the OUT, because the missing half of this circuit is YOU.
  [board: IN 12 -> OUT ?]

GIVEN (line 1): raw = "12"
ANSWER:
    raw = "12"
    signal = int(raw)
    print(signal * 2)
PANEL: Casting converts a value from one type to another. int(raw) takes the text "12" and turns it into the number 12. Once it is a real number, math works.

TASK:
Line 1 is already written: raw = "12"
1. First add print(raw * 2) and run it. Watch the stutter: 1212.
2. Now add: signal = int(raw)
3. Change your print to: print(signal * 2)
4. Run it. You should get 24.
HINTS (staged): uncast run showing 1212 gets "There is the stutter, on the board. Now cast it: signal = int(raw) and print signal * 2 instead." / uncast run with no stutter gets "See the stutter first: print(raw * 2). Then cast it: signal = int(raw)." / "signal is still text. Cast it: signal = int(raw)." / "Cast raw itself. Do not type your own number." / "Change your print to: print(signal * 2). You should get 24."

  [board completes: IN 12 -> OUT 24]
CRAFTSMAN (after): TWENTY-FOUR. All night I fought this thing, and you fix it with one cast.

## BEAT 5 — A number with a point in it

CRAFTSMAN: Now a half-strength probe.
  [board: IN 7.5 -> OUT ?]

GIVEN (line 1): raw = "7.5"
ANSWER:
    raw = "7.5"
    strength = float(raw)
    print(strength * 2)
PANEL: "7.5" is text with a decimal point in it. When int() reads text, every character must be a digit. The dot is not a digit, and int() refuses to guess whether "7.5" should become 7 or 8, so it stops with an error. float() knows how to read the dot. A float is a number that keeps its decimal point. 7.5 doubled is 15.0, point and all.

TASK:
Line 1 is already written: raw = "7.5"
1. First try: strength = int(raw). Run it. Watch it fail.
2. Change it to: strength = float(raw)
3. Add: print(strength * 2)
4. Run it. You should get 15.0.
HINTS: "These marks carry a point. Cast with float(raw)." / "strength should come out a number: strength = float(raw)." / "Print strength * 2. The answer keeps its point." / (naive int(raw) attempt, error cast) "int() was reading text and hit the dot. It refuses to guess between 7 and 8, so it stops. float() knows how to read the point: strength = float(raw)."

  [board completes: IN 7.5 -> OUT 15.0]
CRAFTSMAN (after): Fifteen POINT ZERO. The float keeps its point. So what happens when you pour it into the int mold?

## BEAT 6 — Pour a float into int

GIVEN (line 1): strength = 7.5
ANSWER:
    strength = 7.5
    whole = int(strength)
    print(whole)
    print(int(7.9))
PANEL: Reading text is one job. Converting a real number is another. int() refused the TEXT "7.5", but hand it the NUMBER 7.5 and it converts: it does NOT round. It cuts. Everything after the decimal point is thrown away. int(7.5) is 7. int(7.9) is also 7, even though 7.9 is almost 8. If you want rounding, you must ask for rounding. int() never gives it.

TASK:
Line 1 is already written: strength = 7.5
1. Add: whole = int(strength)
2. Add: print(whole)
3. Add: print(int(7.9))
Guess both answers before you press Run.
HINTS: "Use the int mold: whole = int(strength)." / "whole = int(strength)." / "Print whole, then print int(7.9). Two lines, two answers."

CRAFTSMAN (after): Seven, and seven AGAIN from a value nearly touching eight. The mold cuts. It never rounds.

## BEAT 7 — Label the board

GIVEN (line 1): out = 15
ANSWER:
    out = 15
    label = "OUT " + str(out)
    print(label)
PANEL: You cannot glue text and a number together with +. "OUT " + 15 errors because one side is text and the other is a number. str() runs the other direction: it turns the number 15 into the text "15". Once both sides are text, + joins them.

TASK:
Line 1 is already written: out = 15
1. First try: print("OUT " + out). Run it. Watch it fail.
2. Add: label = "OUT " + str(out)
3. Add: print(label)
4. Run it. It should read: OUT 15
HINTS: "Turn the number into text first: str(out)." / "Store it: label = \"OUT \" + str(out)." / "Print the label. It should read: OUT 15" / (naive glue attempt, error cast) "You mixed a bare number with text. Cast it: str(out)."

CRAFTSMAN (after): Three molds now: int(), float(), str().

## BEAT 8 — Your own probe, your own question

CRAFTSMAN: One type left. YOU crank.

POPUP: Your hand is on the crank. Send a whole number down the wire:  (default 14)
ANSWER:
    raw = input("signal to send:")
    signal = int(raw)
    strong = signal >= 10
    print(strong)
PANEL: A comparison like signal >= 10 is a question. Python answers with True or False. That answer is a bool, the fourth and smallest type. You can store it in a variable like any other value. Every decision a machine makes is built from this type.

TASK:
1. Take the crank: raw = input("signal to send:")
2. input() gave you text. Cast it: signal = int(raw)
3. Store the question: strong = signal >= 10
4. print(strong)
Run it and type a whole number. You will see True or False.
HINTS: "Start with input()." / "Cast before you compare: signal = int(raw)." / "Store the question itself: strong = signal >= 10." / "strong must hold exactly the question signal >= 10."

CRAFTSMAN (after): True or False and nothing else: bool. The machine's whole soul is questions poured into that smallest mold.

## SLATE WALKTHROUGH (line-by-line overlay, once)

CODE:
    marks = "12"
    signal = int(marks)
    volts = 7.5
    cut = int(volts)
    label = "OUT " + str(cut)
    strong = signal >= 10
STEP 1: Quotes make a str. "12" is text, not twelve.
STEP 2: int(marks) casts text into a whole number. Now math works.
STEP 3: A bare number with a point is a float. It keeps the point forever.
STEP 4: int() cuts, it never rounds. int(7.9) is 7.
STEP 5: str() runs backward: number into text. Cast before you glue.
STEP 6: A question comes out True or False: a bool. Every decision is built from it.

CRAFTSMAN (after): Four types. Three molds. One law about the cut. NOW we steal its rules.

## ROUND 1 — Steal rule 1

CRAFTSMAN: First rule. The shallow one. Watch the board.
  [board animates: IN 2 -> OUT 5, IN 4 -> OUT 9, IN 7 -> OUT 15, then pending IN 7 -> OUT ?]
GIVEN (line 1): raw = input()   (machine feeds 7)
ANSWER:
    raw = input()
    signal = int(raw)
    out = signal * 2 + 1
PANEL: The board shows pairs the machine already answered:
IN 2 -> OUT 5. IN 4 -> OUT 9. IN 7 -> OUT 15.
Your steps must turn IN into OUT for EVERY pair, not just one.

TASK:
Line 1 is already written: raw = input()   (the machine feeds 7)
1. Cast first: signal = int(raw)
2. Study the pairs. Find the one rule that fits all three.
3. Set out from signal so every pair matches.
You can store the answer in out or just print it.
HINTS: "The wire gave you text. Cast first: signal = int(raw)." / "The board disagrees. IN 7 must come OUT 15. Your steps made X." / "Fresh probe: IN 2. Your steps say 15. The machine says 5. Your rule must answer EVERY signal."

CRAFTSMAN (after): That is it. That is exactly it. Two rules left.

## ROUND 2 — Steal rule 2

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
PANEL: if runs its lines only when a question is True. else runs when the question is False. One if plus one else covers every possible signal.

TASK:
Line 1 is already written: raw = input()   (the machine feeds 12)
1. Cast first: signal = int(raw)
2. Read the pairs: IN 4 -> 0. IN 9 -> 0. IN 12 -> 2. IN 15 -> 5.
   Below ten the machine answers 0. Ten and above, it answers signal minus 10.
3. Write it: an if for the weak signals, an else for the rest.
You can store the answer in out or just print it.
HINTS: cast hint (as R1) / "Ask the question first: an if line about signal, ending with a colon." / "The if answers the yes. You still need an else for every no." / board-disagrees + fresh-probe (as R1).

CRAFTSMAN (after): An if with an else. You just taught a machine's whole heart to hold a coin. One left.

## ROUND 3 — Steal rule 3

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
PANEL: One machine can hold two behaviors at once. The if decides which one runs. That is the whole trick.

TASK:
Line 1 is already written: raw = input()   (the machine feeds 20)
1. Cast first: signal = int(raw)
2. Read the pairs: IN 3 -> 4. IN 8 -> 9. IN 12 -> 24. IN 20 -> 40.
   Weak signals gain one. Strong signals double.
3. Write both behaviors with one if and one else.
You can store the answer in out or just print it.
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

types (teach): Every value has a type. str is text: "12". int is a whole number: 12. float keeps a decimal point: 7.5. bool is True or False. The type decides what a value can do. Numbers calculate. Text repeats. type() names the type.
types (remind): Check it with type().
convert (teach): Casting converts a value to another type. int(raw) makes a whole number from text. float(raw) keeps the point. str(out) makes text from a number. Two laws: int() cuts, it never rounds. input() always hands you text, so cast before you calculate.
convert (remind): Cast first: int(raw) before math.
float (teach): A float is a number with a decimal point, like 7.5. Math on floats works exactly like whole numbers, and the answer keeps its point.
float (remind): It is a float. The math works the same.
input (teach): input() pauses the program and asks YOU a question. Whatever you type comes back as text, always, even digits.
input (remind): Read the answer with input().
bool (teach): A comparison like signal > 0 comes out True or False. That is a bool. You can store it in a variable like any number. Chain questions with and: the whole thing is True only when both sides are.
bool (remind): Store the comparison itself: it is already True or False.
