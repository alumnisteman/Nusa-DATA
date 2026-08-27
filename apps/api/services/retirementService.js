/**
 * Retirement/Second Life Service
 * Converted from TypeScript to JavaScript for integration with main API
 */

function buildRetirementPlan(input) {
  const deepExperience = (input.yearsExperience || 0) >= 15;

  return {
    paths: [
      {
        type: "MENTORING",
        rationale: deepExperience
          ? "High accumulated experience is suitable for structured mentoring."
          : "Experience can be packaged into focused mentoring.",
      },
      {
        type: "CONSULTING",
        rationale: "Professional experience can be converted into problem-solving services.",
      },
      {
        type: "TRAINING",
        rationale: "Skills and experience can be converted into practical training.",
      },
      {
        type: "KNOWLEDGE_ASSET",
        rationale: "Documented experience can become reusable knowledge assets.",
      },
      {
        type: "AI_WORK",
        rationale: "Verified domain expertise can be evaluated for human-in-the-loop AI tasks.",
      },
      {
        type: "BUSINESS",
        rationale: "Skills and interests can be evaluated against real market opportunities.",
      },
    ],
    knowledgeAssets: (input.skills || []).map((skill) => `Potential knowledge asset: ${skill}`),
  };
}

module.exports = {
  buildRetirementPlan
};