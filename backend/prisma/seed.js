/*
 * If you need to initialize your database with some data, you may write a script
 * to do so here.
 */
'use strict';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedData() {
    const mockUsers = [
        {
            utorid: "alice123",
            name: "alice",
            email: "alice@mail.utoronto.ca",
            password: "Password123!",
            birthday: new Date("2000-01-01"),
            role: "regular",
            points: 0,
            avatarUrl: "",
            suspicious: false,
            verified: true,
            // token: "token",
            createdAt: "2025-02-22T00:00:00.000Z",
            expiresAt: "2025-11-22T00:00:00.000Z",
            lastLogin: "2025-02-24T00:00:00.000Z"
        },
        {
            utorid: "john",
            name: "john",
            email: "john@mail.utoronto.ca",
            password: "Password123!",
            birthday: new Date("2000-01-01"),
            role: "regular",
            points: 0,
            avatarUrl: "",
            suspicious: false,
            verified: true,
            // token: "token",
            createdAt: "2025-02-22T00:00:00.000Z",
            expiresAt: "2025-11-22T00:00:00.000Z",
            lastLogin: "2025-02-24T00:00:00.000Z"
        },
        {
            utorid: "robert1",
            name: "bob",
            email: "bob@mail.utoronto.ca",
            password: "Password123!",
            birthday: new Date("2000-01-01"),
            role: "regular",
            points: 0,
            avatarUrl: "",
            suspicious: false,
            verified: true,
            // token: "token",
            createdAt: "2025-02-22T00:00:00.000Z",
            expiresAt: "2025-11-22T00:00:00.000Z",
            lastLogin: "2025-02-24T00:00:00.000Z"
        },
        {
            utorid: "user123",
            name: "user123",
            email: "user123@mail.utoronto.ca",
            password: "Password123!",
            birthday: new Date("2000-01-01"),
            role: "regular",
            points: 0,
            avatarUrl: "",
            suspicious: true,
            verified: true,
            // token: "token",
            createdAt: "2025-02-22T00:00:00.000Z",
            expiresAt: "2025-11-22T00:00:00.000Z",
            lastLogin: "2025-02-24T00:00:00.000Z"
        },
        {
            utorid: "user001",
            name: "user001",
            email: "user001@mail.utoronto.ca",
            password: "Password123!",
            birthday: new Date("2000-01-01"),
            role: "regular",
            points: 0,
            avatarUrl: "",
            suspicious: true,
            verified: false,
            // token: "token",
            createdAt: "2025-02-22T00:00:00.000Z",
            expiresAt: "2025-11-22T00:00:00.000Z",
            lastLogin: "2025-02-24T00:00:00.000Z"
        },
        {
            utorid: "user002",
            name: "user002",
            email: "user002@mail.utoronto.ca",
            password: "Password123!",
            birthday: new Date("2000-01-01"),
            role: "cashier",
            points: 67,
            avatarUrl: "",
            suspicious: false,
            verified: true,
            // token: "token",
            createdAt: "2025-02-22T00:00:00.000Z",
            expiresAt: "2025-11-22T00:00:00.000Z",
            lastLogin: "2025-02-24T00:00:00.000Z"
        },
        {
            utorid: "user003",
            name: "user003",
            email: "user003@mail.utoronto.ca",
            password: "Password123!",
            birthday: new Date("2000-01-01"),
            role: "manager",
            points: 0,
            avatarUrl: "",
            suspicious: false,
            verified: true,
            // token: "token",
            createdAt: "2025-02-22T00:00:00.000Z",
            expiresAt: "2025-11-22T00:00:00.000Z",
            lastLogin: "2025-02-24T00:00:00.000Z"
        }
    ];

    for (const user of mockUsers) {
        await prisma.user.create({ data: user });
    }
}

seedData().finally(() => prisma.$disconnect());
