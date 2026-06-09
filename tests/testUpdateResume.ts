/// <reference types="node" />
import {
  updateResume,
  parseWeekDate,
  getNewHits,
  getAllHits,
  extractJsonArray,
  containsProjectNames,
  validateBullets,
} from "../src/functions/updateResume";

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "llama3.2";

// --- TESTS ---

let totalPass = 0;
let totalFail = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    totalPass++;
  } else {
    totalFail++;
    console.log(`  FAIL: ${message}`);
  }
}

// === TEST 1: parseWeekDate (UTC-safe) ===
console.log("=== TEST 1: parseWeekDate ===\n");

const d1 = parseWeekDate("1/6/2025");
assert(d1.getUTCFullYear() === 2025, "Year should be 2025");
assert(d1.getUTCMonth() === 0, "Month should be January (0)");
assert(d1.getUTCDate() === 6, "Day should be 6");

const d2 = parseWeekDate("12/30/2024");
assert(d2.getUTCFullYear() === 2024, "Year should be 2024");
assert(d2.getUTCMonth() === 11, "Month should be December (11)");
assert(d2.getUTCDate() === 30, "Day should be 30");

// Invalid dates
let threw = false;
try {
  parseWeekDate("invalid");
} catch {
  threw = true;
}
assert(threw, "Should throw on invalid date format");

threw = false;
try {
  parseWeekDate("13/1/2025");
} catch {
  threw = true;
}
assert(threw, "Should throw on month out of range");

threw = false;
try {
  parseWeekDate("1/32/2025");
} catch {
  threw = true;
}
assert(threw, "Should throw on day out of range");

console.log(`  Date parsing: ${totalPass} passed, ${totalFail} failed\n`);

// === TEST 2: extractJsonArray ===
console.log("=== TEST 2: extractJsonArray ===\n");

const passedBefore = totalPass;
assert(
  extractJsonArray('Some text ["a", "b"] more text') === '["a", "b"]',
  "Should extract simple array",
);
assert(
  extractJsonArray('[["nested"], "flat"]') === '[["nested"], "flat"]',
  "Should handle nested arrays",
);
threw = false;
try {
  extractJsonArray("no array here");
} catch {
  threw = true;
}
assert(threw, "Should throw when no array found");

threw = false;
try {
  extractJsonArray("[unclosed");
} catch {
  threw = true;
}
assert(threw, "Should throw on unbalanced array");

console.log(`  extractJsonArray: ${totalPass - passedBefore} passed\n`);

// === TEST 3: containsProjectNames ===
console.log("=== TEST 3: containsProjectNames ===\n");

const passedBefore3 = totalPass;
assert(
  containsProjectNames("Working on GuestPass features"),
  "Should detect GuestPass",
);
assert(
  containsProjectNames("Cloud API integration"),
  "Should detect Cloud API",
);
assert(containsProjectNames("OneConnect widget"), "Should detect OneConnect");
assert(containsProjectNames("Power BI dashboards"), "Should detect Power BI");
assert(
  containsProjectNames("Project Directory updates"),
  "Should detect Project Directory",
);
assert(
  containsProjectNames("KS Stormwater migration"),
  "Should detect KS Stormwater",
);
assert(
  containsProjectNames("Wilson Railway tailwind"),
  "Should detect Wilson Railway",
);
assert(
  !containsProjectNames("Developing front-end applications"),
  "Should not flag generic text",
);
assert(
  !containsProjectNames("Building reusable component libraries"),
  "Should not flag generic text 2",
);
assert(
  !containsProjectNames("Building Retool applications and dashboards"),
  "Should not flag Retool (legitimate tool)",
);

console.log(`  containsProjectNames: ${totalPass - passedBefore3} passed\n`);

// === TEST 4: validateBullets ===
console.log("=== TEST 4: validateBullets ===\n");

const passedBefore4 = totalPass;
const goodBullets = [
  "Developing, designing, and migrating front-end applications to ensure efficient access and productivity for employees and guests, utilizing custom components, responsive and accessible designs, and Material UI's components and features",
  "Adapting code to software and API updates to maintain up-to-date, secure, and performant applications that meet evolving business requirements and industry standards",
  "Testing and code peer reviewing software, as well as preparing and presenting my own code to tests and code peer reviews, to maintain high code quality standards and catch defects early",
];
assert(
  validateBullets(goodBullets).length === 0,
  "Good bullets should pass validation",
);

