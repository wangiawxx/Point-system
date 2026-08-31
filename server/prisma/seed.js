const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const users = [
  ['陈默', '138****1024', 1280], ['林小满', '139****2388', 1168], ['周航', '186****7712', 980], ['赵嘉', '150****4410', 856],
  ['苏青', '177****6201', 742], ['王磊', '133****9802', 636], ['顾言', '189****3177', 528], ['许宁', '136****5620', 412],
];
async function main() {
  await prisma.admin.upsert({ where: { username: 'admin' }, update: {}, create: { username: 'admin', password: 'admin123' } });
  if ((await prisma.user.count()) === 0) await prisma.user.createMany({ data: users.map(([name, phone, points]) => ({ name, phone, points })) });
  const members = await prisma.user.findMany({ orderBy: { id: 'asc' }, take: 4 });
  if (members.length >= 4 && (await prisma.pkMatch.count()) === 0) await prisma.pkMatch.createMany({ data: [
    { challengerId: members[0].id, opponentId: members[2].id, stake: 100, date: '2026-08-10', time: '19:30', status: '待结算', note: '九球友谊赛' },
    { challengerId: members[1].id, opponentId: members[3].id, stake: 200, date: '2026-08-10', time: '20:00', status: '待确认', note: '先到 7 局' },
    { challengerId: members[0].id, opponentId: members[1].id, stake: 50, date: '2026-08-11', time: '18:30', status: '已预约' },
  ] });
}
main().finally(() => prisma.$disconnect());
