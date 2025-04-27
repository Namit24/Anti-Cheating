import { PrismaClient } from "@prisma/client"

// Use a single instance of Prisma Client in development
// https://www.prisma.io/docs/guides/performance-and-optimization/connection-management

declare global {
  var cachedPrisma: PrismaClient
}

let prisma: PrismaClient
if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient()
} else {
  if (!global.cachedPrisma) {
    global.cachedPrisma = new PrismaClient()
  }
  prisma = global.cachedPrisma
}

export const db = prisma
