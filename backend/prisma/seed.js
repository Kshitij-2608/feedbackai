import bcrypt from "bcryptjs";
import prismaPackage from "@prisma/client";

const { PrismaClient, Role } = prismaPackage;

const prisma = new PrismaClient();

async function main() {
  const email = process.env.DEFAULT_ADMIN_EMAIL;
  const password = process.env.DEFAULT_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("Skipping admin seed because DEFAULT_ADMIN_EMAIL or DEFAULT_ADMIN_PASSWORD is missing.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      name: "Platform Admin",
      passwordHash,
      role: Role.ADMIN,
    },
    create: {
      name: "Platform Admin",
      email,
      passwordHash,
      role: Role.ADMIN,
    },
  });

  console.log(`Seeded admin user: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
