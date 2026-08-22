const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * ============================================================
 * NUSA-DATA AI Matchmaker Engine — Week 6 Grand Finale
 * ============================================================
 * Algoritma scoring multi-dimensi (6 pilar) yang mencocokkan
 * ProjectTask requirements dengan profil User secara cerdas.
 *
 * Arsitektur: Plug-and-play — jika GEMINI_API_KEY tersedia,
 * sistem akan menggunakan AI evaluation; jika tidak, fallback
 * ke scoring heuristik internal.
 * ============================================================
 */

// ==========================================
// SCORING WEIGHTS (bobot per dimensi)
// ==========================================
const WEIGHTS = {
  skillMatch:       0.30,  // Kecocokan skill dengan requiredSkills task
  experienceDepth:  0.20,  // Kedalaman & relevansi pengalaman
  trustLevel:       0.15,  // Level verifikasi pengalaman
  workDnaAlignment: 0.15,  // Kecocokan WorkDNA (strengths, industry)
  regionalRelevance:0.10,  // Kecocokan lokasi/regional
  availabilityReadiness: 0.10  // Kelengkapan profil & status aktif
};

// Trust level scores
const TRUST_SCORES = {
  'HUMAN_VERIFIED':   1.0,
  'LICENSED_PARTNER':  0.95,
  'EVIDENCE_ATTACHED': 0.85,
  'AI_ASSISTED':       0.70,
  'OFFICIAL_PUBLIC':   0.65,
  'SELF_DECLARED':     0.50
};

// ==========================================
// HELPER: Normalize text for matching
// ==========================================
function normalizeText(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9\s]/gi, '').trim();
}

function extractKeywords(text) {
  const stopWords = new Set(['dan', 'atau', 'yang', 'untuk', 'dari', 'dengan', 'the', 'and', 'or', 'for', 'of', 'in', 'to', 'a', 'an', 'is', 'are', 'was', 'be']);
  return normalizeText(text).split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
}

function calculateKeywordOverlap(keywords1, keywords2) {
  if (keywords1.length === 0 || keywords2.length === 0) return 0;
  const set2 = new Set(keywords2);
  let matches = 0;
  for (const kw of keywords1) {
    if (set2.has(kw)) {
      matches++;
    } else {
      // Partial matching (substring)
      for (const kw2 of set2) {
        if (kw.includes(kw2) || kw2.includes(kw)) {
          matches += 0.6;
          break;
        }
      }
    }
  }
  return Math.min(1, matches / keywords1.length);
}

// ==========================================
// PILLAR 1: Skill Match (30%)
// ==========================================
function scoreSkillMatch(taskSkills, userProfile) {
  if (!taskSkills || taskSkills.length === 0) return { score: 0.5, detail: 'Task tidak memiliki requiredSkills — default 50%' };

  const taskKeywords = taskSkills.flatMap(s => extractKeywords(s));
  
  // Gabungkan semua skill user dari berbagai sumber
  const userSkillTexts = [];
  
  // Dari UserSkill relation
  if (userProfile.skills && userProfile.skills.length > 0) {
    userProfile.skills.forEach(us => {
      if (us.skill) userSkillTexts.push(normalizeText(us.skill.name));
    });
  }

  // Dari Experience categories
  if (userProfile.experiences && userProfile.experiences.length > 0) {
    userProfile.experiences.forEach(exp => {
      userSkillTexts.push(...extractKeywords(exp.category || ''));
      userSkillTexts.push(...extractKeywords(exp.title || ''));
      userSkillTexts.push(...extractKeywords(exp.description || ''));
    });
  }

  // Dari EmploymentHistory
  if (userProfile.employmentHistory && userProfile.employmentHistory.length > 0) {
    userProfile.employmentHistory.forEach(eh => {
      userSkillTexts.push(...extractKeywords(eh.position || ''));
      userSkillTexts.push(...extractKeywords(eh.industry || ''));
      userSkillTexts.push(...extractKeywords(eh.description || ''));
      userSkillTexts.push(...extractKeywords(eh.achievements || ''));
    });
  }

  const overlap = calculateKeywordOverlap(taskKeywords, [...new Set(userSkillTexts)]);
  
  let detail;
  if (overlap >= 0.7) detail = `Keahlian sangat relevan: ${Math.round(overlap * 100)}% kata kunci cocok.`;
  else if (overlap >= 0.4) detail = `Beberapa keahlian relevan: ${Math.round(overlap * 100)}% kata kunci cocok.`;
  else if (overlap > 0) detail = `Sedikit irisan keahlian: ${Math.round(overlap * 100)}% kata kunci cocok.`;
  else detail = 'Belum ada kecocokan keahlian spesifik yang terdeteksi.';

  return { score: overlap, detail };
}

