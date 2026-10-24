const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { DRILLS } = require("../.test-build/exercises.js");
const { demoForDrill } = require("../.test-build/drill-demos.js");
const { evidenceForCategory } = require("../.test-build/exercise-evidence.js");

test("every catalog drill has an existing movement GIF and category references", () => {
  assert.equal(DRILLS.length, 111);
  for (const drill of DRILLS) {
    const demo = demoForDrill(drill);
    assert.ok(demo.src.endsWith(".gif"), `${drill.id} should point to a GIF`);
    assert.ok(fs.existsSync(path.join(process.cwd(), "public", demo.src.slice(1))), `${drill.id}: ${demo.src} missing`);
    const evidence = evidenceForCategory(drill.category);
    assert.ok(evidence.note.length > 0, `${drill.id} has no category note`);
    assert.ok(evidence.references.length > 0, `${drill.id} has no references`);
  }
});
