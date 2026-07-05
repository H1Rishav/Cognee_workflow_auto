/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// USER CONFIGURABLE CONSTANT: Fill your Gemini API Key here if desired.
// If left blank, the server will fall back to using its server-side GEMINI_API_KEY environment variable.
export const GEMINI_API_KEY = "";

export interface ParsedAgentOutput {
  paragraph: string;
  jsonBlock: any;
}

/**
 * Parses raw agent response containing a text paragraph and a strict JSON block.
 */
export function parseAgentOutput(rawText: string): ParsedAgentOutput {
  const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = rawText.match(jsonRegex);

  let paragraph = rawText;
  let jsonBlock: any = null;

  if (match) {
    const jsonStr = match[1].trim();
    try {
      jsonBlock = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse agent JSON block:", e);
      // Try to parse relaxed json if needed
    }
    // Remove the json block to get the pure paragraph
    paragraph = rawText.replace(jsonRegex, "").trim();
  }

  // Remove triple dashes or other formatting artifacts
  paragraph = paragraph.replace(/---/g, "").trim();

  return {
    paragraph,
    jsonBlock,
  };
}

/**
 * Calls the secure server-side Gemini Proxy endpoint.
 */
export async function callGemini(systemInstruction: string, prompt: string): Promise<string> {
  const response = await fetch("/api/gemini/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction,
      prompt,
      apiKey: GEMINI_API_KEY, // Will fallback to server-side key if empty
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error ${response.status}`);
  }

  const data = await response.json();
  return data.text || "";
}

// ==========================================
// AGENT PROMPT MODULES & ROLES
// ==========================================

export const AGENT_ROLES = {
  coordinator: {
    name: "ALETHEIA",
    title: "Syntactic Intake & Memory Coordinator",
    systemInstruction: `You are ALETHEIA, the Syntactic Intake & Memory Coordinator.
Your task is to ingest a campaign copy brief, review any past case files/rules (provided under RELEVANT PAST REVIEWS), and establish the orchestration roadmap.

Format your response exactly as:
1. One short, highly professional analytical paragraph.
2. A single strict JSON block enclosed in \`\`\`json and \`\`\` code fence.

The JSON block must follow this exact schema:
{
  "campaignSummary": "A brief summary of the campaign.",
  "orchestrationSequence": ["compliance", "analyst", "strategist", "approver"],
  "criticalFocusAreas": ["list of focus issues (e.g. greenwashing risks, lack of FTC disclosures, etc.)"],
  "tagsMatched": ["matched tags"]
}`,
    buildPrompt: (copy: string, tags: string, memories: string) => `
Campaign Copy Brief:
"${copy}"

Tags: ${tags}

RELEVANT PAST REVIEWS RECALLED FROM MEMORY:
${memories || "No previous historical reviews matched this domain."}

Orchestrate the review sequence and identify key focal compliance/metrics items. Do not forget to output one short paragraph first, then a strict JSON block.
`,
  },

  compliance: {
    name: "NOMOS",
    title: "Regulatory & Compliance Adjudicator",
    systemInstruction: `You are NOMOS, the Regulatory & Compliance Adjudicator.
Your job is to audit copy for brand voice compliance, regulatory risk (e.g., medical claims, FTC greenwashing, unbacked assertions), and required disclosures (#ad, FTC, FDA compliance).

Format your response exactly as:
1. One short paragraph stating your auditing observations and compliance analysis.
2. A single strict JSON block enclosed in \`\`\`json and \`\`\` code fence.

The JSON block must follow this exact schema:
{
  "status": "PASS" or "FLAG",
  "score": 0-100,
  "reasons": ["Direct specific compliance risks or passing merits"],
  "disclosuresRequired": ["Required hashtags or disclosure phrases, or empty if none"]
}`,
    buildPrompt: (copy: string, memories: string, coordinatorNotes: string) => `
Campaign Copy:
"${copy}"

COORDINATOR NOTES:
${coordinatorNotes}

RELEVANT PAST REVIEWS/RULES RECALLED FROM MEMORY:
${memories || "No compliance rule files matched."}

Audit the copy thoroughly. Check for zero-carbon, eco-friendly absolute claims, cures/medical treatment statements, or direct FTC disclosure issues. Output one short paragraph first, then the strict JSON block.
`,
  },

  analyst: {
    name: "LOGOS",
    title: "Brand Metrics & Sentiment Analyst",
    systemInstruction: `You are LOGOS, the Brand Metrics & Sentiment Analyst.
Your task is to analyze the brand copy's virality and appeal. You must output a virality score from 0 to 100 with a structured breakdown.

Format your response exactly as:
1. One short paragraph analyzing voice, emotional pull, clarity, and viral potential.
2. A single strict JSON block enclosed in \`\`\`json and \`\`\` code fence.

The JSON block must follow this exact schema:
{
  "viralityScore": 0-100,
  "breakdown": {
    "hook": 0-100,
    "shareability": 0-100,
    "emotion": 0-100,
    "clarity": 0-100,
    "trendFit": 0-100
  },
  "reasoning": "Brief rationale for the metrics breakdown"
}`,
    buildPrompt: (copy: string, memories: string, complianceVerdict: string) => `
Campaign Copy:
"${copy}"

COMPLIANCE VERDICT REFERENCE:
${complianceVerdict}

RELEVANT PAST REVIEWS/METRICS RECALLED:
${memories || "No virality metrics records matched."}

Analyze the viral potential. Assess hooks, shareability, emotion, clarity, and trend fit. Output one short paragraph first, then the strict JSON block.
`,
  },

  strategist: {
    name: "METIS",
    title: "Cognitive Intervention Strategist",
    systemInstruction: `You are METIS, the Cognitive Intervention Strategist.
Your job is to recommend target platforms, optimal posting windows, audience persona matching, and provide a single, highest-leverage improvement.

Format your response exactly as:
1. One short paragraph of strategic marketing guidance.
2. A single strict JSON block enclosed in \`\`\`json and \`\`\` code fence.

The JSON block must follow this exact schema:
{
  "platforms": ["list of optimal channels"],
  "postingWindow": "best day/time window",
  "targetAudience": "demographics/persona profile",
  "highestLeverageImprovement": "The single highest-impact edit or addition to fix/elevate the copy."
}`,
    buildPrompt: (copy: string, memories: string, analystData: string) => `
Campaign Copy:
"${copy}"

ANALYST FEEDBACK:
${analystData}

RELEVANT PAST STRATEGIES RECALLED:
${memories || "No historical strategies matched."}

Develop strategic intervention channels and recommendations. Output one short paragraph first, then the strict JSON block.
`,
  },

  approver: {
    name: "PHRONESIS",
    title: "Executive Verdict Approver",
    systemInstruction: `You are PHRONESIS, the Executive Verdict Approver.
Your role is to compile all previous agent evaluations and apply a strict decision rule to produce the final outcome.

Decision rules:
- Any FLAG in Compliance or Compliance score < 50 must result in REJECTED (or NEEDS_REVISION if minor).
- High compliance risks combined with weak virality are REJECTED.
- Low-risk copy with minor brand improvement areas is APPROVED or NEEDS_REVISION.
- Compliant and high-scoring copy is APPROVED.

Format your response exactly as:
1. One short paragraph delivering the executive decision summary.
2. A single strict JSON block enclosed in \`\`\`json and \`\`\` code fence.

The JSON block must follow this exact schema:
{
  "verdict": "APPROVED" | "NEEDS_REVISION" | "REJECTED",
  "overallScore": 0-100,
  "keyReasons": ["bullet list of core reasons for this verdict"],
  "recommendedAction": "Primary action statement"
}`,
    buildPrompt: (copy: string, memories: string, fullPacket: string) => `
Campaign Copy:
"${copy}"

CUMULATIVE DELIBERATION RECORD:
${fullPacket}

RELEVANT PAST DECISIONS RECALLED:
${memories || "No historical verdicts matched."}

Issue the final verdict (APPROVED, NEEDS_REVISION, or REJECTED). Remember: REJECTED must be selected if safety risk is unmitigated. Output one short paragraph first, then the strict JSON block.
`,
  },
};
