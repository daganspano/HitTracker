import hitsData from "../data/hits.json";
import workExperienceData from "../data/workExperience.json";
import softwareSkillsData from "../data/softwareSkills.json";

// --- Types ---

interface HitEntry {
  key: number;
  task: string;
  time: number;
}

interface WeekData {
  week: string;
  hits: HitEntry[];
}

export interface WorkExperience {
  updated: string;
  experience: string[];
}

export interface SoftwareSkills {
  updated: string;
  categories: { category: string; skills: string[] }[];
}

export interface ResumeUpdateError {
  code:
    | "OLLAMA_CONNECTION"
    | "OLLAMA_RESPONSE"
    | "INVALID_JSON"
    | "VALIDATION_FAILED"
    | "MAX_RETRIES";
  message: string;
  attempts?: number;
}

export type ResumeUpdateResult =
  | {
      success: true;
      workExperience: WorkExperience;
      softwareSkills: SoftwareSkills;
    }
  | { success: false; error: ResumeUpdateError };

export type ProgressStep =
  | "collecting-hits"
  | "generating-experience"
  | "generating-skills"
  | "validating"
  | "persisting"
  | "done";

export interface UpdateResumeOptions {
  persist?: boolean;
  onProgress?: (step: ProgressStep, data?: unknown) => void;
  fetchFn?: typeof fetch;
}

// --- Config ---

const OLLAMA_URL = "/ollama/api/generate";
const MODEL = "llama3.2";
const MAX_BULLETS = 12;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

const ROUTINE_HIT_PATTERNS = [
  /^check\s+emails?/i,
  /^hmr\b/i,
  /^timesheet/i,
  /^ninjio/i,
  /^wilson\s+university/i,
];

const PROJECT_NAME_PATTERNS = [
  /\bGuestPass\b/i,
  /\bCloud\s*API\b/i,
  /\bWebApps?\b/i,
  /\bOneConnect\b/i,
  /\bPower\s*BI\b/i,
  /\bProject\s*Directory\b/i,
  /\bKS\s*Stormwater\b/i,
  /\bKansas\s*Stormwater\b/i,
  /\bWilson\s*Railway\b/i,
  /\bRailroad\s*Scheduling\b/i,
  /\bUIC\s*Permit\b/i,
  /\bWilson\s*&?\s*Company\b/i,
  /\bStaffbase\b/i,
];

const TESTING_BULLET_KEYWORDS = ["testing", "peer review", "presenting"];

// --- Exported Helpers ---

