/**
 * PHK Recovery Service
 * Converted from TypeScript to JavaScript for integration with main API
 */

function buildRecoveryOptions(input) {
  const skillCount = input.skills ? input.skills.length : 0;
  const seniority = Math.min(30, input.experienceYears || 0);

  const options = [
    {
      type: "JOB",
      score: Math.min(100, 45 + skillCount * 5 + seniority),
      reasons: ["Existing skills and experience can be mapped to current opportunities."],
      requiredSkills: input.skills || [],
    },
    {
      type: "CONSULTING",
      score: Math.min(100, 35 + seniority * 2),
      reasons: ["Deep experience can be converted into advisory work."],
      requiredSkills: (input.skills || []).slice(0, 8),
    },
    {
      type: "MENTORING",
      score: Math.min(100, 30 + seniority * 2),
      reasons: ["Long experience can support knowledge transfer."],
      requiredSkills: (input.skills || []).slice(0, 8),
    },
    {
      type: "AI_WORK",
      score: Math.min(100, 35 + skillCount * 4),
      reasons: ["Verified domain knowledge can be evaluated for human-in-the-loop AI work."],
      requiredSkills: input.skills || [],
    },
  ];

  return options.sort((a, b) => b.score - a.score);
}

module.exports = {
  buildRecoveryOptions
};