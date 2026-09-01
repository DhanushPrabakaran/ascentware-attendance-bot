import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

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
  await prisma.settings.create({
    data: {
      id: 'default',
      adminUsername: 'admin',
      adminPassword: 'password', // Default password
    }
  });

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
  await prisma.employee.create({
    data: {
      name: 'Dhanush Prabakaran',
      email: 'dhanushprabakaran@ascentwarecorp.com',
      role: 'ADMIN',
      shiftId: indianShift.id,
      managerEmails: [], // Admin has no managers
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
