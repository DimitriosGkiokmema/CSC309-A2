/*
 * If you need to initialize your database with some data, you may write a script
 * to do so here.
 */
'use strict';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedData() {
    // const mockData = {
    //     "users": [{
    //         utorid: "clive123",
    //         name: "Clive Thompson",
    //         email: "clive@mail.utoronto.ca",
    //         password: "SuperUser123!",
    //         birthday: new Date("2000-01-01"),
    //         role: "superuser",
    //         points: 0,
    //         avatarUrl: "",
    //         suspicious: false,
    //         verified: true,
    //         createdAt: "2025-02-22T00:00:00.000Z",
    //         expiresAt: "2025-11-22T00:00:00.000Z",
    //         lastLogin: "2025-02-24T00:00:00.000Z"
    //     }],
    //     "events": [{
    //         name: "Event 1",
    //         description: "dummy event",
    //         location: "toronto",
    //         startTime: "2025-12-02T00:00:00.000Z",
    //         endTime: "2025-12-22T00:00:00.000Z",
    //         capacity: 67,
    //         pointsRemain: 100,
    //         pointsAwarded: 0,
    //         published: true
    //     }, {
    //         name: "Event 2",
    //         description: "dummy event",
    //         location: "toronto",
    //         startTime: "2025-12-02T00:00:00.000Z",
    //         endTime: "2025-12-22T00:00:00.000Z",
    //         capacity: 67,
    //         pointsRemain: 100,
    //         pointsAwarded: 0,
    //         published: true
    //     }, {
    //         name: "Event 3",
    //         description: "dummy event",
    //         location: "toronto",
    //         startTime: "2025-12-02T00:00:00.000Z",
    //         endTime: "2025-12-22T00:00:00.000Z",
    //         capacity: 67,
    //         pointsRemain: 100,
    //         pointsAwarded: 0,
    //         published: true
    //     }, {
    //         name: "Event 4",
    //         description: "dummy event",
    //         location: "toronto",
    //         startTime: "2025-12-02T00:00:00.000Z",
    //         endTime: "2025-12-22T00:00:00.000Z",
    //         capacity: 67,
    //         pointsRemain: 100,
    //         pointsAwarded: 0,
    //         published: true
    //     }, {
    //         name: "Event 5",
    //         description: "dummy event",
    //         location: "toronto",
    //         startTime: "2025-12-02T00:00:00.000Z",
    //         endTime: "2025-12-22T00:00:00.000Z",
    //         capacity: 67,
    //         pointsRemain: 100,
    //         pointsAwarded: 0,
    //         published: true
    //     }, {
    //         name: "Event 6",
    //         description: "dummy event",
    //         location: "toronto",
    //         startTime: "2025-12-02T00:00:00.000Z",
    //         endTime: "2025-12-22T00:00:00.000Z",
    //         capacity: 67,
    //         pointsRemain: 100,
    //         pointsAwarded: 0,
    //         published: true
    //     }, {
    //         name: "Event 7",
    //         description: "dummy event",
    //         location: "toronto",
    //         startTime: "2025-12-02T00:00:00.000Z",
    //         endTime: "2025-12-22T00:00:00.000Z",
    //         capacity: 67,
    //         pointsRemain: 100,
    //         pointsAwarded: 0,
    //         published: true
    //     }, {
    //         name: "Event 8",
    //         description: "dummy event",
    //         location: "toronto",
    //         startTime: "2025-12-02T00:00:00.000Z",
    //         endTime: "2025-12-22T00:00:00.000Z",
    //         capacity: 67,
    //         pointsRemain: 100,
    //         pointsAwarded: 0,
    //         published: true
    //     }, {
    //         name: "Event 9",
    //         description: "dummy event",
    //         location: "toronto",
    //         startTime: "2025-12-02T00:00:00.000Z",
    //         endTime: "2025-12-22T00:00:00.000Z",
    //         capacity: 67,
    //         pointsRemain: 100,
    //         pointsAwarded: 0,
    //         published: true
    //     }, {
    //         name: "Event 10",
    //         description: "dummy event",
    //         location: "toronto",
    //         startTime: "2025-12-02T00:00:00.000Z",
    //         endTime: "2025-12-22T00:00:00.000Z",
    //         capacity: 67,
    //         pointsRemain: 100,
    //         pointsAwarded: 0,
    //         published: true
    //     }, {
    //         name: "Event 12",
    //         description: "dummy event",
    //         location: "toronto",
    //         startTime: "2025-12-02T00:00:00.000Z",
    //         endTime: "2025-12-22T00:00:00.000Z",
    //         capacity: 67,
    //         pointsRemain: 100,
    //         pointsAwarded: 0,
    //         published: true
    //     }, {
    //         name: "Event 13",
    //         description: "dummy event",
    //         location: "toronto",
    //         startTime: "2025-12-02T00:00:00.000Z",
    //         endTime: "2025-12-22T00:00:00.000Z",
    //         capacity: 67,
    //         pointsRemain: 100,
    //         pointsAwarded: 0,
    //         published: true
    //     }]
    // };

    // for (const user of mockData.users) {
    //     await prisma.user.create({ data: user });
    // }

    // for (const event of mockData.events) {
    //     await prisma.event.create({ data: event });
    // }

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