const badBullets = ["short"];
assert(validateBullets(badBullets).length > 0, "Too-short bullets should fail");

const projectNameBullets = [
  "Developing the GuestPass interface to ensure efficient access for employees and guests, utilizing custom responsive components and accessible design patterns across the platform",
  "Testing and code peer reviewing software, as well as preparing and presenting my own code to tests and code peer reviews, to maintain high standards",
];
assert(
  validateBullets(projectNameBullets).some((e) => e.includes("project name")),
  "Should catch project names in bullets",
);

const noTestingBullets = [
  "Developing, designing, and migrating front-end applications to ensure efficient access and productivity for employees and guests, utilizing custom components and responsive designs",
  "Adapting code to software and API updates to maintain up-to-date, secure, and performant applications that meet evolving business requirements and industry standards",
];
assert(
  validateBullets(noTestingBullets).some((e) => e.includes("testing")),
  "Should flag missing testing bullet",
);

console.log(`  validateBullets: ${totalPass - passedBefore4} passed\n`);

// === TEST 5: getNewHits filters routine tasks ===
console.log("=== TEST 5: getNewHits routine filtering ===\n");

const passedBefore5 = totalPass;
const oldDate = new Date("2020-01-01T00:00:00.000Z");
const hits = getNewHits(oldDate);
const hitsLower = hits.map((h) => h.toLowerCase());

assert(
  !hitsLower.some((h) => h.startsWith("check email")),
  "Should filter out 'check emails'",
);
assert(
  !hitsLower.some((h) => /^hmr\b/.test(h)),
  "Should filter out HMR entries",
);
assert(
  !hitsLower.some((h) => h.startsWith("total")),
  "Should filter out totals",
);
assert(
  !hitsLower.some((h) => h.startsWith("misses")),
  "Should filter out misses",
);
assert(hits.length > 0, "Should still have some hits remaining");

console.log(`  getNewHits filtering: ${totalPass - passedBefore5} passed\n`);

// === TEST 5b: getAllHits collects from all weeks ===
console.log("=== TEST 5b: getAllHits ===\n");

const passedBefore5b = totalPass;
const allHits = getAllHits();
const recentHits = getNewHits(new Date("2025-06-01T00:00:00.000Z"));
assert(
  allHits.length > recentHits.length,
  "getAllHits should return more hits than getNewHits with recent cutoff",
);
assert(allHits.length > 50, "getAllHits should have many hits from all weeks");
assert(
  !allHits.some((h) => h.toLowerCase().startsWith("total")),
  "getAllHits should filter out totals",
);
assert(
  !allHits.some((h) => h.toLowerCase().startsWith("misses")),
  "getAllHits should filter out misses",
);

console.log(`  getAllHits: ${totalPass - passedBefore5b} passed\n`);

// === TEST 6: Ollama connectivity ===
console.log("=== TEST 6: Ollama connectivity ===\n");

async function testOllamaConnection(): Promise<boolean> {
  try {
    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt: "Respond with exactly: OK",
        stream: false,
      }),
    });
    assert(response.ok, "Ollama should return 200 OK");
    const data = await response.json();
    assert(
      typeof data.response === "string" && data.response.length > 0,
      "Ollama should return a non-empty response string",
    );
    return true;
  } catch (err) {
    assert(false, `Ollama connection failed: ${err}`);
    return false;
  }
}

// === TEST 7: Ollama returns valid JSON array ===
console.log("=== TEST 7: Ollama JSON output ===\n");

async function testOllamaJsonOutput(): Promise<void> {
  try {
    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt:
          'Return ONLY a JSON array of 3 strings about web development. No markdown, no explanation, just the JSON array. Example: ["item1", "item2", "item3"]',
        stream: false,
      }),
    });
    const data = await response.json();
    const jsonMatch = data.response.match(/\[[\s\S]*\]/);
    assert(jsonMatch !== null, "Response should contain a JSON array");
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      assert(Array.isArray(parsed), "Parsed result should be an array");
      assert(parsed.length > 0, "Array should not be empty");
      assert(
        parsed.every((item: unknown) => typeof item === "string"),
        "All items should be strings",
      );
    }
  } catch (err) {
    assert(false, `JSON output test failed: ${err}`);
  }
}

// === TEST 8: Full updateResume integration ===
console.log("=== TEST 8: Full updateResume integration ===\n");

