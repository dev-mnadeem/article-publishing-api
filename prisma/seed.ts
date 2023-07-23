import { prisma } from '../src/db/prisma';
import { BcryptPasswordHasher } from '../src/security/passwordHasher';

import { SEED_POSTS, SEED_USER } from './seedData';

const hasher = new BcryptPasswordHasher();

const seed = async (): Promise<void> => {
  const existing = await prisma.user.findUnique({ where: { email: SEED_USER.email } });
  if (existing) {
    console.log(`Seed user ${SEED_USER.email} already exists, nothing to do.`);
    return;
  }

  const password = await hasher.hash(SEED_USER.password);
  const user = await prisma.user.create({
    data: { name: SEED_USER.name, email: SEED_USER.email, password },
  });
  console.log(`Created user ${user.email}`);

  // The first version dispatched these inside `Array.prototype.forEach` with an
  // async callback, so nothing awaited them and the process could disconnect
  // mid-flight. createMany is one statement and is actually awaited.
  const { count } = await prisma.post.createMany({
    data: SEED_POSTS.map((post) => ({ ...post, authorId: user.id })),
  });
  console.log(`Created ${count} posts`);
};

seed()
  .then(async () => {
    console.log('Seeding finished.');
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