// ==========================================
// PILLAR 2: Experience Depth (20%)
// ==========================================
function scoreExperienceDepth(task, userProfile) {
  let score = 0;
  let detail = '';

  const expCount = (userProfile.experiences || []).length;
  const historyCount = (userProfile.employmentHistory || []).length;
  
  // Jumlah pengalaman
  const totalExp = expCount + historyCount;
  if (totalExp >= 5) score += 0.4;
  else if (totalExp >= 3) score += 0.3;
  else if (totalExp >= 1) score += 0.15;

  // Total tahun pengalaman kerja
  let totalYears = 0;
  if (userProfile.employmentHistory) {
    userProfile.employmentHistory.forEach(eh => {
      const start = new Date(eh.startDate);
      const end = eh.endDate ? new Date(eh.endDate) : new Date();
      totalYears += (end - start) / (365.25 * 24 * 60 * 60 * 1000);
    });
  }

  if (totalYears >= 15) score += 0.35;
  else if (totalYears >= 8) score += 0.25;
  else if (totalYears >= 3) score += 0.15;
  else if (totalYears > 0) score += 0.05;

  // Relevansi pengalaman terhadap task
  const taskKeywords = extractKeywords(`${task.title} ${task.description}`);
  let relevantExpCount = 0;
  
  [...(userProfile.experiences || []), ...(userProfile.employmentHistory || [])].forEach(exp => {
    const expText = `${exp.title || ''} ${exp.description || ''} ${exp.position || ''} ${exp.industry || ''} ${exp.achievements || ''} ${exp.category || ''}`;
    const expKeywords = extractKeywords(expText);
    if (calculateKeywordOverlap(taskKeywords, expKeywords) > 0.2) {
      relevantExpCount++;
    }
  });

  if (relevantExpCount >= 2) score += 0.25;
  else if (relevantExpCount >= 1) score += 0.15;

  score = Math.min(1, score);

  if (score >= 0.7) detail = `${Math.round(totalYears)} tahun pengalaman, ${relevantExpCount} pengalaman relevan.`;
  else if (score >= 0.3) detail = `${Math.round(totalYears)} tahun pengalaman dengan beberapa relevansi.`;
  else detail = `Pengalaman masih terbatas (${totalExp} entri).`;

  return { score, detail };
}

// ==========================================
// PILLAR 3: Trust/Verification Level (15%)
// ==========================================
function scoreTrustLevel(userProfile) {
  let totalTrust = 0;
  let count = 0;

  // Score experiences trust levels
  if (userProfile.experiences && userProfile.experiences.length > 0) {
    userProfile.experiences.forEach(exp => {
      totalTrust += TRUST_SCORES[exp.trustLevel] || 0.5;
      count++;
    });
  }

  // Score employment history trust levels
  if (userProfile.employmentHistory && userProfile.employmentHistory.length > 0) {
    userProfile.employmentHistory.forEach(eh => {
      totalTrust += TRUST_SCORES[eh.trustLevel] || 0.5;
      count++;
    });
  }

  // Score evidence count
  const evidenceCount = (userProfile.evidences || []).length;
  if (evidenceCount > 0) {
    totalTrust += Math.min(0.3, evidenceCount * 0.1);
    count += 0.3;
  }

  const score = count > 0 ? Math.min(1, totalTrust / count) : 0.3;

  let detail;
  if (score >= 0.8) detail = `Profil terverifikasi tinggi — ${evidenceCount} bukti terlampir.`;
  else if (score >= 0.5) detail = `Sebagian profil terverifikasi — dapat ditingkatkan.`;
  else detail = 'Profil belum terverifikasi — tambahkan evidence untuk meningkatkan skor.';

  return { score, detail };
}

