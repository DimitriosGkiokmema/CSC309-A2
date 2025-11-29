#!/usr/bin/env node
'use strict';

const port = (() => {
    const args = process.argv;

    if (args.length !== 3) {
        console.error("usage: node index.js port");
        process.exit(1);
    }

    const num = parseInt(args[2], 10);
    if (isNaN(num)) {
        console.error("error: argument must be an integer.");
        process.exit(1);
    }

    return num;
})();

require('dotenv').config();
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const jwt = require('jsonwebtoken');
const app = express();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const get_logged_in = require("./middleware/auth.js");
const SECRET_KEY = process.env.JWT_SECRET;
const resetRate = {};
const ROLE_LEVELS = { "regular": 0, "cashier": 1, "manager": 2, "superuser": 3 };
app.use(express.json());

// Set up cors to allow requests from your React frontend
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// A2 Functions
function generateToken(utorid, time) {
    const token = jwt.sign(
        { username: utorid },
        SECRET_KEY,
        { expiresIn: time }
    )

    return token
}

function check_clearance(min_level) {
    return function (req, res, next) {
        const curr_level = req.user.role;

        if (ROLE_LEVELS[curr_level] < ROLE_LEVELS[min_level]) {
            return res.status(403).json({ error: "Not high enough clearance" });
        }

        next();
    }
}

function validPassword(password) {
    let RegEx = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

    return (password.length >= 8 &&
        password.length <= 20 &&
        RegEx.test(password));
}

