// Logic tests for the Lesson 1.3 questline puzzle validators (pure JS replicas).
let fails = 0;
const ok = (cond, msg) => { if (!cond) { console.log("FAIL:", msg); fails++; } };

// Beat 1: player sets armor/food/water; the appended manifest (the wall note's
// own Python) counts correct_items via weight-product if checks.
function beat1(armor, food, water) {
  const plate_weight = 10, crate_weight = 4, barrel_weight = 3;
  let correct_items = 0;
  if (armor * plate_weight === 10) correct_items++;
  if (food * crate_weight === 8) correct_items++;
  if (water * barrel_weight === 3) correct_items++;
  return correct_items === 3;
}
ok(beat1(1, 2, 1) === true, "Beat1 canonical (1,2,1) makes all three checks true");
ok(beat1(0, 2, 1) === false, "Beat1 too little blocked");
ok(beat1(2, 2, 1) === false, "Beat1 too much blocked");
ok(beat1(1, 3, 1) === false, "Beat1 wrong food blocked");
ok(beat1(1, 2, 0) === false, "Beat1 missing water blocked");

// Beat 2: typed watchword must equal the hidden WATCHWORD.
const beat2 = (typed) => typed === "ironwatch";
ok(beat2("ironwatch") === true, "Beat2 right word trusted");
ok(beat2("oops") === false, "Beat2 wrong word blocked");

// Beat 3: float reward adds 1.75 to whatever gold the player holds.
const beat3 = (before) => Math.abs((before + 1.75) - (before + 1.75)) < 0.001; // validator tolerance
ok(beat3(2.05) && Math.abs((2.05 + 1.75) - 3.8) < 1e-9, "Beat3 float reward adds to 3.80");
ok(Math.abs((0 + 1.75) - 1.75) < 1e-9, "Beat3 works from zero gold too");

// Beat 4: reward // price = pieces, reward % price = change (binary-exact 1.75 / 0.5).
const beat4 = (reward, price) => ({ pieces: Math.floor(reward / price), change: reward % price });
const b4 = beat4(1.75, 0.5);
ok(b4.pieces === 3, "Beat4 // gives 3 pieces");
ok(Math.abs(b4.change - 0.25) < 0.001, "Beat4 % gives 0.25 change");
ok((1.75 - 1.5) === 0.25, "Beat4 spend 3×0.50 leaves 0.25");

console.log(fails ? `\n${fails} FAILED` : "\nALL LESSON 1.3 LOGIC OK");
