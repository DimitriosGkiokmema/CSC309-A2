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
const ROLE_LEVELS = {"regular": 0, "cashier": 1, "manager": 2, "superuser": 3};
app.use(express.json());

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
    return function(req, res, next) {
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
    const {utorid, name, email} = req.body;

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
        res.status(500).json({ message: "Database error"});
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
    const { name, role, verified, activated, page, limit} = req.body;
    const where = {};

    if (name) where.name  = name;
    if (role) {
        if (ROLE_LEVELS[role] >= 0) {
            where.role = role;
        } else {
            return res.status(400).json({ error: "role not valid" });
        }
    }
    if (verified !== undefined) {
        if (verified !== 'true' && verified !== 'false'){
            return res.status(200).json({ error: "verified not valid" });
        }

        where.verified = verified === "true";
    }

    if (activated !== undefined) {
        if (activated === "true") {
            where.lastLogin = {not: null};
        } 
        
        if (activated === "false") {
            where.lastLogin = null;
        }
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    if (isNaN(pageNum) || pageNum < 1) {
        return res.status(200).json({ error: "page not valid" });
    }
    if (isNaN(limitNum) || limitNum < 1) {
        return res.status(200).json({ error: "limit not valid" });
    }

    const skip = (pageNum - 1) * limitNum;
    const take = limitNum;

    try {
        const total = await prisma.user.findMany({where});

        if (skip >= total.length) {
            return res.status(400).json({ error: "page/limit too large" });
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
            count: total.length,
            results: data
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database error"});
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
    const {name, email, birthday, avatarUrl} = req.body;
    const data = {};

    if (!name && !email && !birthday && !avatarUrl) {
        return res.status(400).json({ error: "Payload empty" });
    }

    if (name) data.name = name;
    if (email) {
        // Validate email is from UofT
        if (!email.includes("@mail.utoronto.ca")) {
            return res.status(400).json({ error: "Email not proper format" });
        }
        
        data.email  = email;
    }
    if (birthday) data.birthday = birthday;
    if (avatarUrl) data.avatarUrl = avatarUrl;

    try {
        const updated_user = await prisma.user.update({
            where: { id: req.user.id },
            data
        })

        // Respond with updated note
        return res.status(200).json({
            id: updated_user.id,
            utorid: updated_user.utorid,
            name: updated_user.name,
            email: updated_user.email,
            birthday: updated_user.birthday,
            role: updated_user.role,
            points: updated_user.points,
            createdAt: updated_user.createdAt,
            lastLogin: updated_user.lastLogin,
            verified: updated_user.verified,
            avatarUrl: updated_user.avatarUrl
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database error"});
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
        promotions: user.promotions
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
            data : { password: newPass }
        });

        // Respond with updated note
        return res.status(200).json({
            new_password: updated_user.password
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database error"});
    }
});

app.get('/users/:userId', get_logged_in, async (req, res) => {
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
        let data;
        
        if (high_clearance) {
            data = await prisma.user.findUnique({
                where: {id: target_id},
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
                    avatarUrl: true,
                    promotions: true
                }
            });
        } else {
            data = await prisma.user.findUnique({
                where: {id: target_id},
                select: {
                    id: true,
                    utorid: true,
                    name: true,
                    points: true,
                    verified: true,
                    promotions: true
                }
            });
        }

        // Respond with updated note
        return res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database error"});
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
    const target_id = parseInt(req.params.userId, 10);
    const {email, verified, suspicious, role} = req.body;
    const data = {};

    if (!email && !verified && !suspicious && !role) {
        return res.status(400).json({error: "Payload empty"});
    }

    if (isNaN(target_id)) {
        return res.status(400).json({ error: "?userId must be positive number" });
    }

    if (email) {
        // Validate email is from UofT
        if (!email.includes("@mail.utoronto.ca")) {
            return res.status(400).json({ error: "Email not proper format" });
        }
        
        data.email  = email;
    }
    if (verified) data.verified = verified === "true";
    if (suspicious) data.suspicious = suspicious;
    if (role) {
        if (ROLE_LEVELS[role] >= 0) {
            data.role = role;
        } else {
            return res.status(400).json({ error: "role not valid" });
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
        const updated_user = await prisma.user.update({
            where: { id: target_id },
            data,
            select
        })

        // Respond with updated note
        return res.status(200).json(updated_user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database error"});
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
    const {utorid, password} = req.body;

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
        res.status(500).json({ message: "Database error"});
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
    const {utorid} = req.body;

    if (!utorid) {
        return res.status(400).json({ message: "Empty payload" });
    }

    // ------------------>
    // RATE LIMIT
    // ------------------>
    const ip = req.ip;   // get ip address
    const now = Date.now();

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
        res.status(500).json({ message: "Database error"});
    }
});

app.post('/auth/resets/:resetToken', async (req, res) => {
    /*
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
    const {utorid, password} = req.body;

    if (!resetToken || !utorid || !password) {
        return res.status(400).json({ error: "Must provide a reset token,utorid, and password" });
    }

    if (!validPassword(password)) {
        return res.status(400).json({ error: "password given was incorrect" });
    }

    try {
        const curr_time = new Date().toISOString();
        const existing = await prisma.user.findUnique({
            where: { utorid: utorid }
        });

        if (!existing) {
            return res.status(404).json({ message: "A user with that utorid does not exist" });
        }

        if (existing.expiresAt < curr_time) {
            return res.status(410).json({ message: "Token has expired" });
        }

        if (existing.utorid !== utorid) {
            return res.status(401).json({ message: "Utorid token pairing wrong" });
        }

        if (existing.token !== resetToken) {
            return res.status(404).json({ message: "A user with that token and utorid combination does not exist" });
        }

        const updated_user = await prisma.user.update({
            where: { utorid: utorid },
            data: {
                password: password
            }
        });
        
        // Respond with updated note
        return res.status(200).json({"success": "password created"})
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database error"});
    }
});

const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

server.on('error', (err) => {
    console.error(`cannot start server: ${err.message}`);
    process.exit(1);
});