// ==========================================
// PILLAR 4: WorkDNA Alignment (15%)
// ==========================================
function scoreWorkDnaAlignment(task, userProfile) {
  const workDna = userProfile.workDNA;
  if (!workDna) return { score: 0.3, detail: 'WorkDNA belum dipetakan — lakukan assessment.' };

  let score = 0;
  const taskKeywords = extractKeywords(`${task.title} ${task.description}`);

  // Core strengths match
  if (workDna.coreStrengths && workDna.coreStrengths.length > 0) {
    const strengthKeywords = workDna.coreStrengths.flatMap(s => extractKeywords(s));
    const overlap = calculateKeywordOverlap(taskKeywords, strengthKeywords);
    score += overlap * 0.4;
  }

  // Industry expertise match
  if (workDna.industryExpertise && workDna.industryExpertise.length > 0) {
    const industryKeywords = workDna.industryExpertise.flatMap(s => extractKeywords(s));
    const overlap = calculateKeywordOverlap(taskKeywords, industryKeywords);
    score += overlap * 0.3;
  }

  // General scores
  if (workDna.adaptabilityScore) score += Math.min(0.15, (workDna.adaptabilityScore / 100) * 0.15);
  if (workDna.leadershipScore) score += Math.min(0.15, (workDna.leadershipScore / 100) * 0.15);

  score = Math.min(1, score);

  let detail;
  if (score >= 0.6) detail = 'WorkDNA sangat selaras dengan kebutuhan tugas.';
  else if (score >= 0.3) detail = 'Beberapa aspek WorkDNA relevan.';
  else detail = 'WorkDNA belum cukup selaras — pertimbangkan pelatihan.';

  return { score, detail };
}

// ==========================================
// PILLAR 5: Regional Relevance (10%)
// ==========================================
function scoreRegionalRelevance(task, userProfile) {
  // Jika task tidak memiliki lokasi spesifik, beri skor netral
  const taskDesc = normalizeText(`${task.title} ${task.description}`);
  
  // Check for remote keywords
  const remoteKeywords = ['remote', 'online', 'virtual', 'anywhere', 'wfh', 'work from home', 'fleksibel'];
  const isRemote = remoteKeywords.some(kw => taskDesc.includes(kw));
  
  if (isRemote) return { score: 0.9, detail: 'Tugas ini remote/online — lokasi tidak terbatas.' };

  // Check location match
  const userLocation = normalizeText(`${userProfile.regionProvince || ''} ${userProfile.regionCity || ''}`);
  
  if (!userLocation.trim()) return { score: 0.5, detail: 'Lokasi pengguna belum diisi.' };

  // Check for matching regions in task
  if (userLocation.split(' ').some(loc => loc.length > 3 && taskDesc.includes(loc))) {
    return { score: 0.9, detail: 'Lokasi pengguna cocok dengan area tugas.' };
  }

  return { score: 0.5, detail: 'Tidak ada informasi lokasi spesifik pada tugas.' };
}

// ==========================================
// PILLAR 6: Availability & Readiness (10%)
// ==========================================
function scoreAvailabilityReadiness(userProfile) {
  let score = 0;

  // Status aktif
  if (userProfile.status === 'ACTIVE') score += 0.3;

  // Profil lengkap
  if (userProfile.fullName) score += 0.1;
  if (userProfile.phone) score += 0.1;
  if (userProfile.bio) score += 0.1;
  if (userProfile.regionProvince) score += 0.05;
  if (userProfile.email) score += 0.05;

  // Punya WorkDNA
  if (userProfile.workDNA) score += 0.15;

  // Punya pengalaman
  if ((userProfile.experiences || []).length > 0) score += 0.1;
  if ((userProfile.employmentHistory || []).length > 0) score += 0.05;

  score = Math.min(1, score);

  let detail;
  if (score >= 0.7) detail = 'Profil lengkap dan aktif — siap menerima penugasan.';
  else if (score >= 0.4) detail = 'Profil cukup lengkap — lengkapi untuk skor lebih tinggi.';
  else detail = 'Profil belum lengkap — tambahkan data diri dan pengalaman.';

  return { score, detail };
}

// ==========================================
// MAIN: Calculate Comprehensive Match Score
// ==========================================
function calculateMatchScore(task, userProfile) {
  const pillars = {
    skillMatch: scoreSkillMatch(task.requiredSkills || [], userProfile),
    experienceDepth: scoreExperienceDepth(task, userProfile),
    trustLevel: scoreTrustLevel(userProfile),
    workDnaAlignment: scoreWorkDnaAlignment(task, userProfile),
    regionalRelevance: scoreRegionalRelevance(task, userProfile),
    availabilityReadiness: scoreAvailabilityReadiness(userProfile)
  };

  // Calculate weighted total
  let weightedTotal = 0;
  for (const [key, pillar] of Object.entries(pillars)) {
    weightedTotal += pillar.score * WEIGHTS[key];
  }

  // Convert to 0-100 percentage
  const finalScore = Math.min(99, Math.max(5, Math.round(weightedTotal * 100)));

  // Generate reasons list
  const reasons = Object.values(pillars)
    .map(p => p.detail)
    .filter(d => d);

  // Generate narrative explanation
  const explanation = generateExplanation(finalScore, pillars, task, userProfile);

  // Breakdown for frontend
  const breakdown = {};
  for (const [key, pillar] of Object.entries(pillars)) {
    breakdown[key] = {
      score: Math.round(pillar.score * 100),
      weight: Math.round(WEIGHTS[key] * 100),
      detail: pillar.detail,
      label: PILLAR_LABELS[key] || key
    };
  }

  return {
    score: finalScore,
    reasons,
    explanation,
    breakdown
  };
}