export function parseWeekDate(weekStr: string): Date {
  const parts = weekStr.split("/");
  if (parts.length !== 3)
    throw new Error(`Invalid week date format: ${weekStr}`);
  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (isNaN(month) || isNaN(day) || isNaN(year)) {
    throw new Error(`Invalid week date values: ${weekStr}`);
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Out of range week date: ${weekStr}`);
  }
  return new Date(Date.UTC(year, month - 1, day));
}

export function getAllHits(): string[] {
  const allHits: string[] = [];
  for (const week of hitsData as WeekData[]) {
    for (const hit of week.hits) {
      const cleanHit = hit.task.trim();
      if (!cleanHit) continue;
      if (cleanHit.toLowerCase().startsWith("total")) continue;
      if (cleanHit.toLowerCase().startsWith("misses")) continue;
      if (isRoutineHit(cleanHit)) continue;
      allHits.push(cleanHit);
    }
  }
  return allHits;
}

export function getNewHits(lastUpdated: Date): string[] {
  const lastUpdatedUtc = Date.UTC(
    lastUpdated.getFullYear(),
    lastUpdated.getMonth(),
    lastUpdated.getDate(),
  );
  const newHits: string[] = [];
  for (const week of hitsData as WeekData[]) {
    const weekDate = parseWeekDate(week.week);
    if (weekDate.getTime() > lastUpdatedUtc) {
      for (const hit of week.hits) {
        const cleanHit = hit.task.trim();
        if (!cleanHit) continue;
        if (cleanHit.toLowerCase().startsWith("total")) continue;
        if (cleanHit.toLowerCase().startsWith("misses")) continue;
        if (isRoutineHit(cleanHit)) continue;
        newHits.push(cleanHit);
      }
    }
  }
  return newHits;
}

export function extractJsonArray(text: string): string {
  const start = text.indexOf("[");
  if (start === -1) throw new Error("No JSON array found in response");
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "[") depth++;
    else if (text[i] === "]") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error("Unbalanced JSON array in response");
}

export function containsProjectNames(text: string): boolean {
  return PROJECT_NAME_PATTERNS.some((pattern) => pattern.test(text));
}

export function validateBullets(bullets: string[]): string[] {
  const errors: string[] = [];
  if (!Array.isArray(bullets) || bullets.length === 0) {
    errors.push("Bullets must be a non-empty array");
    return errors;
  }
  if (bullets.length > MAX_BULLETS) {
    errors.push(
      `Exceeds max bullet count of ${MAX_BULLETS} (got ${bullets.length})`,
    );
  }
  for (let i = 0; i < bullets.length; i++) {
    const bullet = bullets[i];
    if (typeof bullet !== "string" || bullet.length < 20) {
      errors.push(`Bullet ${i + 1} is too short or invalid`);
      continue;
    }
    const wordCount = bullet.split(/\s+/).length;
    if (wordCount < 8 || wordCount > 65) {
      errors.push(`Bullet ${i + 1} has ${wordCount} words (expected 8-65)`);
    }
    if (containsProjectNames(bullet)) {
      errors.push(`Bullet ${i + 1} contains a project name`);
    }
  }
  if (!hasTestingBullet(bullets)) {
    errors.push("Missing required testing/peer review bullet");
  }
  return errors;
}

// --- Internal Helpers ---

function isRoutineHit(hit: string): boolean {
  return ROUTINE_HIT_PATTERNS.some((pattern) => pattern.test(hit));
}

function hasTestingBullet(bullets: string[]): boolean {
  return bullets.some((bullet) => {
    const lower = bullet.toLowerCase();
    return TESTING_BULLET_KEYWORDS.every((kw) => lower.includes(kw));
  });
}

function stripProjectNames(bullets: string[]): string[] {
  return bullets.map((bullet) => {
    let cleaned = bullet;
    for (const pattern of PROJECT_NAME_PATTERNS) {
      cleaned = cleaned
        .replace(pattern, "")
        .replace(/\s{2,}/g, " ")
        .trim();
    }
    cleaned = cleaned.replace(/,\s*,/g, ",").replace(/,\s*$/g, "").trim();
    return cleaned;
  });
}

async function callOllamaWithRetry(
  prompt: string,
  fetchFn: typeof fetch,
): Promise<
  | { success: true; response: string }
  | { success: false; error: ResumeUpdateError }
> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchFn(OLLAMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        lastError = new Error(
          `Ollama request failed: ${response.status} ${response.statusText}`,
        );
        if (attempt < MAX_RETRIES) {
          await delay(RETRY_BASE_MS * Math.pow(2, attempt - 1));
          continue;
        }
      } else {
        const data = await response.json();
        return { success: true, response: data.response };
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_BASE_MS * Math.pow(2, attempt - 1));
        continue;
      }
    }
  }

  return {
    success: false,
    error: {
      code: "MAX_RETRIES",
      message: lastError?.message ?? "Unknown error after retries",
      attempts: MAX_RETRIES,
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Generation Functions ---

async function generateExperienceBullets(
  allHits: string[],
  styleBullets: string[],
  fetchFn: typeof fetch,
): Promise<
  | { success: true; bullets: string[] }
  | { success: false; error: ResumeUpdateError }
> {
  const prompt = `You are a professional resume writer. Your task is to generate ${MAX_BULLETS} or fewer resume bullet points for a Front-End Developer based on ALL of their work accomplishments ("hits") listed below.

You are creating these bullets FRESH — synthesize patterns across ALL the hits to produce broad, impressive responsibility-level statements. Do NOT create one bullet per hit. Instead, group similar work into single powerful bullets.

REQUIRED CONCEPTS (each must be covered by at least one bullet):
1. Testing software, peer reviewing code, AND presenting your own code for tests and peer reviews
2. Front-end development/design/migration work
3. Communication and project planning

BULLET STRUCTURE (follow precisely for each bullet):
Each bullet is ONE flowing sentence with these parts:
  Part 1: [Present-tense action verb(s) + broad description of what you do]
  Part 2: "to" + [detailed explanation of WHY this work matters — business impact, user benefit, team productivity. Make this SUBSTANTIAL: 15-25 words minimum. This is what impresses hiring managers.]
  Part 3 (optional but encouraged): "utilizing" or "leveraging" + [2-3 tools/technologies woven naturally]

CRITICAL RULES:
- Each bullet is a broad RESPONSIBILITY, not a specific task
- NEVER mention specific project names, product names, or client names — always generalize
- Present-tense action verbs: Developing, Adapting, Communicating, Testing, Creating, Researching, Training, Using, Building, Designing, Managing
- 20-55 words per bullet
- Maximum ${MAX_BULLETS} bullets total

PART 2 QUALITY GUIDE (the "to [benefit]" section):
- BAD: "to track usage" / "to improve performance" / "to maintain applications" (too vague/short)
- GOOD: "to ensure efficient access and productivity for employees and guests, reducing onboarding friction and maintaining consistent user experiences across platforms"
- GOOD: "to maintain high code quality standards, catch defects early in the development lifecycle, and foster a collaborative engineering culture"
- GOOD: "to ensure the team adopts the most effective and maintainable solutions, reducing technical debt and accelerating future development cycles"

STYLE EXAMPLES (use these as tone/structure reference):
${styleBullets.map((b) => `- "${b}"`).join("\n")}

ALL WORK ACCOMPLISHMENTS TO SYNTHESIZE:
${allHits.map((h) => `- ${h}`).join("\n")}

Respond with ONLY a JSON array of strings (${MAX_BULLETS} or fewer items). No markdown, no explanation, just the JSON array.`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const result = await callOllamaWithRetry(prompt, fetchFn);
    if (!result.success) return result;

    try {
      const jsonStr = extractJsonArray(result.response);
      let bullets = JSON.parse(jsonStr) as string[];
      bullets = bullets.slice(0, MAX_BULLETS);

      // Remove garbage/truncated bullets
      bullets = bullets.filter(
        (b) => typeof b === "string" && b.split(/\s+/).length >= 8,
      );

      // Strip any project names that leaked through
      bullets = stripProjectNames(bullets);

      // Ensure testing bullet concept exists
      if (!hasTestingBullet(bullets)) {
        const fallbackTesting =
          "Testing and code peer reviewing software, as well as preparing and presenting my own code to tests and code peer reviews, to maintain high code quality standards, catch defects early in the development lifecycle, and foster a collaborative engineering culture";
        if (bullets.length >= MAX_BULLETS) {
          bullets[bullets.length - 1] = fallbackTesting;
        } else {
          bullets.push(fallbackTesting);
        }
      }

      return { success: true, bullets };
    } catch (err) {
      if (attempt < MAX_RETRIES) continue;
      return {
        success: false,
        error: {
          code: "INVALID_JSON",
          message: `Failed to parse experience bullets: ${err instanceof Error ? err.message : String(err)}`,
        },
      };
    }
  }

  return {
    success: false,
    error: {
      code: "MAX_RETRIES",
      message: "Failed to generate valid experience bullets after retries",
      attempts: MAX_RETRIES,
    },
  };
}

async function generateSoftwareSkills(
  existingCategories: { category: string; skills: string[] }[],
  newHits: string[],
  fetchFn: typeof fetch,
): Promise<
  | { success: true; categories: { category: string; skills: string[] }[] }
  | { success: false; error: ResumeUpdateError }
> {
  const prompt = `You are a professional resume writer. Below are the current categorized software skills for a Front-End Developer, followed by new work accomplishments ("hits").

Your task:
1. Extract any software, tools, languages, frameworks, or platforms mentioned in the new hits.
2. Add them to the appropriate existing category, or create a new category if needed.
3. Do NOT remove any existing skills - only add new ones.
4. Keep skill names properly capitalized and concise.
5. Do NOT include specific project names or client names as skills.
6. Acronyms like MERN, LAMP, MEAN, etc. are technology STACKS, not languages. Do NOT list them as languages. Instead, list their individual components (e.g. MongoDB, Express, React, Node.js).
7. HTML, CSS, SQL, PostgreSQL, and EJS ARE valid languages/technologies and MUST be preserved if they exist in the current skills.

EXISTING SKILLS:
${existingCategories.map((c) => `${c.category}: ${c.skills.join(", ")}`).join("\n")}

NEW HITS:
${newHits.map((h) => `- ${h}`).join("\n")}

Respond with ONLY a JSON array of objects, each with "category" (string) and "skills" (string array). Include ALL categories and skills (existing + new). No markdown, no explanation, just the JSON array.`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const result = await callOllamaWithRetry(prompt, fetchFn);
    if (!result.success) return result;

    try {
      const jsonStr = extractJsonArray(result.response);
      const categories = JSON.parse(jsonStr) as {
        category: string;
        skills: string[];
      }[];

      if (!Array.isArray(categories) || categories.length === 0) {
        if (attempt < MAX_RETRIES) continue;
        return {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "Skills categories array is empty",
          },
        };
      }
      let valid = true;
      for (const cat of categories) {
        if (!cat.category || !Array.isArray(cat.skills)) {
          valid = false;
          break;
        }
        cat.skills = cat.skills.filter((skill) => !containsProjectNames(skill));
      }
      if (!valid) {
        if (attempt < MAX_RETRIES) continue;
        return {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "Invalid category structure in response",
          },
        };
      }

      return { success: true, categories };
    } catch (err) {
      if (attempt < MAX_RETRIES) continue;
      return {
        success: false,
        error: {
          code: "INVALID_JSON",
          message: `Failed to parse software skills: ${err instanceof Error ? err.message : String(err)}`,
        },
      };
    }
  }

  return {
    success: false,
    error: {
      code: "MAX_RETRIES",
      message: "Failed to generate valid software skills after retries",
      attempts: MAX_RETRIES,
    },
  };
}

// --- Main Export ---

export async function updateResume(
  options: UpdateResumeOptions = {},
): Promise<ResumeUpdateResult> {
  const { persist = false, onProgress, fetchFn = fetch } = options;

  onProgress?.("collecting-hits");

  // Collect ALL hits for fresh bullet generation
  const allHits = getAllHits();

  if (allHits.length === 0) {
    onProgress?.("done", { hitsFound: 0 });
    return {
      success: true,
      workExperience: workExperienceData as WorkExperience,
      softwareSkills: softwareSkillsData as SoftwareSkills,
    };
  }

  // Get only new hits for incremental software skills update
  const lastUpdated = new Date(softwareSkillsData.updated);
  const newHits = getNewHits(lastUpdated);
  const now = new Date();

  onProgress?.("generating-experience", { totalHits: allHits.length });

  // Generate bullets fresh from ALL hits, using existing bullets as style guide only
  const experienceResult = await generateExperienceBullets(
    allHits,
    workExperienceData.experience,
    fetchFn,
  );
  if (!experienceResult.success) return experienceResult;

  onProgress?.("generating-skills", { newHitsCount: newHits.length });

  // Software skills: incremental update (only add new skills from recent hits)
  let updatedSoftwareSkills: SoftwareSkills;
  if (newHits.length > 0) {
    const skillsResult = await generateSoftwareSkills(
      softwareSkillsData.categories,
      newHits,
      fetchFn,
    );
    if (!skillsResult.success) return skillsResult;
    updatedSoftwareSkills = {
      updated: now.toISOString(),
      categories: skillsResult.categories,
    };
  } else {
    updatedSoftwareSkills = softwareSkillsData as SoftwareSkills;
  }

  onProgress?.("validating");

  const validationErrors = validateBullets(experienceResult.bullets);
  if (validationErrors.length > 0) {
    return {
      success: false,
      error: {
        code: "VALIDATION_FAILED",
        message: `Bullet validation failed: ${validationErrors.join("; ")}`,
      },
    };
  }

  const updatedWorkExperience: WorkExperience = {
    updated: now.toISOString(),
    experience: experienceResult.bullets,
  };

  if (persist) {
    onProgress?.("persisting");
    // Persistence writes handled by caller or future implementation
  }

  onProgress?.("done", {
    bulletsGenerated: experienceResult.bullets.length,
    categoriesGenerated: updatedSoftwareSkills.categories.length,
  });

  return {
    success: true,
    workExperience: updatedWorkExperience,
    softwareSkills: updatedSoftwareSkills,
  };
}

export async function saveResume(
  workExperience: WorkExperience,
  softwareSkills: SoftwareSkills,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("/api/save-resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workExperience, softwareSkills }),
    });
    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.error || "Failed to save" };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
