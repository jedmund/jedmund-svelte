import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testDb() {
  try {
    const count = await prisma.media.count()
    console.log('Total media entries:', count)
    await prisma.$disconnect()
  } catch (error) {
    console.error('Database error:', error)
  }
}

testDb()