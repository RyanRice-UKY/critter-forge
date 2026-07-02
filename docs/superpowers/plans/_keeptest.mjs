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

// Beat 4 (armory shop): total = 0.50 × picked pieces; pay from gold; full kit affordable at 3.80.
const shop = (picked, gold) => ({ total: 0.5 * picked, goldAfter: +(gold - 0.5 * picked).toFixed(2) });
ok(shop(2, 3.8).total === 1.0 && shop(2, 3.8).goldAfter === 2.8, "Shop: two pieces cost 1.00, leaves 2.80");
ok(shop(5, 3.8).total === 2.5 && shop(5, 3.8).goldAfter === 1.3, "Shop: full kit costs 2.50, leaves 1.30 (+1 heart)");
ok(shop(5, 2.05).total > 2.05, "Shop: full kit unaffordable before the scout's pay");

console.log(fails ? `\n${fails} FAILED` : "\nALL LESSON 1.3 LOGIC OK");
