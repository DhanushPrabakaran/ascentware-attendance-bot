import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const emps = await prisma.employee.findMany({ select: { name: true, teamsUserId: true } });
  console.log(JSON.stringify(emps, null, 2));
}
main().finally(() => process.exit(0));
