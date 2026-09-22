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
  await prisma.employee.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.settings.deleteMany();

  console.log('Seeding settings...');
  const defaultPassword = process.env.SEED_ADMIN_PASSWORD || 'password';
  await prisma.settings.create({
    data: {
      id: 'default',
      adminUsername: 'admin',
      adminPasswordHash: await bcrypt.hash(defaultPassword, 10),
    }
  });
  console.log(
    `Seeded admin login: username "admin", password "${defaultPassword}" (change this - set SEED_ADMIN_PASSWORD to override, or update it via the dashboard).`,
  );

  console.log('Seeding shifts...');
  const indianShift = await prisma.shift.create({
    data: {
      name: 'Indian Time (IST)',
      startTime: '09:00',
      endTime: '18:00',
    }
  });

  const belgiumShift = await prisma.shift.create({
    data: {
      name: 'Belgium Time (CET)',
      startTime: '08:00',
      endTime: '17:00',
    }
  });

  console.log('Seeding employees...');
  const admin = await prisma.employee.create({
    data: {
      name: 'Dhanush Prabakaran',
      email: 'dhanushprabakaran@ascentwarecorp.com',
      role: 'ADMIN',
      shiftId: indianShift.id,
      managerEmails: [], // Admin has no managers
    }
  });

  await prisma.employee.create({
    data: {
      name: 'Sample Employee (IST)',
      email: 'sample.employee.ist@ascentwarecorp.com',
      role: 'EMPLOYEE',
      shiftId: indianShift.id,
      managerEmails: [admin.email],
    }
  });

  await prisma.employee.create({
    data: {
      name: 'Sample Employee (CET)',
      email: 'sample.employee.cet@ascentwarecorp.com',
      role: 'EMPLOYEE',
      shiftId: belgiumShift.id,
      managerEmails: [admin.email],
    }
  });

  await prisma.employee.create({
    data: {
      name: 'Offboarded Employee',
      email: 'offboarded.employee@ascentwarecorp.com',
      role: 'EMPLOYEE',
      shiftId: indianShift.id,
      managerEmails: [admin.email],
      isActive: false,
      deactivatedAt: new Date(),
    }
  });

  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
