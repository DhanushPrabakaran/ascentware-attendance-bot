import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Clearing database...');
  await prisma.dailySummary.deleteMany();
  await prisma.dailyTask.deleteMany();
  await prisma.attendanceBreak.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.leave.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.settings.deleteMany();

  console.log('Seeding settings...');
  await prisma.settings.create({ data: { id: 'default' } });

  console.log('Seeding admin account...');
  const defaultPassword = process.env.SEED_ADMIN_PASSWORD || 'password';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  await prisma.employee.create({
    data: {
      name: 'Admin',
      email: 'admin@ascentwarecorp.com',
      role: 'ADMIN',
      managerEmails: [],
      passwordHash,
    },
  });

  console.log(
    `Database seeded. Log in as admin@ascentwarecorp.com with password "${defaultPassword}" (override with SEED_ADMIN_PASSWORD) and change it after first login. No shifts or other employees were seeded - add real ones from the admin dashboard.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