const PILLAR_LABELS = {
  skillMatch: 'Kecocokan Keahlian',
  experienceDepth: 'Kedalaman Pengalaman',
  trustLevel: 'Tingkat Verifikasi',
  workDnaAlignment: 'WorkDNA Alignment',
  regionalRelevance: 'Relevansi Lokasi',
  availabilityReadiness: 'Kesiapan & Kelengkapan'
};

// ==========================================
// NARRATIVE EXPLANATION GENERATOR
// ==========================================
function generateExplanation(score, pillars, task, userProfile) {
  const name = userProfile.fullName || 'Kandidat';
  const taskTitle = task.title || 'tugas ini';

  if (score >= 85) {
    return `${name} memiliki kecocokan sangat tinggi (${score}%) untuk "${taskTitle}". Keahlian, pengalaman, dan profil WorkDNA-nya sangat selaras dengan kebutuhan tugas. ${pillars.trustLevel.score >= 0.7 ? 'Pengalamannya telah terverifikasi, menambah kepercayaan.' : ''}`;
  } else if (score >= 65) {
    return `${name} menunjukkan kecocokan yang baik (${score}%) untuk "${taskTitle}". ${pillars.skillMatch.score >= 0.5 ? 'Terdapat irisan signifikan pada keahlian yang dibutuhkan.' : 'Beberapa aspek profilnya relevan.'} ${pillars.experienceDepth.score >= 0.5 ? 'Didukung oleh pengalaman kerja yang cukup dalam.' : 'Pengalaman bisa ditingkatkan.'}`;
  } else if (score >= 40) {
    return `${name} memiliki potensi (${score}%) untuk "${taskTitle}". Meskipun ada beberapa irisan keahlian, masih perlu pengembangan di area tertentu. ${pillars.workDnaAlignment.score < 0.3 ? 'Disarankan untuk melengkapi assessment WorkDNA.' : ''}`;
  } else {
    return `${name} saat ini memiliki kecocokan awal (${score}%) untuk "${taskTitle}". Disarankan untuk memperkaya Experience Bank dan melengkapi profil agar skor meningkat.`;
  }
}

// ==========================================
// GEMINI AI INTEGRATION (Plug-and-Play)
// ==========================================
async function evaluateWithAI(task, userProfile) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return null; // Fallback ke heuristik

  try {
    const axios = require('axios');
    const prompt = `Kamu adalah AI Evaluator NUSA-DATA, platform pencocokan tenaga kerja Indonesia. 
Evaluasi kecocokan kandidat berikut dengan tugas yang diberikan.

TUGAS:
- Judul: ${task.title}
- Deskripsi: ${task.description}
- Skill yang dibutuhkan: ${(task.requiredSkills || []).join(', ')}

KANDIDAT:
- Nama: ${userProfile.fullName}
- Pengalaman: ${(userProfile.experiences || []).map(e => e.title + ' - ' + e.category).join('; ')}
- Riwayat Kerja: ${(userProfile.employmentHistory || []).map(e => e.position + ' di ' + e.companyName).join('; ')}
- WorkDNA Strengths: ${(userProfile.workDNA?.coreStrengths || []).join(', ')}

Berikan response dalam JSON: { "score": number 0-100, "explanation": "string penjelasan dalam Bahasa Indonesia", "reasons": ["string array alasan"] }`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      },
      { timeout: 10000 }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      return JSON.parse(text);
    }
  } catch (err) {
    console.warn('Gemini AI evaluation failed, using heuristic fallback:', err.message);
  }
  
  return null; // Fallback
}

