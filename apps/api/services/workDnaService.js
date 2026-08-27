/**
 * Work DNA Service
 * Converted from TypeScript to JavaScript for integration with main API
 */

function deriveWorkDNA(input) {
  const skills = (input.skills || []).map((s) => s.name).filter(Boolean);
  const evidenceGaps = (input.skills || [])
    .filter((s) => !s.proficiency)
    .map((s) => `Verify proficiency: ${s.name}`);

  const senior = (input.roles || []).some((r) => (r.years ?? 0) >= 8);
  const archetypes = [
    senior ? "EXPERIENCED_PROFESSIONAL" : "DEVELOPING_PROFESSIONAL",
    (input.experiences || []).length >= 5 ? "PROBLEM_SOLVER" : "EXPERIENCE_BUILDER",
  ];

  return {
    archetypes,
    skillClusters: [
      {
        name: "CORE_SKILLS",
        skills,
      },
    ],
    evidenceGaps,
    recommendedNextActions: [
      "Attach evidence to high-value skills.",
      "Complete a structured assessment for critical skills.",
      "Compare verified skills with current opportunities.",
    ],
  };
}

module.exports = {
  deriveWorkDNA
};