app.post('/users', get_logged_in, check_clearance("cashier"), async (req, res) => {
    /*
    · Method: POST
    · Description: Register a new user
    · Clearance: Cashier or higher
    · Payload:
    Field Required Type Description
    utorid Yes string Unique, Alphanumeric, 7-8 characters
    name Yes string 1-50 characters
    email Yes string Unique, Valid University of Toronto email

    · Response:
    o 201 Created on success { "id": 1, "utorid": "johndoe1", "name": "John Doe", "email": "john.doe@mail.utoronto.ca", "verified": false, "expiresAt": "2025-03-10T01:41:47.000Z", "resetToken": "ad71d4e1-8614-46aa-b96f-cb894e346506" }
    o 409 Conflict if the user with that utorid already exists

    Upon account creation, an email with an activation link will be sent to the provided email address (see POST /auth/resets/:resetId). The activation link expires in 7 days, after which, the user can request for a password reset to attempt activation again.

    For this assignment, you are not expected to send emails, so the response body also contains the token that can be used to activate the account.

    TESTING:
    {
        "utorid": "clive123",
        "name": "Clive Thompson",
        "email": "clive.thompson@mail.utoronto.ca"
    }

    {
        "utorid": "dimitri9",
        "name": "dimi",
        "email": "dimi@mail.utoronto.ca"
    }
    */
    const { utorid, name, email } = req.body;

    // Check fields exist
    if (!utorid || !name || !email) {
        return res.status(400).json({ error: "Payload field missing" });
    }

    let RegEx = /^[a-z0-9]+$/i;
    let Valid = RegEx.test(utorid);

    // Validate length and alphanumeric-ness of utorid
    if (utorid.length < 7 || utorid.length > 8 || !Valid) {
        return res.status(400).json({ error: "utorid entered incorrect" });
    }

    // Validate name
    if (name.length == 0 || name.length > 50) {
        return res.status(400).json({ error: "name must be between 1 and 50 characters" });
    }

    // Validate email is from UofT
    if (!email.includes("@mail.utoronto.ca")) {
        return res.status(400).json({ error: "Email not proper format" });
    }

    try {
        // Check if user already exists
        const existing = await prisma.user.findUnique({
            where: { utorid }
        });

        if (existing) {
            return res.status(409).json({ message: "A user with that utorid already exists" });
        }

        const resetToken = uuidv4();
        const curr_time = new Date().toISOString();
        let week_later = new Date();
        week_later.setDate(week_later.getDate() + 7);

        const user = await prisma.user.create({
            data: {
                utorid,
                name,
                email,
                role: "regular",
                points: 0,
                suspicious: false,
                verified: false,
                token: resetToken,
                createdAt: curr_time,
                expiresAt: week_later.toISOString()
            },
        });

        // Respond with updated note
        return res.status(201).json({
            id: user.id,
            utorid: user.utorid,
            name: user.name,
            email: user.email,
            verified: user.verified,
            expiresAt: user.expiresAt,
            "resetToken": user.token
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database error" });
    }
});

app.get('/users', get_logged_in, check_clearance("manager"), async (req, res) => {
    /*
    · Method: GET
    · Description: Retrieve a list of users
    · Clearance: Manager or higher
    · Payload:
    Field Required Type Description
    name No string Filter by utorid or name
    role No string Filter by user role
    verified No boolean Filter by verified status
    activated No boolean Filter by whether the user has ever logged in before
    page No number Page number for pagination (default is 1)
    limit No number Number of objects per page (default is 10)

    · Response: count, which stores the total number of results (after applying all filters), and results, which contains a list of users { "count": 51,
    "results": [ { "id": 1, "utorid": "johndoe1", "name": "John Doe", "email": "john.doe@mail.utoronto.ca", "birthday": "2000-01-01", "role": "regular", "points": 0, "createdAt": "2025-02-22T00:00:00.000Z", "lastLogin": null, "verified": false, "avatarUrl": null }, // More user objects... ] }

    TESTING:
    {
        "name": "Clive Thompson",
        "verified": "false"
    }

    {
        "verified": "false"
    }
    */
    const { name, role, verified, activated, page, limit } = req.query;
    const where = {};

    if (name) where.name = name;

    if (role) {

        if (Object.keys(ROLE_LEVELS).includes(role)) {
            where.role = role;
        } else {
            return res.status(400).json({ error: "role not valid" });
        }
    }
    if (verified !== undefined) {
        if (verified !== 'true' && verified !== 'false') {
            return res.status(400).json({ error: "verified not valid" });
        }
        else {
            where.verified = verified === "true";
        }
    }

    if (activated !== undefined) {
        if (activated === 'true') {
            where.lastLogin = { not: null };
        } else if (activated === 'false') {
            where.lastLogin = null;
        }
        else {
            return res.status(400).json({ error: "activated not valid" });
        }
    }

    // const pageNum = page ? parseInt(page, 10) : 1;
    // const limitNum = limit ? parseInt(limit, 10) : 10;

    // if (isNaN(page) || parseInt(page, 10) <  1) {
    //     return res.status(400).json({ error: "page not valid" });
    // }

    // if (isNaN(limit) || parseInt(limit) < 1) {
    //     return res.status(400).json({ error: "limit not valid" });
    // }

    //not sure why but it only passes when i write it out explicitly like below
    let pageNum = 1;
    let limitNum = 10;

    if (page !== undefined) {
        if (parseInt(page, 10) < 1 || isNaN(page)) {
            return res.status(400).json({ "error": "Invalid type for page" });
        }

        pageNum = parseInt(page);
    }

    if (limit !== undefined) {
        if (parseInt(limit, 10) < 1 || isNaN(limit)) {
            return res.status(400).json({ "error": "Invalid type for limit" });
        }

        limitNum = parseInt(limit);
    }

    const skip = (pageNum - 1) * limitNum;
    const take = limitNum;

    try {
        const totalCount = await prisma.user.count({ where });
        const totalPages = Math.ceil(totalCount / limitNum);

        // if (totalCount === 0) {
        //     return res.status(200).json({ count: 0, results: [] });
        // }

        if (pageNum < 1 || pageNum > totalPages) {
            return res.status(400).json({ error: "Invalid page number" });
        }

        const data = await prisma.user.findMany({
            where,
            skip,
            take,
            select: {
                id: true,
                utorid: true,
                name: true,
                email: true,
                birthday: true,
                role: true,
                points: true,
                createdAt: true,
                lastLogin: true,
                verified: true,
                avatarUrl: true
            }
        });


        // Respond with updated note
        return res.status(200).json({
            count: totalCount,
            results: data
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database error" });
    }
});

app.patch('/users/me', get_logged_in, check_clearance("regular"), async (req, res) => {
    /*
    · Method: PATCH
    · Description: Update the current logged-in user's information
    · Clearance: Regular or higher
    · Payload:
    Field Required Type Description
    name No string 1-50 characters
    email No string Unique, Valid UofT email
    birthday No string A date in the format of YYYY-MM-DD
    avatar No file Image file for the user's avatar

    · Response:
    { "id": 1,
     "utorid": "johndoe1",
     "name": "John Doe",
     "email": "john.doe@mail.utoronto.ca",
     "birthday": "2000-01-01",
     "role": "regular",
     "points": 0,
     "createdAt": "2025-02-22T00:00:00.000Z",
     "lastLogin": "2025-02-22T00:00:00.000Z",
     "verified": true,
     "avatarUrl": "/uploads/avatars/johndoe1.png" 
     }
    */
    const { name, email, birthday, avatarUrl } = req.body;
    const data = {};

    if (!name && !email && !birthday && !avatarUrl) {
        return res.status(400).json({ error: "Payload empty" });
    }

    if (name) {
        if (name.length > 50 || name.length < 1) {
            return res.status(400).json({ error: "Name too long" });
        }

        data.name = name;
    }

    if (email) {
        // Validate email is from UofT
        if (!email.includes("@mail.utoronto.ca")) {
            return res.status(400).json({ error: "Email not proper format" });
        }

        data.email = email;
    }

    if (birthday !== undefined && birthday !== null) {
        const bday = new Date(birthday);
        if (!isNaN(bday.getTime())) {
            if (bday < Date()) {
                return res.status(400).json({ "error": "Birthday cannot be in the past" });
            }

            const [year, month, day] = birthday.split("-").map(Number);

            if (!(
                bday.getUTCFullYear() === year &&
                bday.getUTCMonth() + 1 === month &&
                bday.getUTCDate() === day)) {
                return res.status(400).json({ "error": "Invalid birthday format" });
            }

            data.birthday = bday.toISOString();
        } else {
            return res.status(400).json({ "error": "Birthday entered incorrectly" });
        }
    }

    if (avatarUrl) data.avatarUrl = avatarUrl;

    try {
        const updated_user = await prisma.user.update({
            where: { id: req.user.id },
            data
        });

        const bday = updated_user.birthday.toISOString().split("T")[0];

        // Respond with updated note
        return res.status(200).json({
            id: updated_user.id,
            utorid: updated_user.utorid,
            name: updated_user.name,
            email: updated_user.email,
            birthday: bday,
            role: updated_user.role,
            points: updated_user.points,
            createdAt: updated_user.createdAt,
            lastLogin: updated_user.lastLogin,
            verified: updated_user.verified,
            avatarUrl: updated_user.avatarUrl
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database error" });
    }
});

app.get('/users/me', get_logged_in, check_clearance("regular"), async (req, res) => {
    /*
    · Method: GET
    · Description: Retrieve the current logged-in user's information
    · Clearance: Regular or higher
    · Payload: None
    
    · Response: { "id": 1, "utorid": "johndoe1", "name": "John Doe", "email": "john.doe@mail.utoronto.ca", "birthday": "2000-01-01", "role": "regular", "points": 0, "createdAt": "2025-02-22T00:00:00.000Z", "lastLogin": "2025-02-22T00:00:00.000Z", "verified": true, "avatarUrl": "/uploads/avatars/johndoe1.png", "promotions": [] }
    */
    const user = req.user;

    const promos = await prisma.usage.findMany({
        where: { userId: user.id },
        include: { promotion: true },
    });

    return res.status(200).json({
        id: user.id,
        utorid: user.utorid,
        name: user.name,
        email: user.email,
        birthday: user.birthday,
        role: user.role,
        points: user.points,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        verified: user.verified,
        avatarUrl: user.avatarUrl,
        promotions: promos
    });
});

app.patch('/users/me/password', get_logged_in, check_clearance("regular"), async (req, res) => {
    /*
    · Method: PATCH
    · Description: Update the current logged-in user's password
    · Clearance: Regular or higher
    · Payload:
    Field Required Type Description
    old Yes string The user's current password
    new Yes string 8-20 characters, at least one uppercase, one lowercase, one number, one special character

    · Response:
    o 200 OK on success
    o 403 Forbidden if the provided current password is incorrect
    */
    const oldPass = req.body.old;
    const newPass = req.body.new;

    if (oldPass === undefined || newPass === undefined) {
        return res.status(400).json({ error: "Payload Empty" });
    }

    if (!oldPass || !newPass) {
        return res.status(400).json({ error: "Payload Empty" });
    }

    if (!validPassword(newPass)) {
        return res.status(400).json({ error: "New password wrong format" });
    }

    try {
        if (req.user.password !== oldPass) {
            return res.status(403).json({ error: "Old password is incorrect" });
        }

        const now = Date.now();
        const expires = new Date(req.user.expiresAt);

        if (expires < now) {
            return res.status(400).json({ error: "Token expired" });
        }

        const updated_user = await prisma.user.update({
            where: { id: req.user.id },
            data: { password: newPass }
        });

        // Respond with updated note
        return res.status(200).json({
            new_password: updated_user.password
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database error" });
    }
});

app.get('/users/:userId', get_logged_in, check_clearance("cashier"), async (req, res) => {
    /*
    · Method: GET
    · Description: Retrieve a specific user
    · Clearance: Cashier or higher
    · Payload: None

    · Response: {
    "id": 1, 
    "utorid": "johndoe1", 
    "name": "John Doe", 
    "points": 0, 
    "verified": false, 
    "promotions": [ { "id" : 2, "name" : "Buy a pack of Pepsi", "minSpending": null, "rate": null, "points": 20 } ] }

    Note that the cashier can only see limited information regarding the user. promotions should only show one-time promotions that are still available to the user, i.e., they have not used those promotions yet.
    */

    /*
    · Method: GET
    · Description: Retrieve a specific user
    · Clearance: Manager or higher
    · Payload: None

    Response: {
    "id": 1,
    "utorid": "johndoe1",
    "name": "John Doe", 
    "email": "john.doe@mail.utoronto.ca",
    "birthday": "2000-01-01",
    "role": "regular",
    "points": 0,
    "createdAt": "2025-02-22T00:00:00.000Z",
    "lastLogin": "2025-02-22T00:00:00.000Z",
    "verified": false,
    "avatarUrl": null,
    "promotions": [ { "id" : 2, "name" : "Buy a pack of Pepsi", "minSpending": null, "rate": null, "points": 20 } ]
    }

    TESTING:
    http://localhost:3000/users/1
    http://localhost:3000/users/2
    */
    const clearance = String(req.user.role).toLowerCase();
    const high_clearance = clearance === "manager" || clearance === "superuser";
    const target_id = parseInt(req.params.userId, 10);

    if (isNaN(target_id)) {
        return res.status(400).json({ error: "?userId must be positive number" });
    }

    try {
        const promotions = await prisma.usage.findMany({
            where: { userId: target_id },
            include: { promotion: true },
        });
        const promos = promotions.map(u => {
            return {
                id: u.promotion.id,
                name: u.promotion.name,
                minSpending: u.promotion.minSpending,
                rate: u.promotion.rate,
                points: u.promotion.points
            }
        });
        let data;

        if (high_clearance) {
            data = await prisma.user.findUnique({
                where: { id: target_id },
                select: {
                    id: true,
                    utorid: true,
                    name: true,
                    email: true,
                    birthday: true,
                    role: true,
                    points: true,
                    createdAt: true,
                    lastLogin: true,
                    verified: true,
                    avatarUrl: true
                }
            });
        } else {
            data = await prisma.user.findUnique({
                where: { id: target_id },
                select: {
                    id: true,
                    utorid: true,
                    name: true,
                    points: true,
                    verified: true,
                }
            });
        }

        // Respond with updated note
        return res.status(200).json({
            ...data,
            promotions: promos
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database error" });
    }
});

app.patch('/users/:userId', get_logged_in, check_clearance("manager"), async (req, res) => {
    /*
    · Method: PATCH
    · Description: Update a specific user's various statuses and some information
    · Clearance: Manager or higher
    · Payload:
    Field Required Type Description
    email No string In case it was entered incorrectly during registration
    verified No boolean Should always be set to true
    suspicious No boolean true or false
    role No string As Manager: Either "cashier" or "regular" As Superuser: Any of "regular", "cashier", "manager", or "superuser"

    · Response: only the field(s) that were updated will be returned, e.g., when the suspicious field is updated: { 
    "id": 1, 
    "utorid": "johndoe1", 
    "name": "John Doe", 
    "suspicious": true, 
    }

    When promoting a user to a cashier, the initial value for suspicious must be false, meaning that a suspicious user can not be a cashier.

    TESTING:
    http://localhost:3000/users/2
    {
        "verified": "true",
        "email": "dimi67@mail.utoronto.ca"
    }
    */
    const currentUser = req.user;
    const target_id = parseInt(req.params.userId, 10);

    const findUser = await prisma.user.findUnique({
        where: { id: target_id }
    })

    if (!findUser) {
        return res.status(404).json({ error: "Not found" });
    }


    const { email, verified, suspicious, role } = req.body;
    const data = {};

    if (!email && !verified && !suspicious && !role) {
        return res.status(400).json({ error: "Payload empty" });
    }

    if (isNaN(target_id)) {
        return res.status(400).json({ error: "?userId must be positive number" });
    }

    if (email) {
        // Validate email is from UofT
        if (typeof email !== 'string' || !email.includes("@mail.utoronto.ca")) {
            return res.status(400).json({ error: "Email not proper format" });
        }

        data.email = email;
    }

    // if (verified && verified !== undefined) {
    //     const temp = String(verified).toLowerCase();
    //     if (temp !== 'true'){
    //         return res.status(400).json({ error: "verified must be true" });
    //     }

    //     data.verified = temp === "true";
    // }

    // if (suspicious && suspicious !== undefined) {
    //     const temp = String(suspicious).toLowerCase();
    //     if (temp !== 'true' && temp !== 'false'){
    //         return res.status(400).json({ error: "suspicious not valid" });
    //     }

    //     data.suspicious = temp === "true";
    // }
    // if (verified) data.verified = verified;
    // if (suspicious) data.suspicious = suspicious;

    if (verified !== undefined && verified !== null) {
        if (typeof verified === "boolean" && verified) { //must be true
            if (!findUser.verified) {
                data.verified = verified;
            }
        }
        else {
            return res.status(400).json({ error: "Invalid payload" });
        }
    }

    if (suspicious !== undefined && suspicious !== null)
        if (typeof suspicious === "boolean") {
            if (findUser.suspicious !== suspicious) {
                data.suspicious = suspicious;
            }
        }
        else {
            return res.status(400).json({ error: "Invalid payload" });
        }

    // As Manager: Either "cashier" or "regular" 
    // As Superuser: Any of "regular", "cashier", "manager", or "superuser"
    const roles = ["regular", "cashier", "manager", "superuser"]
    if (role !== undefined && role !== null) {
        if (typeof role === "string" && roles.includes(role)) {
            if ((role === "manager" || role === "superuser") && currentUser.role !== "superuser") {
                return res.status(403).json({ error: "Invalid payload" });
            }

            if (findUser.role !== role) {
                data.role = role;
            }

        }

        else {
            return res.status(400).json({ error: "Invalid payload" });
        }
    }

    const select = {
        id: true,
        utorid: true,
        name: true,
    };

    Object.keys(data).forEach(key => {
        select[key] = true
    })

    try {
        // const target_user = await prisma.user.findUnique({
        //     where: {id: target_id}
        // });

        // if (role === "cashier" && target_user.suspicious === true) {
        //     return res.status(400).json({ error: `Cannot promote sus to cashier` });
        // }

        const updated_user = await prisma.user.update({
            where: { id: target_id },
            data,
            select
        })

        // Respond with updated note
        return res.status(200).json(updated_user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database error" });
    }
});

app.post('/auth/tokens', async (req, res) => {
    /*
    // LOG IN USER
    · Method: POST
    · Description: Authenticate a user and generate a JWT token
    · Clearance: Any
    · Payload:
    Field Required Type Description
    utorid Yes string The utorid of a user
    password Yes string The password of the user with the specified utorid

    · Response: { "token": "jwt_token_here", "expiresAt": "2025-03-10T01:41:47.000Z" }
    */
    const { utorid, password } = req.body;

    if (!utorid || !password) {
        return res.status(400).json({ error: "Utorid or password missing" });
    }

    const jwt = generateToken(utorid, '7d');
    let curr_time = new Date().toISOString();
    let week_later = new Date();
    week_later.setDate(week_later.getDate() + 7);
    week_later = week_later.toISOString();

    try {
        const existing = await prisma.user.findUnique({
            where: { utorid }
        });

        if (!existing) {
            return res.status(401).json({ message: "User with provided utorid and password does not exist." });
        } else if (existing && existing.password !== password) {
            return res.status(401).json({ message: "Incorrect password" });
        }

        let data = {};
        data.token = jwt;
        data.createdAt = curr_time;
        data.lastLogin = curr_time;
        data.expiresAt = week_later;

        const updated_user = await prisma.user.update({
            where: {
                utorid: utorid
            },
            data,
            select: {
                token: true,
                expiresAt: true
            }
        });

        // Respond with updated note
        return res.status(200).json(updated_user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database error" });
    }
});

app.post('/auth/resets', async (req, res) => {
    /*
    · Method: POST
    · Description: Request a password reset token.
    · Clearance: Any
    · Payload:
    Field Required Type Description
    utorid Yes string The utorid of a user who forgot their password

    · Response
    o 202 Accepted on success 
    { 
    "expiresAt": "2025-03-01T01:41:47.000Z", 
    "resetToken": "ad71d4e1-8614-46aa-b96f-cb894e346506" 
    }
    o 429 Too Many Requests if another request is made from the same IP address within 60 seconds. Hint: your rate limiter can be implemented completely in memory. You may not use express-rate-limit, since we do not allow you to install additional packages (if you do, the autotester will break).

    If an account with the specified utorid exists, a reset token expiring in 1 hour will be generated.
    */
    const { utorid } = req.body;

    if (!utorid) {
        return res.status(400).json({ message: "Empty payload" });
    }

    try {
        const existing = await prisma.user.findUnique({
            where: { utorid: utorid }
        });

        if (!existing) {
            return res.status(404).json({ message: "A user with that utorid does not exist" });
        }

        const resetToken = uuidv4();
        const now = Date.now();
        const expires = new Date(existing.expiresAt).getTime();

        if (expires < now) {
            return res.status(410).json({ message: "Expired token" });
        }

        // ------------------>
        // RATE LIMIT
        // ------------------>
        const ip = req.ip;   // get ip address

        // Clean up old entries
        for (const [storedIp, timestamp] of Object.entries(resetRate)) {
            if (now - timestamp > 60000) { // Older than 60 seconds
                delete resetRate[storedIp];
            }
        }

        if (resetRate[ip] && (now - resetRate[ip]) < 60000) {
            return res.status(429).json({ message: "Too many requests" });
        }

        resetRate[ip] = now; // update timestamp

        const hour_later = new Date();
        hour_later.setHours(hour_later.getHours() + 1);

        const updated_user = await prisma.user.update({
            where: { utorid: utorid },
            data: {
                token: resetToken,
                expiresAt: hour_later.toISOString()
            }
        });

        // Respond with updated note
        return res.status(202).json({
            expiresAt: updated_user.expiresAt,
            "resetToken": updated_user.token
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database error" });
    }
});

app.post('/auth/resets/:resetToken', async (req, res) => {
    /*
    reset password
    · Method: POST
    · Description: Reset the password of a user given a reset token.
    · Clearance: Any
    · Payload:
    Field Required Type Description
    utorid Yes string The utorid of a user who requested a password reset
    password Yes string 8-20 characters, at least one uppercase, one lowercase, one number, one special character

    · Response
    o 200 OK on success
    o 404 Not Found if the reset token does not exist.
    o 410 Gone if the reset token expired.
    */
    const resetToken = req.params.resetToken;
    const { utorid, password } = req.body;

    if (!resetToken || !utorid || !password) {
        return res.status(400).json({ error: "Must provide a reset token,utorid, and password" });
    }

    if (!validPassword(password)) {
        return res.status(400).json({ error: "password given was incorrect" });
    }

    try {
        const curr_time = new Date().toISOString();
        const existing = await prisma.user.findUnique({
            where: { token: resetToken }
        });

        if (!existing) {
            return res.status(404).json({ message: "A user with that utorid does not exist" });
        }

        if (existing.expiresAt.toISOString() < curr_time) {
            return res.status(410).json({ message: "Token has expired" });
        }

        if (existing.utorid !== utorid) {
            return res.status(401).json({ message: "Utorid token pairing wrong" });
        }

        const updated_user = await prisma.user.update({
            where: { token: resetToken },
            data: {
                password: password
            }
        });

        // Respond with updated note
        return res.status(200).json({ "success": "password created" })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database error" });
    }
});


//TRANSACTIONS

app.post('/transactions', get_logged_in, async (req, res) => {
    /*
    · Method: POST
    · Description: Create a new purchase transaction.
    · Clearance: Cashier or higher
    · Payload:
    Field Required Type Description
    utorid Yes string The utorid of the customer making a purchase
    type Yes string Must be "purchase"
    spent Yes number The dollar amount spent in this transaction. Must be a positive numeric value.
    promotionIds No array The IDs of promotions to apply to this transaction
    remark No string Any remark regarding this transaction

    · Response
    o 201 Created on success { "id": 123, "utorid": "johndoe1", "type": "purchase", "spent": 19.99, "earned": 80, "remark": "", "promotionIds": [42], "createdBy": "alice666" }
    o 400 Bad Request when any of the specified promotion IDs are invalid for any reason, e.g., does not exist, expired, or have been used already.

    After a purchase is made, the earned amount is automatically added to the user's points balance, unless the cashier processing the transaction is flagged as suspicious. For a regular

    purchase transaction without additional promotions, the rate of earning points is 1 point per 25 cents spent (rounded to nearest integer).
    */

    console.log('\n==== /transactions called ====');
    console.log('Incoming request body:', req.body);

    const { utorid, type, spent, amount, relatedId, remark = '' } = req.body;
    const createdBy = req.user.utorid;
    const userRole = req.user.role.toUpperCase();

    let promotionIds = [];
    if (typeof req.body.promotionIds === 'string') {
        promotionIds = req.body.promotionIds.split(',').map(Number);
    } else if (Array.isArray(req.body.promotionIds)) {
        promotionIds = req.body.promotionIds;
    }

    console.log('Parsed values:');
    console.log({ utorid, type, spent, amount, relatedId, remark, createdBy, userRole, promotionIds });

    try {
        // type & clearance checks
        console.log('Validating type and role...');
        if (type !== 'purchase' && type !== 'adjustment') {
            console.log('❌ Invalid type');
            return res.status(400).json({ error: 'type must be "purchase" or "adjustment"' });
        }

        if (type === 'purchase' && !['CASHIER', 'MANAGER', 'SUPERUSER'].includes(userRole)) {
            console.log('❌ Insufficient clearance for purchase');
            return res.status(403).json({ error: 'insufficient clearance for purchase transactions' });
        }
        if (type === 'adjustment' && !['MANAGER', 'SUPERUSER'].includes(userRole)) {
            console.log('❌ Insufficient clearance for adjustment');
            return res.status(403).json({ error: 'insufficient clearance for adjustment transactions' });
        }

        console.log('✅ Type and role validation passed');

        // find user
        const user = await prisma.user.findUnique({ where: { utorid } });
        console.log('Fetched user from DB:', user);

        if (!user) {
            console.log('❌ User not found');
            return res.status(400).json({ error: 'user not found' });
        }

        // Validate promotions
        console.log('Validating promotions...');
        const promotions = [];
        const now = new Date();

        for (const promotionId of promotionIds) {
            console.log(`Checking promotion ${promotionId}...`);
            const promotion = await prisma.promotion.findUnique({ where: { id: promotionId } });

            if (!promotion) {
                console.log(`❌ Promotion ${promotionId} not found`);
                return res.status(400).json({ error: `promotion ${promotionId} not found` });
            }

            console.log('Promotion found:', promotion);

            if (promotion.startTime > now || promotion.endTime < now) {
                console.log(`❌ Promotion ${promotionId} inactive (outside time range)`);
                return res.status(400).json({ error: `promotion ${promotionId} is inactive` });
            }

            if (
                type === 'purchase' &&
                promotion.minSpending != null &&
                typeof spent === 'number' &&
                spent < promotion.minSpending
            ) {
                console.log(`❌ Promotion ${promotionId} minSpending not met`);
                return res.status(400).json({ error: `promotion ${promotionId} minSpending not met` });
            }

            const usage = await prisma.usage.findFirst({
                where: { userId: user.id, promotionId: promotion.id },
            });

            console.log(`Usage for promotion ${promotionId}:`, usage);

            if (usage) {
                console.log(`❌ Promotion ${promotionId} already used`);
                return res.status(400).json({ error: `promotion ${promotionId} already used` });
            }

            console.log(`✅ Promotion ${promotionId} validation passed`);
            promotions.push(promotion);
        }

        console.log('All promotions validated successfully');

        let transaction;

        if (type === 'purchase') {
            console.log('Processing purchase transaction...');
            if (typeof spent !== 'number' || spent <= 0) {
                console.log('❌ Invalid spent value');
                return res.status(400).json({ error: 'spent must be a positive number' });
            }

            // base points
            let earnedPoints = Math.round(spent / 0.25);
            console.log('Base earned points:', earnedPoints);

            // promotions
            for (const promotion of promotions) {
                const promoRate = promotion.rate ?? 0;
                const promoFlat = promotion.points ?? 0;

                const extraFromRate = Math.round(spent * 100 * promoRate);
                earnedPoints += extraFromRate + promoFlat;

                console.log(`Applied promo ${promotion.id}: +${extraFromRate} (rate), +${promoFlat} (flat)`);
            }

            console.log('Total earned points before suspicious check:', earnedPoints);

            const earnedFinal = req.user.suspicious ? 0 : earnedPoints;

            transaction = await prisma.transaction.create({
                data: {
                    utorid,
                    type,
                    spent,
                    earned: earnedFinal,
                    amount: earnedPoints,
                    remark,
                    createdBy,
                    suspicious: req.user.suspicious,
                    promotions: { connect: promotions.map(p => ({ id: p.id })) },
                    processed: false,
                },
                include: { promotions: true },
            });

            console.log('Transaction created in DB:', transaction);

            if (!req.user.suspicious) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { points: user.points + earnedPoints },
                });
                console.log(`✅ Updated user ${user.utorid} points: +${earnedPoints}`);
            } else {
                console.log(`⚠️ Skipped user point update (suspicious cashier)`);
            }

        } else if (type === 'adjustment') {
            console.log('Processing adjustment transaction...');
            if (typeof amount !== 'number') {
                console.log('❌ Invalid adjustment amount');
                return res.status(400).json({ error: 'amount must be a number' });
            }

            const relatedTransaction = await prisma.transaction.findUnique({
                where: { id: parseInt(relatedId, 10) },
            });
            console.log('Related transaction fetched:', relatedTransaction);

            if (!relatedTransaction) {
                console.log('❌ Related transaction not found');
                return res.status(404).json({ error: 'related transaction not found' });
            }

            transaction = await prisma.transaction.create({
                data: {
                    utorid,
                    type,
                    amount,
                    relatedId: parseInt(relatedId, 10),
                    spent: 0,
                    earned: 0,
                    remark,
                    createdBy,
                    promotions: { connect: promotions.map(p => ({ id: p.id })) },
                    suspicious: false,
                    processed: false,
                },
                include: { promotions: true },
            });

            console.log('Adjustment transaction created:', transaction);

            await prisma.user.update({
                where: { id: user.id },
                data: { points: user.points + amount },
            });
            console.log(`✅ Adjusted user ${user.utorid} points by ${amount}`);
        }

        // record promo usage
        console.log('Creating usage records for promotions...');
        for (const promotion of promotions) {
            await prisma.usage.create({
                data: { userId: user.id, promotionId: promotion.id },
            });
            console.log(`✅ Recorded usage for promotion ${promotion.id}`);
        }

        // construct response
        const response = {
            id: transaction.id,
            utorid: transaction.utorid,
            type: transaction.type,
            remark: transaction.remark,
            promotionIds: (transaction.promotions || []).map(p => p.id),
            createdBy: transaction.createdBy,
        };

        if (type === 'purchase') {
            response.spent = transaction.spent;
            response.earned = transaction.earned;
        } else {
            response.amount = transaction.amount;
            response.relatedId = transaction.relatedId;
        }

        console.log('Final response object:', response);
        console.log('==== /transactions completed successfully ====\n');

        return res.status(201).json(response);

    } catch (err) {
        console.error('💥 Error in /transactions:', err);
        return res.status(500).json({ error: 'failed to create transaction' });
    }
});



app.get('/transactions', get_logged_in, check_clearance("manager"), async (req, res) => {
    /*
 · Method: GET
 · Description: Retrieve a list of transactions
 · Clearance: Manager or higher
 · Payload:
 Field Required Type Description
 name No string Filter by utorid or name
 createdBy No string Filter by the user who created the transaction
 suspicious No boolean Filter by whether the transaction is flagged as suspicious
 promotionId No number Filter by a promotion applied to the transaction
 type No string Filter by transaction type (can be used without relatedId)
 relatedId No number Filter by related ID (must be used with type)
 amount No number Filter by point amount (must be used with operator)
 operator No string One of "gte" (greater than or equal) or "lte" (less than or equal)
 page No number Page number for pagination (default is 1)
 limit No number Number of objects per page (default is 10)

 · Response: count, which stores the total number of results (after applying all filters), and results, which contains a list of transactions { "count": 21, "results": [ { "id": 123, "utorid": "johndoe1", "amount": 80, "type": "purchase", "spent": 19.99, "promotionIds": [], "suspicious": false, "remark": "", "createdBy": "alice666" }, { "id": 124, "utorid": "johndoe1", "amount": -1000, "type": "redemption", // see POST /users/me/transactions for redemption transactions

 "relatedId": 666, "promotionIds": [], "redeemed": 1000, "remark": "", "createdBy": "johndoe1" }, { "id": 125, "utorid": "johndoe1", "amount": -40, "type": "adjustment", "relatedId": 123, "promotionIds": [], "suspicious": false, "remark": "", "createdBy": "smithw42" }, // More transaction objects... ] }

 For the relatedId field, its value will be dependent on the type of the transaction:
     · Adjustment: the ID of the transaction for which the adjustment is being made to.
     · Transfer: the ID of the other user, i.e., for the sender's transaction, relatedId is the ID of the receiver; for the receiver's transaction, relatedId is the ID of the sender.
     · Redemption: the user ID of the cashier who processed the redemption -- can be null if the redemption has not been processed yet.
     · Event: the ID of the event from which points were disbursed.
 */

    const { name, createdBy, suspicious, promotionId, type, relatedId, amount, operator, page: qpage, limit } = req.query;
    try {
        let page = 1;
        let take = 10;
        const filters = {};

        if (name) {
            filters.utorid = { contains: name.toLowerCase() };
        }

        if (createdBy) {
            filters.createdBy = createdBy;
        }

        if (suspicious !== null && suspicious !== undefined) {
            filters.suspicious = suspicious === 'true';
        }

        if (promotionId && promotionId !== undefined) {
            filters.promotions = { some: { id: parseInt(promotionId) } };
        }

        if (type && type !== undefined) {
            filters.type = type;
        }

        if (relatedId && relatedId !== undefined) {
            if (!type) {
                return res.status(400).json({ error: 'relatedId must be used with type' });
            }
            filters.relatedId = parseInt(relatedId);
        }

        if (amount !== null && amount !== undefined) {
            if (!operator || !['gte', 'lte'].includes(operator)) {
                return res.status(400).json({ error: 'operator must be "gte" or "lte" when filtering by amount' });
            }
            filters.amount = { [operator]: parseFloat(amount) };
        }

        if (qpage !== undefined) {
            if (parseInt(qpage) < 0 || isNaN(qpage)) {
                return res.status(400).json({ "error": "Invalid type for page" });
            }

            page = parseInt(qpage);
        }

        if (limit !== undefined) {
            if (parseInt(limit) < 0 || isNaN(limit)) {
                return res.status(400).json({ "error": "Invalid type for limit" });
            }

            take = parseInt(limit);
        }

        const skip = (page - 1) * take;

        const count = await prisma.transaction.count({ where: filters });

        const transactions = await prisma.transaction.findMany({
            where: filters,
            skip: skip,
            take: take,
            include: {
                promotions: {
                    select: {
                        id: true,
                    },
                },
            }
            // },
            // orderBy: {
            //     createdAt: 'desc'
            // }
        });

        const results = transactions.map((transaction) => {
            const baseResponse = {
                id: transaction.id,
                utorid: transaction.utorid,
                amount: transaction.type.toLowerCase() === 'event' ? transaction.earned : transaction.amount,
                type: transaction.type,
                spent: transaction.spent,
                promotionIds: transaction.promotions.map((promotion) => promotion.id),
                suspicious: transaction.suspicious,
                remark: transaction.remark,
                createdBy: transaction.createdBy,
                //createdAt: transaction.createdAt,
                name: transaction.user?.name || null
            };

            if (['adjustment', 'transfer', 'redemption', 'event']
                .includes(transaction.type.toLowerCase())) {
                baseResponse.relatedId = transaction.relatedId;
            }

            if (transaction.type.toLowerCase() === 'redemption') {
                baseResponse.redeemed = Math.abs(transaction.amount);
            }

            return baseResponse;
        });

        res.status(200).json({
            count,
            results,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'failed to retrieve transactions' });
    }
});

app.patch('/transactions/:transactionId/suspicious', get_logged_in, check_clearance("manager"), async (req, res) => {
    /*
· Method: PATCH
· Description: Set or unset a transaction as being suspicious
· Clearance: Manager or higher
· Payload:
Field Required Type Description
suspicious Yes boolean true or false

· Response: { "id": 123, "utorid": "johndoe1", "type": "purchase", "spent": 19.99, "amount": 80, "promotionIds": [], "suspicious": true, "remark": "", "createdBy": "alice666" }

When marking a transaction as suspicious (changing the flag from false to true), the amount should be immediately deducted from the user's points balance, which may result in a negative balance. Conversely, when verifying a transaction as not suspicious (changing the flag from true to false), the amount should be immediately credited to the user's points balance.
*/
    const { transactionId } = req.params;
    const { suspicious } = req.body;

    try {
        const transaction = await prisma.transaction.findUnique({
            where: { id: parseInt(transactionId) },
            include: {
                promotions: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        if (!transaction) {
            return res.status(404).json({ error: 'transaction not found' });
        }

        const user = await prisma.user.findUnique({
            where: { utorid: transaction.utorid },
        });

        if (!user) {
            return res.status(404).json({ error: 'user not found' });
        }

        let newPoints = user.points;
        if (suspicious && !transaction.suspicious) {
            newPoints = Math.max(0, user.points - transaction.amount);
        } else if (!suspicious && transaction.suspicious) {
            newPoints = user.points + transaction.amount;
        }

        const [updatedTransaction] = await prisma.$transaction([
            prisma.transaction.update({
                where: { id: parseInt(transactionId) },
                data: {
                    suspicious,
                    // amount: Math.round(newPoints)
                },
                include: {
                    promotions: {
                        select: { id: true },
                    },
                },
            }),
            prisma.user.update({
                where: { utorid: transaction.utorid },
                data: { points: Math.round(newPoints) },
            })
        ]);

        const response = {
            id: updatedTransaction.id,
            utorid: updatedTransaction.utorid,
            type: updatedTransaction.type,
            spent: updatedTransaction.spent,
            amount: updatedTransaction.amount,
            promotionIds: updatedTransaction.promotions.map((promotion) => promotion.id),
            suspicious: updatedTransaction.suspicious,
            remark: updatedTransaction.remark,
            createdBy: updatedTransaction.createdBy,
        };

        res.status(200).json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'failed to update transaction suspicious flag' });
    }
});


app.get('/transactions/:transactionId', get_logged_in, check_clearance("manager"), async (req, res) => {
    /*
   · Method: GET
   · Description: Retrieve a single transaction
   · Clearance: Manager or higher
   · Payload: None

   · Response: {
   "id": 123, "utorid": "johndoe1", "type": "purchase", "spent": 19.99, "amount": 80, "promotionIds": [], "suspicious": false, "remark": "", "createdBy": "alice666"}
   */
    const { transactionId } = req.params;
    try {
        const transaction = await prisma.transaction.findUnique({
            where: { id: parseInt(transactionId) },
            include: {
                promotions: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        if (!transaction) {
            return res.status(404).json({ error: 'transaction not found' });
        }

        let response = {
            id: transaction.id,
            utorid: transaction.utorid,
            type: transaction.type,
            spent: transaction.spent,
            amount: transaction.amount,
            relatedId: transaction.relatedId,
            promotionIds: transaction.promotions.map((promotion) => promotion.id),
            suspicious: transaction.suspicious,
            remark: transaction.remark,
            createdBy: transaction.createdBy,
        };

        return res.status(200).json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'failed to retrieve transaction' });
    }
});


app.post('/users/me/transactions', get_logged_in, async (req, res) => {
    const currentUser = req.user;
    if (!currentUser.verified) {
        return res.status(403).json({ "error": "Unverified user" });
    }

    const { type, amount, remark } = req.body;
    if (type === undefined && amount === undefined && remark === undefined) {
        return res.status(400).json({ "error": "Empty payload" });
    }
    else if (type === undefined || amount === undefined) {
        return res.status(400).json({ "error": "Invalid payload" }); //passed
    }

    if (currentUser.points < amount) {
        return res.status(400).json({ "error": "Insufficient points to be redeemed" }); //passed
    }

    const data = { utorid: currentUser.utorid, createdBy: currentUser.utorid, spent: 0, earned: 0, suspicious: false, awarded: 0, processed: false };

    if (type !== undefined) {
        if (typeof type === 'string' && type === 'redemption') {
            data.type = type;
        }
        else {
            return res.status(400).json({ "error": "Invalid transaction type" });
        }
    }
    if (amount !== undefined) {
        if (!isNaN(amount) && amount > 0) {
            data.amount = -(amount);
        }
        else {
            return res.status(400).json({ "error": "Invalid transaction amount" });
        }
    }
    if (remark !== undefined) {
        if (typeof remark === 'string') {
            data.remark = remark;
        }
        else {
            return res.status(400).json({ "error": "Invalid transaction remark" });
        }
    }

    const redeem = await prisma.transaction.create({
        data: data
    })

    const correspondingUser = await prisma.user.update({
        where: { id: currentUser.id },
        data: {
            cashiers: { connect: { id: redeem.id } }
        }
    })
    return res.status(201).json({ id: redeem.id, utorid: redeem.utorid, type: type, processedBy: redeem.processedBy, amount: amount, remark: remark, createdBy: redeem.createdBy })
})

app.get('/users/me/transactions', get_logged_in, async (req, res) => {
    const currentUser = req.user;

    const { type, relatedId, promotionId, amount, operator, page: qpage, limit } = req.query;
    let where = { utorid: currentUser.utorid };
    let page = 1;
    let take = 10;

    if (type !== undefined) {
        if (type === 'transfer') {
            if (relatedId !== undefined) {

                where.type = type;
                where.relatedId = relatedId;

            }
            else {
                return res.status(400).json({ "error": "Invalid payload" });
            }
        }
        else if (type === "promotion") {
            if (relatedId !== undefined) {
                where.type = type;
                where.relatedId = relatedId;

            }
            else {
                return res.status(400).json({ "error": "Invalid payload" });
            }
        }
        else if (type === "event") {
            if (relatedId !== undefined) {

                where.type = type;
                where.relatedId = relatedId;

            }
            else {
                return res.status(400).json({ "error": "Invalid payload" });
            }
        }
        else { //redemption or purchase, doesnt have a relatedId
            where.type = type;
        }
    }

    const transactions = await prisma.transaction.findMany({
        where,
        include: { promotions: true }
    })

    let filtered = transactions;
    if (promotionId !== undefined) {

        filtered = transactions.filter(t => {
            const found = t.promotions.filter(p => {
                return p.id === parseInt(promotionId);
            })

            if (found.length !== 0) {
                return t;
            }
        })

    }

    let roundTwo = filtered;
    if (amount !== undefined) {
        if (operator !== undefined) {
            if (operator === 'gte') {

                roundTwo = filtered.filter(t => {
                    return t.amount >= parseFloat(amount);
                })

            }
            else {
                roundTwo = filtered.filter(t => {
                    return t.amount <= parseFloat(amount);
                })
            }
        }
        else {
            return res.status(400).json({ "error": "Invalid payload" });
        }
    }

    if (qpage !== undefined) {
        if (parseInt(qpage) < 0) {
            return res.status(400).json({ "error": "Invalid type for page" });
        }

        page = parseInt(qpage);
    }

    if (limit !== undefined) {
        if (parseInt(limit) < 0) {
            return res.status(400).json({ "error": "Invalid type for limit" });
        }

        take = parseInt(limit);
    }

    const skip = (page - 1) * take;

    const result = roundTwo.map(e => {
        const { id, type, spent, amount, remark, createdBy, promotions, ...rest } = e;
        const promotionIds = promotions.map(promo => {
            return promo.id;
        })
        return { id, type, spent, amount, promotionIds, remark, createdBy };
    }).slice(skip, take + skip);


    return res.status(200).json({ count: roundTwo.length, results: result });
})


app.post('/users/:userId/transactions', get_logged_in, async (req, res) => {
    const userid = req.params.userId;

    const currentUser = req.user; //sender
    if (!currentUser.verified) {
        return res.status(403).json({ "error": "Unverified sender" });
    }

    const findUser = await prisma.user.findUnique({ //recipient
        where: { id: parseInt(userid) }
    })

    console.log(findUser);

    const { type, amount, remark } = req.body;
    if (type === undefined && amount === undefined && remark === undefined) {
        return res.status(400).json({ "error": "Empty payload" });
    }
    else if (type === undefined || amount === undefined) {
        return res.status(400).json({ "error": "Invalid payload" });
    }

    if (currentUser.points < amount) {
        return res.status(400).json({ "error": "Insufficient points" }); //passed up to here
    }

    const dataSender = { relatedId: parseInt(userid), sender: currentUser.utorid, createdBy: currentUser.utorid, recipient: findUser.utorid, utorid: currentUser.utorid, spent: 0, earned: 0, suspicious: false, awarded: 0, processed: false };
    const dataRecipient = { relatedId: currentUser.id, sender: currentUser.utorid, createdBy: currentUser.utorid, recipient: findUser.utorid, utorid: findUser.utorid, spent: 0, earned: 0, suspicious: false, awarded: 0, processed: false };

    if (type !== undefined) {
        if (typeof type === 'string' && type === 'transfer') {
            dataSender.type = type;
            dataRecipient.type = type;
        }
        else {
            return res.status(400).json({ "error": "Invalid transaction type" });
        }
    }
    if (amount !== undefined) {
        if (!isNaN(amount) && amount > 0) {
            dataSender.amount = -(amount);
            dataRecipient.amount = amount;
        }
        else {
            return res.status(400).json({ "error": "Invalid transaction amount" });
        }
    }
    if (remark !== undefined) {
        if (typeof remark === 'string') {
            dataSender.remark = remark;
            dataRecipient.remark = remark;
        }
        else {
            return res.status(400).json({ "error": "Invalid transaction remark" });
        }
    }

    const sender = await prisma.transaction.create({
        data: dataSender
    })

    const newPoints = currentUser.points + dataSender.amount; //less

    await prisma.user.update({
        where: { id: currentUser.id },
        data: {
            cashiers: { connect: { id: sender.id } },
            points: newPoints
        }
    })

    const recipient = await prisma.transaction.create({
        data: dataRecipient
    })

    const receivedPoints = findUser.points + dataRecipient.amount; //more

    await prisma.user.update({
        where: { id: findUser.id },
        data: {
            buyers: { connect: { id: sender.id } },
            points: receivedPoints
        }
    })

    return res.status(201).json({ id: sender.id, sender: sender.sender, recipient: sender.recipient, type: sender.type, sent: amount, remark: sender.remark, createdBy: sender.createdBy });
})


app.patch('/transactions/:transactionId/processed', get_logged_in, check_clearance("cashier"), async (req, res) => {
    const currentUser = req.user;
    const { processed } = req.body;

    // if(currentUser.role === 'regular') {
    //     return res.status(403).json({"error": "Only cashiers and higher can process a transaction"});
    // }

    const tid = req.params.transactionId;
    const transaction = await prisma.transaction.findUnique({
        where: { id: parseInt(tid) }
    })

    const user = await prisma.user.findUnique({
        where: { utorid: transaction.utorid }
    })

    if (!transaction || !user) {
        return res.status(404).json({ "error": "Not found" });
    }

    if (processed === undefined || (processed !== undefined && !processed) || transaction.type !== 'redemption' || transaction.processed) {
        return res.status(400).json({ "error": "Invalid payload" });
    }

    let newPoints = user.points + transaction.amount;
    const updatedTransaction = await prisma.transaction.update({
        where: { id: parseInt(tid) },
        data: {
            processedBy: currentUser.utorid,
            processed: true
        }
    })

    await prisma.user.update({
        where: { id: user.id },
        data: {
            points: newPoints, //should be less
            cashiers: { connect: { id: parseInt(tid) } } //recipient of this transaction
        }
    })

    return res.status(200).json({ id: updatedTransaction.id, utorid: updatedTransaction.utorid, type: updatedTransaction.type, processedBy: updatedTransaction.processedBy, redeemed: -(transaction.amount), remark: updatedTransaction.remark, createdBy: updatedTransaction.createdBy })
})

//EVENT ROUTES


app.get('/events', get_logged_in, async (req, res) => {
    const currentUser = req.user;
   
    const {name, location, started, ended, showFull, page: qpage, limit, published, order} = req.query;
    
    let where = {};
    let orderBy = {};
    let page = 1;
    let take = 10;
    //start filtering
    if (name !== undefined) {
        where.name = name;
    }
    if (location !== undefined) {
        where.location = location;
    }

    if (started !== undefined) {

        if (started === 'true') {
            where.startTime = { lt: new Date() };
        }
        else if (started === 'false') {
            where.startTime = { gt: new Date() };
        }
    }
    if (ended !== undefined) {

        if (ended === 'true') {
            where.endTime = { lt: new Date() };
        }
        else {
            where.endTime = { gt: new Date() };
        }
    }

    if (qpage !== undefined) {
        if (parseInt(qpage) < 0 || isNaN(qpage)) {
            return res.status(400).json({ "error": "Invalid type for page" });
        }

        page = parseInt(qpage);
    }

    if (limit !== undefined) {
        if (parseInt(limit) < 0 || isNaN(limit)) {
            return res.status(400).json({ "error": "Invalid type for limit" });
        }

        take = parseInt(limit);
    }

    const skip = (page - 1) * take;

    //check for errors
    if (started === 'true' && ended === 'true') {
        return res.status(400).json({ "error": "Start time and end time are listed. Only one should be provided." }); //passed
    }

    if (published !== undefined) {
        if (published === 'false') {
            if (currentUser.role === 'manager' || currentUser.role === 'superuser') {
                where.published = false;
            }
            else {
                return res.status(403).json({ "error": "Only managers or higher, can view published events" });
            } //passed
        }
        else {
            where.published = true;
        }
    }
    else if (published === undefined) {
        if (currentUser.role !== 'manager' && currentUser.role !== 'superuser') {
            where.published = true; //passed
        }
    }


    if(order !== undefined) {
        orderBy[order] = 'asc';
    }
    //console.log(order);
    //console.log(orderBy);

    const events = await prisma.event.findMany({
                    where,
                    orderBy,
                    include: {guests: true}
                })
   


    let filtered = events;

    if (showFull !== undefined) {
        if (showFull === 'false') {
            //showFull === 'false', show those not full?
            filtered = events.filter(event => {
                return (event.capacity > event.guests.length) || event.capacity === null;
            })
        }
    } //defined and true = show all events, full and not full
    else if (showFull === undefined) { //default false, not full
        filtered = events.filter(event => {
            return (event.capacity >= event.guests.length) || event.capacity === null;
        })
    }

    const resultRegular =
        filtered.map(event => {
            const { description, organizers, guests, published, pointsRemain, pointsAwarded, ...rest } = event;
            return { ...rest, numGuests: guests.length };
        }).slice(skip, take + skip);


    const resultHigher =
        filtered.map(event => {
            const { description, organizers, guests, ...rest } = event;
            return { ...rest, numGuests: guests.length };
        }).slice(skip, take + skip);

    if (currentUser.role === 'manager' || currentUser.role === 'superuser') {

        return res.status(200).json({ count: filtered.length, results: resultHigher });
    }
    else {
        return res.status(200).json({ count: filtered.length, results: resultRegular });
    }

    //return res.status(200).json({count: filtered.length, results: resultRegular}); 
})

app.post('/events', get_logged_in, check_clearance("manager"), async (req, res) => { //checked HTTP requests
    //Check that user is a manager or higher!!

    const currentUser = req.user;

    // if(!currentUser) {
    //     console.log(currentUser);
    //     return res.status(401).json({"error": "Unauthorized"}); //passed, this is actually caught by middleware
    // }
    // if(currentUser.role !== 'Manager' && currentUser.role !== 'Superuser') {
    //     console.log(currentUser.role);
    //     return res.status(403).json({"error": "Only managers or higher can create events"});
    // }

    const { name, description, location, startTime, endTime, capacity, points } = req.body;

    if (name === undefined && description === undefined && location === undefined && startTime === undefined && endTime === undefined && capacity === undefined && points === undefined) {
        return res.status(400).json({ "error": "Empty payload" }); //passed
    }
    else if (name === undefined || description === undefined || location === undefined || startTime === undefined || endTime === undefined || points === undefined) {
        return res.status(400).json({ "error": "Invalid payload" }); //passed
    }
    else {
        //validate the payload data types
        let dateobj = new Date(startTime);
        let dateobj2 = new Date(endTime);
        if(isNaN(dateobj.getTime()) || isNaN(dateobj2.getTime()) || (dateobj > dateobj2)) { //not a valid date
            return res.status(400).json({"error": "Invalid start and end times"}); //passed
        }

        if (capacity !== undefined && !isNaN(capacity) && capacity < 0) {
            return res.status(400).json({ "error": "Capacity cannot be negative" }); //passed
        }

        if (!isNaN(points) && points < 0) {
            return res.status(400).json({ "error": "Points cannot be negative" }); //passed
        }

        if (typeof name !== "string" || typeof description !== "string" || typeof location !== "string" || (capacity !== undefined && isNaN(capacity)) || isNaN(points)) {
            return res.status(400).json({ "error": "Invalid payload" });
        }

        //all payload values are valid!!
        const newEvent = await prisma.event.create({
            data: {
                name: name,
                description: description,
                location: location,
                startTime: startTime,
                endTime: endTime,
                capacity: capacity,
                pointsRemain: points,
                pointsAwarded: 0,
                published: false,

            },
            include: {
                organizers: true,
                guests: true
            }
        })
        return res.status(201).json(newEvent);
    }
})

app.get('/events/:eventId', get_logged_in, async (req, res) => {
    const currentUser = req.user;

    const eid = req.params.eventId;
    const event = await prisma.event.findUnique({
        where: { id: parseInt(eid) },
        include: { organizers: true, guests: true }
    })

    if (!event) {
        return res.status(404).json({ "error": "Not found" });
    }

    if (!event.published) {
        return res.status(404).json({ "error": "Event not published yet" });
    }

    const alreadyOrganizer = event.organizers.filter(org => {
        return org.id === currentUser.id;
    })

    if (currentUser.role === 'regular') {
        const { guests, published, pointsRemain, pointsAwarded, ...rest } = event;
        return res.status(200).json({ ...rest, numGuests: guests.length });
    }

    else if(alreadyOrganizer.length !== 0 || currentUser.role === 'manager' || currentUser.role === 'superuser') {
        const {guests, ...rest} = event;
        return res.status(200).json({...rest, numGuests: guests.length});
    } 
    
})

app.patch('/events/:eventId', get_logged_in, async (req, res) => { //checked https requests
    const currentUser = req.user;
    if (!currentUser) {
        return res.status(401).json({ "error": "Unauthorized" });
    }

    const eid = req.params.eventId;
    //fetch the event we want to update/patch up
    const event = await prisma.event.findUnique({
        where: { id: parseInt(eid) },
        include: { organizers: true, guests: true }
    })

    if (!event) {
        return res.status(404).json({ "error": "Event not found" });
    }

    const alreadyOrganizer = event.organizers.filter(org => {
        return org.id === currentUser.id;
    })

    //general clearance check
    if (!alreadyOrganizer.length !== 0 && currentUser.role !== 'manager' && currentUser.role !== 'superuser') {
        return res.status(403).json({ "error": "Only managers or higher, or event organizers can update events" });
    }

    const { name, description, location, startTime, endTime, capacity, points, published } = req.body;

    //what is the current date?
    const currentDate = new Date();

    //possible conditions leading to a 400 error

    if (currentDate > new Date(event.startTime)) {
        if (name !== null || description !== null || location !== null || startTime !== null || (capacity !== null)) {
            return res.status(400).json({ "error": "Cannot update name, description, location, start time, or capacity of an event that has already started" });
        }
    }


    const dataToUpdate = {};
    if (name !== undefined && name !== null) {
        if (typeof name === "string") {
            if (event.name !== name) {
                dataToUpdate.name = name;
            }
        }
        else {
            return res.status(400).json({"error": "Invalid name"});
        }
    }

    if (description !== undefined && description !== null) {
        if (typeof description === "string") {
            if (event.description !== description) {
                dataToUpdate.description = description;
            }
        }
        else {
            return res.status(400).json({"error": "Invalid description"});
        }
    }
    if (location !== undefined && location !== null) {
        if (typeof location === "string") {
            if (event.location !== location) {
                dataToUpdate.location = location;
            }
        }
        else {
            return res.status(400).json({"error": "Invalid location"});
        }
    }
    if (startTime !== undefined && startTime !== null) {

        if (!isNaN(new Date(startTime).getTime())) {
            if (new Date(startTime) < currentDate) {
                return res.status(400).json({ "error": "Event times cannot be in the past" });
            }
            else if (new Date(event.startTime).getTime() !== new Date(startTime).getTime()) {
                dataToUpdate.startTime = startTime;
            }
        }
        else {
            return res.status(400).json({"error": "Invalid start time"});
        }
    }
    if (endTime !== undefined && endTime !== null) {
        if (!isNaN(new Date(endTime).getTime())) {
            if (new Date(endTime) < currentDate || new Date(endTime) < new Date(event.startTime) || (new Date(event.endTime) < currentDate && currentDate < new Date(endTime))) {
                return res.status(400).json({ "error": "Event times cannot be in the past" });
            }
            else if (new Date(event.endTime).getTime() !== new Date(endTime).getTime()) {
                dataToUpdate.endTime = endTime;
            }
        }
        else {
            return res.status(400).json({"error": "Invalid end time"});
        }
    }
    if (capacity !== undefined && capacity !== null) { //has to be a positive number
        if (Number.isInteger(capacity)) {
            if (event.guests.length > capacity || capacity < 0) {
                return res.status(400).json({ "error": "Event capacity not valid" });
            }
            else if (capacity > 0 && event.capacity !== capacity) {
                dataToUpdate.capacity = capacity;
            }
        }
        else {
            return res.status(400).json({"error": "Invalid capacity"});
        }
    }
    if (points !== undefined && points !== null) {
        if (Number.isInteger(points)) {
            const newRemain = points - event.pointsAwarded;
            if (currentUser.role !== 'manager') {
                return res.status(403).json({ "error": "Only managers can update event points" });
            }
            else if (points < 0 || (points < event.pointsAwarded)) { //??
                return res.status(400).json({ "error": "Points not valid" });
            }
            else if (event.pointsRemain !== newRemain) {

                dataToUpdate.pointsRemain = newRemain;
                // dataToUpdate.pointsAwarded = event.pointsAwarded;
            }
        }
        else {
            return res.status(400).json({"error": "Invalid points"});
        }
    }
    if (published !== undefined && published !== null) {
        if (typeof published === "boolean") {
            if (published) {
                if (currentUser.role !== 'manager') {
                    return res.status(403).json({ "error": "Only managers can publish events" });
                }
            }
            if (event.published !== published) {
                dataToUpdate.published = published;
            }
        }
        else {
            return res.status(400).json({"error": "Invalid published value"});
        }
    }

    //else
    const updatedEvent = await prisma.event.update({
        where: { id: parseInt(eid) },
        data: dataToUpdate,
    });

    let resultEvent = {
        "id": updatedEvent.id,
        "name": updatedEvent.name,
        "location": updatedEvent.location,
    };

    Object.keys(dataToUpdate).forEach(key => {
        if (!['name', 'location'].includes(key)) {
            resultEvent[key] = dataToUpdate[key];
            if (key === 'pointsRemain') {
                resultEvent['pointsAwarded'] = updatedEvent.pointsAwarded;
            }
        }
    })

    res.status(200).json(resultEvent);
})

app.delete('/events/:eventId', get_logged_in, check_clearance("manager"), async (req, res) => { //checked https requests
    const currentUser = req.user;
    // if(currentUser.role !== 'manager' && currentUser.role !== 'superuser') {
    //     return res.status(403).json({"error": "Only managers or higher can remove organizers"});
    // }

    const eid = req.params.eventId;

    const event = await prisma.event.findUnique({
        where: { id: parseInt(eid) }
    })

    if (!event) {
        return res.status(404).json({ "error": "Not found" });
    }

    if (event.published) {
        return res.status(400).json({ "error": "Cannot delete a published event" });
    }

    await prisma.event.delete({
        where: { id: parseInt(eid) }
    })
    return res.status(204).send();
})

app.post('/events/:eventId/organizers', get_logged_in, check_clearance("manager"), async (req, res) => { //checked https requests
    const currentUser = req.user;
    if (!currentUser) {
        return res.status(401).json({ "error": "Unauthorized" });
    }
    // if(currentUser.role !== 'manager' && currentUser.role !== 'superuser') {
    //     return res.status(403).json({"error": "Only managers or higher can create events"});
    // }

    const { utorid } = req.body; //from payload
    if (utorid === undefined) {
        return res.status(400).json({ "error": "Invalid payload" });
    }

    const user = await prisma.user.findUnique({
        where: { utorid: utorid }
    })

    //valid user to add as an organizer?
    if (!user) {
        return res.status(404).json({ "error": "User not found" });
    }

    const eid = req.params.eventId;
    const event = await prisma.event.findUnique({
        where: { id: parseInt(eid) },
        include: { guests: true, organizers: true }
    })

    if (!event) {
        return res.status(404).json({ "error": "Event not found" });
    }

    const alreadyGuest = event.guests.filter(guest => {
        return guest.id === user.id;
    })

    //valid user and valid event
    if (event.endTime < new Date()) {
        return res.status(410).json({ "error": "Cannot add organizers to an event that has ended" });
    }
    else if (alreadyGuest.length !== 0) {
        return res.status(400).json({ "error": "User is already a guest of the event" });
    }
    else {

        const alreadyOrganizer = event.organizers.filter(org => {
            return org.id === user.id;
        })

        if (alreadyOrganizer.length === 0) {
            //console.log(event.organizers);
            const updatedEvent = await prisma.event.update({
                where: { id: parseInt(eid) },
                data: {
                    organizers: { connect: { id: user.id } }
                },
                include: { organizers: true }

            })

            const result = [];
            updatedEvent.organizers.forEach(org => {
                //console.log(org);
                const { id, utorid, name, ...rest } = org;
                result.push({ id, utorid, name });
            })
            return res.status(201).json({ id: event.id, name: event.name, location: event.location, organizers: result });
        }
        else {
            return res.status(409).json({ "error": "User is already an organizer for this event" });
        }
    }

})


app.delete('/events/:eventId/organizers/:userId', get_logged_in, check_clearance("manager"), async (req, res) => { //checked https requests
    const currentUser = req.user;
    // if(currentUser.role !== 'manager' && currentUser.role !== 'superuser') {
    //     return res.status(403).json({"error": "Only managers or higher can remove organizers"});
    // }

    const uid = req.params.userId;
    const eid = req.params.eventId;

    const user = await prisma.user.findUnique({
        where: { id: parseInt(uid) }
    })

    const event = await prisma.event.findUnique({
        where: { id: parseInt(eid) },
        include: { organizers: true }
    })

    if (!event || !user) {
        return res.status(404).json({ "error": "Not Found" });
    }

    const validOrganizer = event.organizers.filter(org => {
        return org.id === user.id;
    })

    if (validOrganizer.length !== 0) {
        const deleteUser = validOrganizer[0].id;
        const updatedEvent = await prisma.event.update({
            where: { id: parseInt(eid) },
            data: {
                organizers: {
                    disconnect: { id: deleteUser }
                }
            },
        })
        return res.status(204).send();
    }
    return res.status(404).json({ "error": "User is not an organizer of this event" });
})

app.post('/events/:eventId/guests/me', get_logged_in, async (req, res) => { //checked https requests
    //logged in user
    const user = req.user; //logged in user, needs middleware
    const eid = req.params.eventId;

    const event = await prisma.event.findUnique({
        where: { id: parseInt(eid) },
        include: { guests: true }
    })

    if (!event) {
        return res.status(404).json({ "error": "Not Found" });
    }

    const validGuest = event.guests.filter(guest => {
        return guest.id === user.id;
    })

    if (validGuest.length !== 0) {
        return res.status(400).json({ "error": "User is already a guest of the event" });
    }
    else if (event.capacity === event.guests.length || event.endTime < new Date()) {
        return res.status(410).json({ "error": "Event is full or has ended" });
    }

    const updatedEvent = await prisma.event.update({
        where: { id: parseInt(eid) },
        data: {
            guests: {
                connect: { id: user.id }
            }
        },
        include: { guests: true }
    })

    const { id, utorid, name, ...rest } = user;

    return res.status(201).json({
        id: updatedEvent.id,
        name: updatedEvent.name,

        location: updatedEvent.location,

        guestAdded: { id, utorid, name },
        numGuests: updatedEvent.guests.length,

    });

})

app.delete('/events/:eventId/guests/me', get_logged_in, async (req, res) => { //checked https requests
    const user = req.user; //logged in user, needs basicAuth middleware
    const eid = req.params.eventId;

    const event = await prisma.event.findUnique({
        where: { id: parseInt(eid) },
        include: { guests: true }
    })

    if (!event) {
        return res.status(404).json({ "error": "Not Found" });
    }

    if (event.endTime < new Date()) {
        return res.status(410).json({ "error": "Cannot remove guests from an event that has ended" });
    }

    const validGuest = event.guests.filter(guest => {
        return guest.id === user.id;
    })

    if (validGuest.length !== 0) {
        const updatedEvent = await prisma.event.update({
            where: { id: parseInt(eid) },
            data: {
                guests: {
                    disconnect: { id: user.id }
                }
            },
            include: { guests: true }
        })
        return res.status(204).send();
    }
    else {
        return res.status(404).json({ "error": "User is not a guest of the event" });
    }

});

app.post('/events/:eventId/guests', get_logged_in, async (req, res) => { //checked https requests
    const currentUser = req.user;
    if (!currentUser) {
        return res.status(401).json({ "error": "Unauthorized" });
    }

    const { utorid } = req.body; //from payload
    const user = await prisma.user.findUnique({
        where: { utorid: utorid }
    })

    const eid = req.params.eventId;
    const event = await prisma.event.findUnique({
        where: { id: parseInt(eid) },
        include: { organizers: true, guests: true }
    })

    if (!event || !user) {
        return res.status(404).json({ "error": "Not Found" });
    }

    const currentUserAlready = event.organizers.filter(org => { //check if logged in user is an organizer
        return org.id === currentUser.id;
    })

    if (currentUserAlready.length === 0 && currentUser.role !== 'manager' && currentUser.role !== 'superuser') {
        return res.status(403).json({ "error": "Only managers or higher, or event organizers can update events" });
    }

    const alreadyOrganizer = event.organizers.filter(org => { //check if the payload user is an organizer
        return org.id === user.id;
    })

    const alreadyGuest = event.guests.filter(guest => { //check if the payload user is a guest
        return guest.id === user.id;
    })

    if (alreadyOrganizer.length !== 0) {
        return res.status(400).json({ "error": "User is already an organizer of the event" });
    }
    else if (alreadyGuest.length !== 0) {
        return res.status(409).json({ "error": "User is already a guest of this event" });
    }
    else if (!event.published) {
        return res.status(404).json({ "error": "Event is not published yet" });
    }
    else if (event.capacity === event.guests.length || event.endTime < new Date()) {
        return res.status(410).json({ "error": "Event is full or has ended" });
    }
    else {
        const updatedEvent = await prisma.event.update({
            where: { id: parseInt(eid) },
            data: {
                guests: { connect: { id: user.id } }
            },
            include: { guests: true }
        })

        const { id, utorid, name, ...rest } = user;

        return res.status(201).json({ id: event.id, name: event.name, location: event.location, guestAdded: { id, utorid, name }, numGuests: updatedEvent.guests.length });
    }
})

app.delete('/events/:eventId/guests/:userId', get_logged_in, check_clearance("manager"), async (req, res) => {
    const currentUser = req.user;
    // if(currentUser.role !== 'manager' && currentUser.role !== 'superuser') {
    //     return res.status(403).json({"error": "Only managers or higher can remove guests"});
    // }

    const uid = req.params.userId;
    const eid = req.params.eventId;

    const user = await prisma.user.findUnique({
        where: { id: parseInt(uid) }
    })

    const event = await prisma.event.findUnique({
        where: { id: parseInt(eid) },
        include: { guests: true }
    })

    if (!event || !user) {
        return res.status(404).json({ "error": "Not Found" });
    }

    const isGuest = event.guests.filter(guest => {
        if(guest.id === user.id) {
            return guest;
        }
    })

    if(isGuest.length !== 0) {

        await prisma.event.update({
            where: {id: parseInt(eid)},
            data: {
                guests: {disconnect: {id: parseInt(uid)}}
            }
        })
        
        return res.status(204).send();
    }
    else {
        return res.status(410).json({"error": "This user is not a guest"});
    }
})

app.post('/events/:eventId/transactions', get_logged_in, async (req, res) => { //checked https requests
    const currentUser = req.user;
    const { type, utorid, amount, remark } = req.body;

    const eid = req.params.eventId;
    const event = await prisma.event.findUnique({
        where: { id: parseInt(eid) },
        include: { organizers: true, guests: true }
    })

    if (!event) {
        return res.status(404).json({ "error": "Not Found" });
    }

    const currentUserAlready = event.organizers.filter(org => { //check if logged in user is an organizer
        return org.id === currentUser.id;
    })

    if (currentUserAlready.length === 0 && currentUser.role !== 'manager' && currentUser.role !== 'superuser') {
        return res.status(403).json({ "error": "Only managers or higher, or event organizers can update events" });
    }

    if (type === undefined || typeof type !== "string" || type !== 'event' || !Number.isInteger(amount) || amount === undefined || amount < 0) {
        return res.status(400).json({ "error": "Invalid payload" }); //passed
    }
    if (remark === undefined) {
        req.body.remark = null;
    }
    else {
        if (typeof remark !== "string") {
            return res.status(400).json({ "error": "Invalid payload" });
        }
    }

    if (utorid !== undefined && utorid !== null) { //a utorid is given

        if (typeof utorid !== "string") {
            return res.status(400).json({ "error": "Invalid payload" });
        }
        const findUser = await prisma.user.findUnique({
            where: { utorid: utorid }
        })

        if (!findUser) {
            return res.status(404).json({ "error": "Not found" });
        }

        const alreadyGuest = event.guests.filter(guest => {
            return guest.id === findUser.id;
        })

        if (alreadyGuest.length === 0) {
            return res.status(400).json({ "error": "User is not a guest of the event" }); //passed
        }

        if (amount > event.pointsRemain) {
            return res.status(400).json({ "error": "Invalid payload" });
        }

        const newTransaction = await prisma.transaction.create({
            data: {
                utorid: utorid, //recipient transaction
                recipient: utorid,
                awarded: amount, //must be <= pointsRemain
                type: type, //event
                relatedId: parseInt(eid), //related event
                remark: req.body.remark,
                createdBy: currentUser.utorid,
                suspicious: false,
                processed: false,
                amount: 0
            }
        })

        const prevPoints = findUser.points;
        const newPoints = prevPoints + amount;
        const remain = event.pointsRemain - amount;
        const reward = event.pointsAwarded + amount;
        const updatedEvent = await prisma.event.update({
            where: { id: parseInt(eid) },
            data: {
                pointsRemain: remain,
                pointsAwarded: reward
            }
        })
        const updatedUser = await prisma.user.update({
            where: { id: findUser.id },
            data: {
                buyers: {
                    connect: {
                        id: newTransaction.id
                    }
                },
                guest: { connect: { id: updatedEvent.id } },
                points: newPoints
            }
        })

        return res.status(201).json({ id: newTransaction.id, recipient: utorid, awarded: amount, type: type, relatedId: eid, remark: remark, createdBy: newTransaction.createdBy });
    }

    else if (utorid === null) {
        //const allUsers = await prisma.user.findMany();

        const numGuests = event.guests.length;
        if ((amount * numGuests) > event.pointsRemain) {
            return res.status(400).json({ "error": "Invalid payload" });
        }

        const remain = event.pointsRemain - (numGuests * amount);
        const reward = event.pointsAwarded + (numGuests * amount);

        const updatedEvent = await prisma.event.update({
            where: { id: parseInt(eid) },
            data: {
                pointsRemain: remain,
                pointsAwarded: reward
            }
        })

        const newTransactions = [];

        for (const user of event.guests) {
            //user

            const newTransaction = await prisma.transaction.create({
                data: {
                    utorid: user.utorid, //recipient transaction
                    recipient: user.utorid,
                    awarded: amount, //must be <= pointsRemain
                    type: type, //event
                    relatedId: parseInt(eid), //related event
                    remark: req.body.remark,
                    createdBy: currentUser.utorid,
                    suspicious: false,
                    processed: false,
                    amount: 0
                }
            })

            const prevPoints = user.points;
            const newPoints = prevPoints + amount;

            const updatedUser = await prisma.user.update({
                where: { id: user.id },
                data: {
                    buyers: {
                        connect: { //recipient of a transaction
                            id: newTransaction.id
                        }
                    },
                    guest: { connect: { id: updatedEvent.id } },
                    points: newPoints
                }
            })

            let jsonobj = {
                "id": newTransaction.id,
                "recipient": user.utorid,
                "awarded": amount,
                "type": type,
                "relatedId": parseInt(eid),
                "remark": req.body.remark,
                "createdBy": newTransaction.createdBy
            }
            newTransactions.push(jsonobj);
        }

        return res.status(201).json(newTransactions);
    }


})

//PROMOTIONS
app.post('/promotions', get_logged_in, check_clearance("manager"), async (req, res) => {
    /*
    · Method: POST
    · Description: Create a new promotion.
    · Clearance: Manager or higher
    · Payload:
    Field Required Type Description
    name Yes string The name of the promotion
    description Yes string The description of the promotion
    type Yes string Either "automatic" or "one-time"
    startTime Yes string ISO 8601 format. Must not be in the past.
    endTime Yes string ISO 8601 format. Must be after startTime
    minSpending No number The minimum spending required to trigger the promotion.. Must be a positive numeric value.
    rate No number The promotional rate (on top of the existing rate). Must be a positive numeric value.
    points No number The promotional points, added to qualifying purchase transaction. Must be a positive integer value.

    · Response
    201 Created on success { "id": 3, 
    "name": "Start of Summer Celebration",
    "description": "A simple promotion", "type": "automatic",
    "startTime": "2025-11-10T09:00:00Z",
    "endTime": "2025-11-10T17:00:00Z",
    "minSpending": 50, "rate": 0.01, // for every dollar spent, 1 extra point is added 
    "points": 0 }
    */

    // TODO: clearance
    const { name, description, type, startTime, endTime, minSpending, rate, points } = req.body;

    try {
        if (name == null || description == null || type == null || startTime == null || endTime == null) {
            return res.status(400).json({ error: 'missing required fields' });
        }

        if (type !== 'automatic' && type !== 'one-time') {
            return res.status(400).json({ error: 'type must be either "automatic" or "one-time"' });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);
        const now = new Date();

        if (isNaN(start.getTime())) return res.status(400).json({ error: 'invalid startTime format' });
        if (isNaN(end.getTime())) return res.status(400).json({ error: 'invalid endTime format' });
        if (start < now) return res.status(400).json({ error: 'startTime cannot be in the past' });
        if (end <= start) return res.status(400).json({ error: 'endTime must be after startTime' });

        if (minSpending !== null && (typeof minSpending !== 'number' || minSpending <= 0)) {
            return res.status(400).json({ error: 'minSpending must be a positive numeric value' });
        }
        if (rate !== null && (typeof rate !== 'number' || rate <= 0)) {
            return res.status(400).json({ error: 'rate must be a positive numeric value' });
        }
        if (points !== null && (!Number.isInteger(points) || points < 0)) {
            return res.status(400).json({ error: 'points must be a positive integer value' });
        }

        const created = await prisma.promotion.create({
            data: { name, description, type, startTime: start, endTime: end, minSpending, rate, points }
        });

        res.status(201).json({
            id: created.id,
            name: created.name,
            description: created.description,
            type: created.type,
            startTime: created.startTime.toISOString(),
            endTime: created.endTime.toISOString(),
            minSpending: created.minSpending,
            rate: created.rate,
            points: created.points
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'internal server error' });
    }

});


app.get('/promotions', get_logged_in, async (req, res) => {
    /*
    · Method: GET
    · Description: Retrieve a list of promotions
    · Clearance: Regular or higher
    · Payload:
    Field Required Type Description
    name No string Filter by name of the promotion
    type No string Filter by type (either "automatic" or "one-time")
    page No number Page number for pagination (default is 1)
    limit No number Number of objects per page (default is 10)

    · Response: count, which stores the total number of results (after applying all filters), and results, which contains a list of promotions
    o 200 OK on success { "count": 3, "results": [ { "id": 3, "name": "Start of Summer Celebration", "type": "automatic", "endTime": "2025-11-10T17:00:00Z", "minSpending": 50, "rate": 0.01, // for every dollar spent, 1 extra point is added "points": 0 } // More event objects... ]}

    A regular user may only see available promotions, i.e., active promotions that they have not used. An active promotion is one that has started, but not ended.
    */

    /*
    · Method: GET
    · Description: Retrieve a list of promotions
    · Clearance: Manager or higher
    · Payload: on top of the fields above, these addition fields are available to managers:
    Field Required Type Description
    started No boolean Filter promotions that have started already (false would mean that the event has not started)
    ended No boolean Filter promotions that have ended already (false would mean that the event has not ended)

    · Response: count, which stores the total number of results (after applying all filters), and results, which contains a list of promotions
    o 200 OK on success { "count": 3, "results": [ { "id": 3, "name": "Start of Summer Celebration", "type": "automatic", "startTime": "2025-11-10T09:00:00Z", "endTime": "2025-11-10T17:00:00Z", "minSpending": 50, "rate": 0.01, // for every dollar spent, 1 extra point is added "points": 0 } // More event objects... ] }
    o 400 Bad Request when both started and ended are specified (it is never necessary to specify both started and ended).

    Note that for both versions of GET /promotions, the descriptions of the returned promotions are omitted.
    */

    // TODO: dynamic user, limits, page numbers
    try {
        const { name, type, started, ended, page = 1, limit = 10 } = req.query;
        const userRole = req.user.role.toUpperCase();
        const now = new Date();

        if (started !== undefined && ended !== undefined) {
            return res.status(400).json({ error: 'cannot specify both started and ended' });
        }

        const where = {};

        if (name) where.name = { contains: name };
        if (type) {
            if (type !== 'automatic' && type !== 'onetime') {
                return res.status(400).json({ error: 'type must be either "automatic" or "onetime"' });
            }
            where.type = type;
        }

        if (userRole === 'REGULAR' || userRole === 'CASHIER') {
            where.startTime = { lte: now };
            where.endTime = { gte: now };
        } else {
            // manager/superuser extra filters
            if (started !== undefined) {
                where.startTime = started === 'true' ? { lte: now } : { gt: now };
            }
            if (ended !== undefined) {
                where.endTime = ended === 'true' ? { lte: now } : { gt: now };
            }
        }

        if (page !== undefined) {
            if (isNaN(page) || parseInt(page) < 1) {
                return res.status(400).json({ error: 'invalid page number' });
            }
        }

        if (limit !== undefined) {
            if (isNaN(limit) || parseInt(limit) < 1) {
                return res.status(400).json({ error: 'invalid limit number' });
            }
        }

        const count = await prisma.promotion.count({ where });

        const results = await prisma.promotion.findMany({
            where,
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit),
            select: {
                id: true,
                name: true,
                type: true,
                ...(userRole === 'MANAGER' || userRole === 'SUPERUSER' ? { startTime: true } : {}),
                endTime: true,
                minSpending: true,
                rate: true,
                points: true
            }
        });

        res.status(200).json({ count, results });
    } catch (error) {
        console.error('Error in /promotions:', error);
        res.status(500).json({ error: 'Failed to fetch promotions', details: error.message });
    }
});

app.get('/promotions/:promotionId', get_logged_in, async (req, res) => {
    /*
    · Method: GET
    · Description: Retrieve a single promotion
    · Clearance: Regular or higher
    · Payload: None
 
    · Response
    o 200 OK on success { "id": 3, "name": "Start of Summer Celebration", "description": "A simple promotion", "type": "automatic", "endTime": "2025-11-10T17:00:00Z", "minSpending": 50, "rate": 0.01, "points": 0 }
    o 404 Not Found if the promotion is currently inactive (not started yet, or have ended).
    */

    // TODO: clearance
    try {
        const id = parseInt(req.params.promotionId);
        if (isNaN(id)) return res.status(400).json({ error: 'invalid promotion id' });

        const promotion = await prisma.promotion.findUnique({
            where: { id },
            select: {
                id: true, name: true, description: true, type: true,
                startTime: true, endTime: true, minSpending: true, rate: true, points: true
            }
        });
        if (!promotion) return res.status(404).json({ error: 'promotion not found' });

        const now = new Date();
        const role = req.user.role.toUpperCase();
        const isMgr = role === 'MANAGER' || role === 'SUPERUSER';

        if (isMgr) {
            return res.status(200).json(promotion);
        }

        // regular/cashier: only active promos (omit startTime in response if you want)
        if (promotion.startTime > now || promotion.endTime < now) {
            return res.status(404).json({ error: 'promotion is inactive' });
        }

        return res.status(200).json({
            id: promotion.id,
            name: promotion.name,
            description: promotion.description,
            type: promotion.type,
            endTime: promotion.endTime,
            minSpending: promotion.minSpending,
            rate: promotion.rate,
            points: promotion.points
        });
    } catch (error) {
        console.error('Error retrieving promotion:', error);
        res.status(500).json({ error: 'failed to retrieve promotion' });
    }
});

app.patch('/promotions/:promotionId', get_logged_in, check_clearance("manager"), async (req, res) => {
    /*
    · Method: PATCH
    · Description: Update an existing promotion.
    · Clearance: Manager or higher
    · Payload:
    Field Required Type Description
    name No string The name of the event
    description No string The description of the promotion
    type No string Either "automatic" or "one-time"
    startTime No string ISO 8601 format
    endTime No string ISO 8601 format. Must be after startTime
    minSpending No number The minimum spending required to trigger the promotion. Must be a positive numeric value.
    rate No number The promotional rate (on top of the existing rate). Must be a positive numeric value.
    points No number The promotional points, added to qualifying purchase transaction. Must be a positive integer value.
 
    · Response: The id, name and type, shall always be returned. For others, only the field(s) updated will be returned, e.g., when the endTime field is updated:
    o 200 OK on success { "id": 3, "name": "Start of Summer Celebration", "type": "automatic", "endTime": "2025-11-20T17:00:00Z", }
    o 400 Bad Request
        - If start time or end time (or both) is in the past.
        - If update(s) to name, description, type, startTime, minSpending, rate, or points is made after the original start time has passed.
        - In addition to the above, if update to endTime is made after the original end time has passed.
    */

    try {
        console.log("starting promotion update");
        console.log(req.body, " request body");
        console.log(req.params, " request params");

        const id = parseInt(req.params.promotionId, 10);
        console.log("promotionId: ", id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'invalid promotion id' });
        }

        const existing = await prisma.promotion.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'promotion not found' });
        }

        console.log("existing promotion", existing);

        let {
            name,
            description,
            type,
            startTime,
            endTime,
            minSpending,
            rate,
            points,
        } = req.body;

        if (name === null) name = undefined;
        if (description === null) description = undefined;
        if (type === null) type = undefined;
        const startTimeProvided = startTime !== undefined && startTime !== null;
        const endTimeProvided = endTime !== undefined && endTime !== null;
        if (!startTimeProvided) startTime = undefined;
        if (!endTimeProvided) endTime = undefined;
        const minSpendingProvided = minSpending !== undefined;
        const rateProvided = rate !== undefined;
        const pointsProvided = points !== undefined;

        if (
            name === undefined &&
            description === undefined &&
            type === undefined &&
            !startTimeProvided &&
            !endTimeProvided &&
            !minSpendingProvided &&
            !rateProvided &&
            !pointsProvided
        ) {
            return res.status(400).json({ error: 'provide at least one field to update' });
        }

        // basic type checks (ignore nulls -> already normalized to undefined)
        if (name !== undefined && typeof name !== 'string') {
            return res.status(400).json({ error: 'name must be a string' });
        }
        if (description !== undefined && typeof description !== 'string') {
            return res.status(400).json({ error: 'description must be a string' });
        }
        if (type !== undefined && type !== 'automatic' && type !== 'one-time') {
            return res.status(400).json({ error: 'type must be either "automatic" or "one-time"' });
        }

        console.log("before parsing start and end times");

        let parsedStart;
        let parsedEnd;

        if (startTimeProvided) {
            parsedStart = new Date(startTime);
            if (Number.isNaN(parsedStart.getTime())) {
                return res.status(400).json({ error: 'invalid startTime format' });
            }
        }

        if (endTimeProvided) {
            parsedEnd = new Date(endTime);
            if (Number.isNaN(parsedEnd.getTime())) {
                return res.status(400).json({ error: 'invalid endTime format' });
            }
        }

        console.log("passed start and end time validation");

        const now = new Date();
        const existingStart = new Date(existing.startTime);
        const existingEnd = new Date(existing.endTime);

        const hasStarted = existingStart <= now;
        const hasEnded = existingEnd <= now;

        if (hasEnded) {
            return res.status(400).json({ error: 'cannot update promotion after it has ended' });
        }

        if (parsedStart && parsedStart < now) {
            return res.status(400).json({ error: 'startTime cannot be in the past' });
        }
        if (parsedEnd && parsedEnd < now) {
            return res.status(400).json({ error: 'endTime cannot be in the past' });
        }

        const effectiveStart = parsedStart ?? existingStart;
        const effectiveEnd = parsedEnd ?? existingEnd;
        if (effectiveEnd <= effectiveStart) {
            return res.status(400).json({ error: 'endTime must be after startTime' });
        }

        if (hasStarted) {
            if (
                name !== undefined ||
                description !== undefined ||
                type !== undefined ||
                startTimeProvided ||
                minSpendingProvided ||
                rateProvided ||
                pointsProvided
            ) {
                return res.status(400).json({
                    error:
                        'cannot update name, description, type, startTime, minSpending, rate, or points after promotion has started',
                });
            }
        }

        console.log("passed hasStarted/hasEnded checks");

        if (minSpendingProvided) {
            if (minSpending !== null) {
                const v = Number(minSpending);
                if (Number.isNaN(v) || v <= 0) {
                    return res.status(400).json({ error: 'minSpending must be a positive number' });
                }
            }
        }

        if (rateProvided) {
            if (rate !== null) {
                const v = Number(rate);
                if (Number.isNaN(v) || v <= 0) {
                    return res.status(400).json({ error: 'rate must be a positive number' });
                }
            }
        }

        if (pointsProvided) {
            if (points !== null) {
                const v = Number(points);
                if (!Number.isInteger(v) || v < 0) {
                    return res.status(400).json({ error: 'points must be a non-negative integer' });
                }
            }
        }

        console.log("before building data object");

        const data = {};

        if (name !== undefined) data.name = name;
        if (description !== undefined) data.description = description;
        if (type !== undefined) data.type = type;
        if (startTimeProvided) data.startTime = parsedStart;
        if (endTimeProvided) data.endTime = parsedEnd;
        if (minSpendingProvided) data.minSpending = minSpending === null ? null : Number(minSpending);
        if (rateProvided) data.rate = rate === null ? null : Number(rate);
        if (pointsProvided) data.points = points === null ? null : Number(points);

        const updated = await prisma.promotion.update({
            where: { id },
            data,
        });

        const response = {
            id: updated.id,
            name: updated.name,
            type: updated.type,
        };

        if (description !== undefined) response.description = updated.description;
        if (startTimeProvided) response.startTime = updated.startTime;
        if (endTimeProvided) response.endTime = updated.endTime;
        if (minSpendingProvided) response.minSpending = updated.minSpending;
        if (rateProvided) response.rate = updated.rate;
        if (pointsProvided) response.points = updated.points;

        console.log('Updated promotion:', response);

        return res.status(200).json(response);
    } catch (err) {
        console.error('Error updating promotion:', err);
        return res.status(500).json({ error: 'failed to update promotion' });
    }

});

app.delete('/promotions/:promotionId', get_logged_in, check_clearance("manager"), async (req, res) => {
    /*
    · Method: DELETE
    · Description: Remove the specified promotion.
    · Clearance: Manager or higher
    · Payload: None
 
    · Response:
    o 204 No Content on success
    o 403 Forbidden if the promotion has already started.
    */

    try {
        const id = parseInt(req.params.promotionId);
        if (isNaN(id)) return res.status(400).json({ error: 'invalid promotion id' });

        const promotion = await prisma.promotion.findUnique({ where: { id } });
        if (!promotion) return res.status(404).json({ error: 'promotion not found' });

        if (new Date(promotion.startTime) <= new Date()) {
            return res.status(403).json({ error: 'cannot delete promotion that has already started' });
        }

        await prisma.promotion.delete({ where: { id } });
        return res.status(204).json({ message: "Deleted promotion successfully" });
    } catch (error) {
        console.error('Error deleting promotion:', error);
        return res.status(500).json({ error: 'failed to delete promotion' });
    }
});

const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

server.on('error', (err) => {
    console.error(`cannot start server: ${err.message}`);
    process.exit(1);
});