// ==========================================
// PUBLIC API: Find Candidates for a Task
// ==========================================
async function findCandidatesForTask(taskId) {
  const task = await prisma.projectTask.findUnique({
    where: { id: taskId }
  });

  if (!task) throw new Error('Task tidak ditemukan');

  // Ambil semua user aktif beserta data profil lengkap
  const users = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    include: {
      skills: { include: { skill: true } },
      experiences: true,
      employmentHistory: true,
      evidences: true,
      workDNA: true
    }
  });

  const scoredCandidates = [];

  for (const user of users) {
    // Coba AI evaluation dulu, fallback ke heuristik
    const aiResult = await evaluateWithAI(task, user);
    
    let matchResult;
    if (aiResult && aiResult.score !== undefined) {
      matchResult = {
        score: aiResult.score,
        reasons: aiResult.reasons || [],
        explanation: aiResult.explanation || '',
        breakdown: null, // AI tidak menyediakan breakdown per pilar
        source: 'GEMINI_AI'
      };
    } else {
      const heuristic = calculateMatchScore(task, user);
      matchResult = { ...heuristic, source: 'HEURISTIC_ENGINE' };
    }

    scoredCandidates.push({
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      profileType: user.profileType,
      regionProvince: user.regionProvince,
      matchScore: matchResult.score,
      matchReasons: matchResult.reasons,
      matchExplanation: matchResult.explanation,
      matchBreakdown: matchResult.breakdown,
      matchSource: matchResult.source,
      experienceCount: (user.experiences || []).length,
      verifiedCount: (user.experiences || []).filter(e => e.trustLevel === 'HUMAN_VERIFIED').length
    });
  }

  // Urutkan berdasarkan skor tertinggi
  return scoredCandidates.sort((a, b) => b.matchScore - a.matchScore).slice(0, 20);
}

// ==========================================
// PUBLIC API: Recommend Tasks for a Worker
// ==========================================
async function recommendTasksForWorker(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      skills: { include: { skill: true } },
      experiences: true,
      employmentHistory: true,
      evidences: true,
      workDNA: true
    }
  });

  if (!user) throw new Error('User tidak ditemukan');

  // Ambil task aktif dari Marketplace
  const activeTasks = await prisma.projectTask.findMany({
    where: { status: 'OPEN' },
    include: { project: { include: { customer: true } } }
  });

  const scoredTasks = [];

  for (const task of activeTasks) {
    const aiResult = await evaluateWithAI(task, user);
    
    let matchResult;
    if (aiResult && aiResult.score !== undefined) {
      matchResult = {
        score: aiResult.score,
        reasons: aiResult.reasons || [],
        explanation: aiResult.explanation || '',
        breakdown: null,
        source: 'GEMINI_AI'
      };
    } else {
      const heuristic = calculateMatchScore(task, user);
      matchResult = { ...heuristic, source: 'HEURISTIC_ENGINE' };
    }

    scoredTasks.push({
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        requiredSkills: task.requiredSkills,
        compensationCents: task.compensationCents,
        status: task.status,
        projectTitle: task.project?.title,
        customerEmail: task.project?.customer?.billingEmail
      },
      matchScore: matchResult.score,
      matchReasons: matchResult.reasons,
      matchExplanation: matchResult.explanation,
      matchBreakdown: matchResult.breakdown,
      matchSource: matchResult.source
    });
  }

  return scoredTasks.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
}

// ==========================================
// PUBLIC API: Score a single user-task pair
// ==========================================
async function scoreUserTask(userId, taskId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      skills: { include: { skill: true } },
      experiences: true,
      employmentHistory: true,
      evidences: true,
      workDNA: true
    }
  });

  if (!user) throw new Error('User tidak ditemukan');

  const task = await prisma.projectTask.findUnique({
    where: { id: taskId }
  });

  if (!task) throw new Error('Task tidak ditemukan');

  // Coba AI, fallback ke heuristik
  const aiResult = await evaluateWithAI(task, user);
  
  if (aiResult && aiResult.score !== undefined) {
    return {
      userId, taskId,
      score: aiResult.score,
      reasons: aiResult.reasons || [],
      explanation: aiResult.explanation || '',
      breakdown: null,
      source: 'GEMINI_AI'
    };
  }

  const heuristic = calculateMatchScore(task, user);
  return {
    userId, taskId,
    ...heuristic,
    source: 'HEURISTIC_ENGINE'
  };
}

module.exports = {
  calculateMatchScore,
  findCandidatesForTask,
  recommendTasksForWorker,
  scoreUserTask,
  evaluateWithAI
};
