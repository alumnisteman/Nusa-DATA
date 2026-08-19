export interface OpportunityCandidate {
  id: string;
  title: string;
  type: string;
  skills: string[];
  sourceName: string;
  sourceUrl: string;
}

export function matchOpportunities(
  userSkills: string[],
  opportunities: OpportunityCandidate[],
) {
  const normalized = new Set(userSkills.map((x) => x.toLowerCase()));

  return opportunities
    .map((opportunity) => {
      const matched = opportunity.skills.filter((skill) =>
        normalized.has(skill.toLowerCase()),
      );

      const score =
        opportunity.skills.length === 0
          ? 0
          : Math.round((matched.length / opportunity.skills.length) * 100);

      return {
        opportunity,
        score,
        matchedSkills: matched,
      };
    })
    .sort((a, b) => b.score - a.score);
}