async function testUpdateResume(): Promise<void> {
  const progressSteps: string[] = [];
  const ollamaFetch: typeof fetch = (input, init) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    const directUrl = url.replace("/ollama/api/generate", `${OLLAMA_URL}`);
    return fetch(directUrl, init);
  };
  try {
    const result = await updateResume({
      onProgress: (step) => progressSteps.push(step),
      persist: false,
      fetchFn: ollamaFetch,
    });

    if (!result.success) {
      console.log(
        `  Integration test error: [${result.error.code}] ${result.error.message}`,
      );
    }
    assert(result.success === true, "Should return success: true");
    if (!result.success) return;

    // Work Experience checks
    assert(result.workExperience !== undefined, "Should return workExperience");
    assert(
      typeof result.workExperience.updated === "string",
      "workExperience.updated should be a string",
    );
    assert(
      Array.isArray(result.workExperience.experience),
      "workExperience.experience should be an array",
    );
    assert(
      result.workExperience.experience.length >= 5,
      "Should have at least 5 experience bullets",
    );
    assert(
      result.workExperience.experience.length <= 12,
      "Should have at most 12 experience bullets",
    );
    assert(
      result.workExperience.experience.every(
        (b: string) => typeof b === "string" && b.length > 20,
      ),
      "All bullets should be non-trivial strings",
    );

    // No project names
    assert(
      result.workExperience.experience.every(
        (b: string) => !containsProjectNames(b),
      ),
      "No bullets should contain project names",
    );

    // Testing bullet exists
    assert(
      result.workExperience.experience.some((b: string) => {
        const lower = b.toLowerCase();
        return (
          lower.includes("testing") &&
          lower.includes("peer review") &&
          lower.includes("presenting")
        );
      }),
      "Should contain a testing/peer review bullet",
    );

    // Software Skills checks
    assert(result.softwareSkills !== undefined, "Should return softwareSkills");
    assert(
      typeof result.softwareSkills.updated === "string",
      "softwareSkills.updated should be a string",
    );
    assert(
      Array.isArray(result.softwareSkills.categories),
      "softwareSkills.categories should be an array",
    );
    assert(
      result.softwareSkills.categories.length >= 3,
      "Should have at least 3 skill categories",
    );
    assert(
      result.softwareSkills.categories.every(
        (c: { category: string; skills: string[] }) =>
          typeof c.category === "string" && Array.isArray(c.skills),
      ),
      "Each category should have category name and skills array",
    );

    // Timestamp should be recent
    const updatedDate = new Date(result.workExperience.updated);
    const now = new Date();
    const diffMs = now.getTime() - updatedDate.getTime();
    assert(diffMs < 60000, "Updated timestamp should be within last minute");

    // Progress callback received steps
    assert(progressSteps.length > 0, "onProgress should have been called");
    assert(
      progressSteps.includes("collecting-hits"),
      "Should report collecting-hits step",
    );
    assert(
      progressSteps.includes("generating-experience"),
      "Should report generating-experience step",
    );
    assert(progressSteps.includes("done"), "Should report done step");

    console.log(
      `\n  Generated ${result.workExperience.experience.length} experience bullets`,
    );
    console.log(
      `  Generated ${result.softwareSkills.categories.length} skill categories`,
    );
    console.log(`  Progress steps received: ${progressSteps.join(" -> ")}`);
  } catch (err) {
    assert(false, `updateResume threw unexpectedly: ${err}`);
  }
}

// === TEST 9: updateResume with mock fetch (error handling) ===
console.log("=== TEST 9: Structured error on fetch failure ===\n");

async function testErrorHandling(): Promise<void> {
  const failingFetch = async () => {
    throw new Error("Network error");
  };

  const result = await updateResume({
    fetchFn: failingFetch as unknown as typeof fetch,
  });

  assert(
    result.success === false,
    "Should return success: false on network error",
  );
  if (!result.success) {
    assert(
      result.error.code === "MAX_RETRIES",
      "Error code should be MAX_RETRIES",
    );
    assert(result.error.attempts === 3, "Should have attempted 3 times");
    assert(
      result.error.message.includes("Network error"),
      "Should include original error message",
    );
  }
}

// --- Run all tests ---

async function runAll() {
  const connected = await testOllamaConnection();
  if (connected) {
    await testOllamaJsonOutput();
    await testUpdateResume();
  } else {
    console.log("  Skipping Ollama-dependent tests (not connected)\n");
  }
  await testErrorHandling();

  console.log(`\n=== RESULTS: ${totalPass} passed, ${totalFail} failed ===`);
  process.exit(totalFail > 0 ? 1 : 0);
}

runAll();
