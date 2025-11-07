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
        } else {
            where.role = role;
            return res.status(200).json({ error: "role not valid" });
        }
    }
    if (verified) {
        if (verified !== 'true' && verified !== 'false'){
            return res.status(200).json({ error: "verified not valid" });
        }

        where.verified = verified === "true";
    }

    if (activated) {
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
            results: [data]
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
    const {oldPass, newPass} = req.body;

    if (!validPassword(newPass)) {
        return res.status(400).json({ error: "New password wrong format" });
    }

    try {
        if (req.user.password !== oldPass) {
            return res.status(400).json({ error: "Old password is incorrect" });
        }

        const now = Date.now();
        const expires = new Date(req.user.expiresAt);

        if (expires < now) {
            return res.status(400).json({ error: "Token expired" });
        }

        const updated_user = await prisma.user.update({
            where: { id: req.user.id },
            data : { password:password }
        });

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
    if (role) data.role = role;

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

app.post('/transactions', get_logged_in, check_clearance("cashier"), async (req, res) => {
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
});

app.post('/transactions', get_logged_in, check_clearance("manager"), async (req, res) => {
    /*
    · Method: POST
    · Description: Create a new adjustment transaction.
    · Clearance: Manager or higher
    · Payload:
    Field Required Type Description
    utorid Yes string The utorid of the user whose previous transaction is being adjusted
    type Yes string Must be "adjustment"
    amount Yes number The point amount adjusted in this transaction
    relatedId Yes number The ID of the related transaction
    promotionIds No array The IDs of promotions to apply to this transaction
    remark No string Any remark regarding this transaction

    · Response
    o 201 Created on success { "id": 125, "utorid": "johndoe1", "amount": -40, "type": "adjustment", "relatedId": 123, "remark": "", "promotionIds": [], "createdBy": "smithw42" }

    Once an adjustment is made, the amount is automatically reflected in the user's points balance.
    */
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
});

app.patch('/transactions/:transactionId/processed', get_logged_in, check_clearance("cashier"), async (req, res) => {
    /*
    · Method: PATCH
    · Description: Set a redemption transaction as being completed
    · Clearance: Cashier or higher
    · Payload:
    Field Required Type Description
    processed Yes boolean Can only be true

    · Response:
    o 200 OK on success { "id": 124, "utorid": "johndoe1", "type": "redemption", "processedBy": "alice666", "redeemed": 1000, "remark": "", "createdBy": "johndoe1" }
    o 400 Bad Request
        - If the transaction is not of type "redemption"
        - If the transaction has already been processed

    When marking a redemption transaction as processed (changing the flag from false to true), the amount should then be deducted from the user's points balance.
    */
});

app.post('/events', get_logged_in, check_clearance("manager"), async (req, res) => {
    /*
    · Method: POST
    · Description: Create a new point-earning event.
    · Clearance: Manager or higher
    · Payload:
    Field Required Type Description
    name Yes string The name of the event
    description Yes string The description of the event
    location Yes string The location of the event
    startTime Yes string ISO 8601 format
    endTime Yes string ISO 8601 format -- must be after startTime
    capacity No number Must be a positive number, or null if there is no limit to the number of attendees
    points Yes number Points allocated such that the organizers can distribute freely during the event. Must be a positive integer.

    · Response
    o 201 Created on success { "id": 1, "name": "Event 1", "description": "A simple event", "location": "BA 2250", "startTime": "2025-11-10T09:00:00Z", "endTime": "2025-11-10T17:00:00Z", "capacity": 200, "pointsRemain": 500, "pointsAwarded": 0, "published": false, "organizers": [], "guests": [] }

    Please see PATCH /events/:eventId for a list of possible errors.
    */
});

app.get('/events', get_logged_in, async (req, res) => {
    /*
    · Method: GET
    · Description: Retrieve a list of events
    · Clearance: Regular or higher
    · Payload:
    Field Required Type Description
    name No string Filter by name of the event
    location No string Filter by location
    started No boolean Filter events that have started already (false would mean that the event has not started)
    ended No boolean Filter events that have ended already (false would mean that the event has not ended)
    showFull No boolean Show events that are full (default is false)
    page No number Page number for pagination (default is 1)
    limit No number Number of objects per page (default is 10)

    · Response: count, which stores the total number of results (after applying all filters), and results, which contains a list of events
    o 200 OK on success { "count": 2, "results": [ { "id": 1, "name": "Event 1", "location": "BA 2250", "startTime": "2025-11-10T09:00:00Z", "endTime": "2025-11-10T17:00:00Z", "capacity": 200, "numGuests": 0 } // More event objects... ] }
    o 400 Bad Request when both started and ended are specified (it is never necessary to specify both started and ended).

    Note that regular users cannot see unpublished events.
    */

    /*
    · Method: GET
    · Description: Retrieve a list of events
    · Clearance: Manager or higher
    · Payload: Same as above, with these additional fields added
    Field Required Type Description
    published No boolean Filter events that are published (or not)

    · Response: count, which stores the total number of results (after applying all filters), and results, which contains a list of events
    o 200 OK on success { "count": 5, "results": [ { "id": 1, "name": "Event 1", "location": "BA 2250", "startTime": "2025-11-10T09:00:00Z", "endTime": "2025-11-10T17:00:00Z", "capacity": 200, "pointsRemain": 500, "pointsAwarded": 0, "published": false, "numGuests": 0 } // More event objects... ] }

    Note that for both versions of GET /events, the descriptions of the returned events are omitted.
    */

    // TODO: diff clearance levels
});

app.get('/events/:eventId', async (req, res) => {
    /*
    · Method: GET
    · Description: Retrieve a single event
    · Clearance: Regular or higher
    · Payload: None

    · Response
    o 200 OK on success { "id": 1, "name": "Event 1", "description": "A simple event", "location": "BA 2250", "startTime": "2025-11-10T09:00:00Z", "endTime": "2025-11-10T17:00:00Z", "capacity": 200, "organizers": [ { "id": 1, "utorid": "johndoe1", "name": "John Doe" } ], "numGuests": 0 }
    o 404 Not Found if the event is not published.

    Note that a regular user cannot see all the information regarding an event, such as the points allocated to the event, or the list of guests, but can see the current number of guests that have RSVPed.
    */

    /*
    · Method: GET
    · Description: Retrieve a single event
    · Clearance: Manager or higher, or an organizer for this event
    · Payload: None

    · Response: { "id": 1, "name": "Event 1", "description": "A simple event", "location": "BA 2250", "startTime": "2025-11-10T09:00:00Z", "endTime": "2025-11-10T17:00:00Z", "capacity": 200, "pointsRemain": 500, "pointsAwarded": 0, "published": false, "organizers": [
    { "id": 1, "utorid": "johndoe1", "name": "John Doe" } ], "guests": [] }
    */

    // TODO: diff clearance levels
});

app.patch('/events/:eventId', async (req, res) => {
    /*
    · Method: PATCH
    · Description: Update an existing event.
    · Clearance: Manager or higher, or an organizer for this event
    · Payload:
    Field Required Type Description
    name No string The name of the event
    description No string The description of the event
    location No string The location of the event
    startTime No string ISO 8601 format
    endTime No string ISO 8601 format -- must be after startTime
    capacity No number Must be a positive number, or null if there is no limit to the number of attendees
    points No number Can only be set by managers: Points allocated such that the organizers can distribute freely during the event. Must be a positive integer.
    published No boolean Can only be set by managers: Make the event visible to others (including its organizers). Can only be set to true

    · Response: The id, name and location, shall always be returned. For others, only the field(s) updated will be returned, e.g., when the published field is updated:
    o 200 OK on success { "id": 1, "name": "Event 1", "location": "BA 2250", "published": true }
    o 400 Bad Request
        - If start time or end time (or both) is in the past.
        - If capacity is reduced, but the number of confirmed guests exceeds the new capacity.
        - If the total amount of points is reduced, resulting in the remaining points allocated to the event falling below zero. Points already awarded to guests cannot be retracted through this API.
        - If update(s) to name, description, location, startTime, or capacity is made after the original start time has passed.
        - In addition to the above, if update to endTime is made after the original end time has passed.
    */

    // TODO: special clearance
});

app.delete('/events/:eventId', get_logged_in, check_clearance("manager"), async (req, res) => {
    /*
    · Method: DELETE
    · Description: Remove the specified event.
    · Clearance: Manager or higher
    · Payload: None

    · Response:
    o 204 No Content on success
    o 400 Bad Request if the event has already been published
    */
});

app.post('/events/:eventId/organizers', get_logged_in, check_clearance("manager"), async (req, res) => {
    /*
    · Method: POST
    · Description: Add an organizer to this event.
    · Clearance: Manager or higher
    · Payload:
    Field Required Type Description
    utorid Yes string The utorid of the organizer (he or she must have an account with us)

    · Response:
    o 201 Created on success { "id": 1, "name": "Event 1",
    "location": "BA 2250", "organizers": [ { "id": 1, "utorid": "johndoe1", "name": "John Doe" }, { "id": 2, "utorid": "alice666", "name": "Alice Liddell" } ] }
    · 400 Bad Request if the user is registered as a guest to the event (remove user as guest first, then retry)
    · 410 Gone if the event has ended
    */
});

app.delete('/events/:eventId/organizers/:userId', async (req, res) => {
    /*
    · Method: DELETE
    · Description: Remove an organizer from this event.
    · Clearance: Manager or higher
    · Payload: None

    · Response:
    o 204 No Content on success
    */

    // TODO: special clearance
});

app.post('/events/:eventId/guests', async (req, res) => {
    /*
    · Method: POST
    · Description: Add a guest to this event.
    · Clearance: Manager or higher, or an organizer for this event
    · Payload:
    Field Required Type Description
    utorid Yes string The utorid of the guest to be added

    · Response:
    o 201 Created on success { "id": 1,
    "name": "Event 1", "location": "BA 2250", "guestAdded": { "id": 3, "utorid": "jacksun0", "name": "Jack Sun" }, "numGuests": 1 }
    · 400 Bad Request if the user is registered as an organizer (remove user as organizer first, then retry)
    · 404 Not Found if the event is not visible to the organizer yet
    · 410 Gone if the event is full or has ended
    */

    // TODO: special clearance
});

app.delete('/events/:eventId/guests/:userId', async (req, res) => {
    /*
    · Method: DELETE
    · Description: Remove a guest from this event.
    · Clearance: Manager or higher (not organizers for this event)
    · Payload: None

    · Response:
    o 204 No Content on success
    */

    // TODO: special clearance
});

app.post('/events/:eventId/guests/me', get_logged_in, async (req, res) => {
    /*
    · Method: POST
    · Description: Add the logged-in user to the event
    · Clearance: Regular
    · Payload: None

    · Response:
    o 201 Created on success { "id": 1, "name": "Event 1", "location": "BA 2250", "guestAdded": { "id": 4, "utorid": "kian1234", "name": "Mo Kian" }, "numGuests": 1 }
    o 400 Bad Request if the user is already on the guest list
    o 410 Gone if the event is full or has ended

    Only the currently logged-in user should appear in the array.
    */
    const curr_level = req.user.role;

    if (curr_level !== 'regular') {
        return res.status(403).json({ error: "Must be a regular user" });
    }
});

app.delete('/events/:eventId/guests/me', async (req, res) => {
    /*
    · Method: DELETE
    · Description: Remove the logged-in user from this event.
    · Clearance: Regular
    · Payload: None

    · Response:
    o 204 No Content on success
    o 404 Not Found if the user did not RSVP to this event
    o 410 Gone if the event has ended
    */
    const curr_level = req.user.role;

    if (curr_level !== 'regular') {
        return res.status(403).json({ error: "Must be a regular user" });
    }
});

app.post('/events/:eventId/transactions', async (req, res) => {
    /*
    · Method: POST
    · Description: Create a new reward transaction
    · Clearance: Manager or higher, or an organizer for this event
    · Payload:
    Field Required Type Description
    type Yes string Must be "event"
    utorid No string The utorid of the guest to award the points. If utorid is not specified, amount is awarded to all guests
    amount Yes number Points to award to the guest. Must be a positive integer value.

    · Response:
    o 201 Created on success (when utorid is specified) { "id": 132, "recipient": "johndoe1", "awarded": 200, "type": "event", "relatedId": 1, "remark": "Trivia winner", "createdBy": "alice666" }
    o 201 Created on success (when utorid is not specified) [ { "id": 201, "recipient": "reidk129", "awarded": 100, "type": "event", "relatedId": 3, "remark": "meditation session", "createdBy": "alice666" }, { "id": 202, "recipient": "craigm34", "awarded": 100, "type": "event", "relatedId": 3, "remark": "meditation session", "createdBy": "alice666" }, { "id": 203, "recipient": "campj768", "awarded": 100, "type": "event", "relatedId": 3, "remark": "meditation session", "createdBy": "alice666" } ]
    o 400 Bad Request
        - If the user is not on the guest list (even if the capacity is unlimited)
        - If the remaining points is less than the requested amount.

    Awarding points to guests can be done after an event has ended. After this transaction is created, the points are awarded to the user immediately.

    Points can be awarded to the same guest multiple times, i.e., without restriction. For example, the event organizer can first award johndoe1 500 points, then award all guests (including johndoe1) 50 points each.
    */
    // TODO: special
});

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
    // TODO: special
});

app.get('/promotions/:promotionId', get_logged_in, check_clearance("regular"), async (req, res) => {
    /*
    · Method: GET
    · Description: Retrieve a single promotion
    · Clearance: Regular or higher
    · Payload: None

    · Response
    o 200 OK on success { "id": 3, "name": "Start of Summer Celebration", "description": "A simple promotion", "type": "automatic", "endTime": "2025-11-10T17:00:00Z", "minSpending": 50, "rate": 0.01, "points": 0 }
    o 404 Not Found if the promotion is currently inactive (not started yet, or have ended).
    */
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
});


const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

server.on('error', (err) => {
    console.error(`cannot start server: ${err.message}`);
    process.exit(1);
});