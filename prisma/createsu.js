/*
 * Complete this script so that it is able to add a superuser to the database
 * Usage example: 
 *   node prisma/createsu.js clive123 clive.su@mail.utoronto.ca SuperUser123!
 */
'use strict';

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const [, , utorid, email, password] = process.argv

if (!utorid) {
  console.error('Usage: node prisma/createsu.js <utorid>')
  process.exit(1)
} else if (!email) {
  console.error('Usage: node prisma/createsu.js <email>')
  process.exit(1)
} else if (!password) {
  console.error('Usage: node prisma/createsu.js <password>')
  process.exit(1)
}

async function main() {
  const created = await prisma.user.create({
    data: {
      utorid,
      'name': 'admin',
      email,
      password,
      'verified': true,
      'role': 'superuser',
      'points': 0,
      'suspicious': false
    }
  })

  console.log('created user id =', created.id)
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });