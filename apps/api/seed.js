const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Cleaning old data...");
  await prisma.response.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.model.deleteMany({});
  await prisma.contributor.deleteMany({});

  console.log("🌱 Seeding contributors...");
  const c1 = await prisma.contributor.create({
    data: {
      email: "evaluator@nusa.ai",
      displayName: "Thoyib Nusa",
      ageGroup: "25-34",
      region: "Jawa Timur",
      reputation: 96.5,
      nusaScore: 94.7,
      tier: "EXPERT",
      accuracy: 97.2,
      earnedCents: 18400
    }
  });

  const c2 = await prisma.contributor.create({
    data: {
      email: "budi@nusa.ai",
      displayName: "Budi Setiawan",
      ageGroup: "18-24",
      region: "DKI Jakarta",
      reputation: 82.0,
      nusaScore: 84.1,
      tier: "CONTRIBUTOR",
      accuracy: 85.0,
      earnedCents: 5200
    }
  });

  console.log("🌱 Seeding AI models...");
  const m1 = await prisma.model.create({
    data: { name: "GPT-X", provider: "OpenAI", scoreGlobal: 87.4, scoreNatural: 91.2, scoreCulture: 84.0, scoreEmpathy: 92.5, scoreRegional: 87.1 }
  });
  const m2 = await prisma.model.create({
    data: { name: "Claude-X", provider: "Anthropic", scoreGlobal: 85.9, scoreNatural: 89.0, scoreCulture: 94.2, scoreEmpathy: 90.0, scoreRegional: 91.5 }
  });
  const m3 = await prisma.model.create({
    data: { name: "Gemini-X", provider: "Google", scoreGlobal: 84.7, scoreNatural: 87.0, scoreCulture: 81.3, scoreEmpathy: 94.0, scoreRegional: 78.4 }
  });
  const m4 = await prisma.model.create({
    data: { name: "Local-LLM", provider: "Nusa-FineTune", scoreGlobal: 81.2, scoreNatural: 92.0, scoreCulture: 88.5, scoreEmpathy: 85.0, scoreRegional: 94.1 }
  });

  console.log("🌱 Seeding tasks...");
  const tasks = await prisma.task.createMany({
    data: [
      {
        buyerId: "buyer_001",
        prompt: "Teman saya sedang sedih karena kehilangan pekerjaan. Apa respons yang paling tepat?",
        modelAId: m1.id,
        responseA: "Saya memahami kekhawatiran Anda mengenai kehilangan pekerjaan tersebut. Silakan hubungi dinas terkait.",
        modelBId: m2.id,
        responseB: "Sedih banget denger kabar itu, Mas. Memang berat kehilangan pekerjaan, tapi saya yakin rezeki nggak ke mana. Ambil napas dulu, nanti saya bantu cari info lowongan ya. Tetap semangat!",
        category: "Empathy"
      },
      {
        buyerId: "buyer_001",
        prompt: "Bagaimana cara menyapa pelanggan di toko online dengan sopan tapi santai?",
        modelAId: m3.id,
        responseA: "Halo kak! Selamat datang di toko kami. Ada yang bisa kami bantu hari ini? Silakan tanya-tanya ya 😊",
        modelBId: m4.id,
        responseB: "Kepada Yth. Pelanggan. Selamat datang di toko retail elektronik kami. Harap pilih katalog di menu utama.",
        category: "Naturalness"
      },
      {
        buyerId: "buyer_001",
        prompt: "Menolak tawaran makan dari mertua secara halus karena sudah kenyang.",
        modelAId: m2.id,
        responseA: "Terima kasih banyak tawarannya Ibu, aduh masakannya kelihatan enak sekali. Tapi maaf sekali Bu, saya baru saja makan di jalan tadi jadi perut masih kenyang sekali. Nanti kalau sudah agak senggang saya cicipi ya Bu.",
        modelBId: m1.id,
        responseB: "Saya tidak mau makan karena perut saya sudah penuh dan kenyang.",
        category: "Cultural Context"
      },
      {
        buyerId: "buyer_002",
        prompt: "Apakah ungkapan 'rezeki nggak ke mana' cocok digunakan untuk menghibur orang yang gagal ujian?",
        modelAId: m1.id,
        responseA: "Cocok, karena kegagalan ujian adalah bagian dari perjalanan hidup yang sudah diatur rezekinya.",
        modelBId: m2.id,
        responseB: "Kurang cocok. Ungkapan 'rezeki nggak ke mana' biasanya dipakai untuk urusan materi, pekerjaan, atau jodoh. Untuk kegagalan ujian sekolah/kuliah, lebih pas disemangati dengan kata-kata seperti 'masih ada kesempatan berikutnya' atau 'evaluasi cara belajar saja'.",
        category: "Cultural Context"
      }
    ]
  });

  console.log("🌱 Seeding completed response histories...");
  // Let's seed some response history for stats
  const dbTasks = await prisma.task.findMany({});
  for (const t of dbTasks) {
    await prisma.response.create({
      data: {
        taskId: t.id,
        contributorId: c1.id,
        preference: t.prompt.includes("sedih") ? "B" : "A",
        reason: "Jawabannya jauh lebih natural, menggunakan sapaan khas Indonesia (Mas/Kak), dan sesuai adat ketimuran.",
        timeSpentMs: 4500,
        scoreNatural: 5,
        scoreEmpathy: 5,
        scoreCulture: 5,
        isGoldTask: false
      }
    });
  }

  console.log("✅ Seed data inserted successfully!");
  console.log("   Evaluator 1 (Thoyib) ID:", c1.id);
  console.log("   Evaluator 2 (Budi) ID:", c2.id);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
