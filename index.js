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
    let response_size = 1;

    if (name) where.name  = name;
    if (role) where.role = role;
    if (verified) where.verified = verified === "true";

    if (activated) {
        if (activated === "true") {
            where.lastLogin = {not: null};
        } 
        
        if (activated === "false") {
            where.lastLogin = null;
        }
    }

    if (page) {
        response_size = page;
    }
    
    if (limit) {
        response_size = response_size * limit;
    } else {
        response_size = response_size * 10;
    }

    try {
        const data = await prisma.user.findMany({
            where,
            take: response_size,
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
        return res.status(200).json(data);
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
        return res.status(400).json({ message : "Utorid cannot be empty"});
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
            return res.status(401).json({ message: "A user with that token and utorid combination does not exist" });
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

//TRANSACTIONS

//My part


app.post('/users/me/transactions', get_logged_in, async (req, res) => {
    const currentUser = req.user;
    // if(!currentUser.verified) {
    //     return res.status(403).json({ "error": "Unverified user" });
    // }

    const {type, amount, remark} = req.body;
    if(type === undefined && amount === undefined && remark === undefined) {
        return res.status(400).json({ "error": "Empty payload" });
    }
    else if(type === undefined || amount === undefined) {
        return res.status(400).json({ "error": "Invalid payload" }); //passed
    }

    if(currentUser.points < amount) {
        return res.status(400).json({ "error": "Insufficient points to be redeemed" }); //passed
    }

    const data = {utorid: currentUser.utorid, createdBy: currentUser.utorid, spent: 0, earned: 0, suspicious: false, awarded: 0, processed: false};
    
    if(type !== undefined) {
        if(typeof type === 'string' && type === 'redemption') {
            data.type = type;
        }
        else {
            return res.status(400).json({"error": "Invalid transaction type"});
        }
    }
    if(amount !== undefined) {
        if(!isNaN(amount) && amount > 0) {
            data.amount = -(amount);
        }
        else {
            return res.status(400).json({"error": "Invalid transaction amount"});
        }
    }
    if(remark !== undefined) {
        if(typeof remark === 'string') {
            data.remark = remark;
        }
        else {
            return res.status(400).json({"error": "Invalid transaction remark"});
        }
    }

    const redeem = await prisma.transaction.create({
        data: data
    })

    const correspondingUser = await prisma.user.update({
        where: {id: currentUser.id},
        data: {
            cashiers: {connect: {id: redeem.id}}
        }
    })
    return res.status(201).json({id: redeem.id, utorid: redeem.utorid, type: type, processedBy: redeem.processedBy, amount: amount, remark: remark, createdBy: redeem.createdBy})
})

app.get('/users/me/transactions', get_logged_in, async (req, res) => {
    const currentUser = req.user;

    const {type, relatedId, promotionId, amount, operator, page: qpage, limit} = req.query;
    let where = {utorid: currentUser.utorid};
    const page = 1;
    const take = 10;

    if(type !== undefined) {
        if(type === 'transfer') {
            if(relatedId !== undefined) {
                
                where.type = type;
                where.relatedId = relatedId;
                
            }
            else {
                return res.status(400).json({"error": "Invalid payload"});
            }
        }
        else if(type === "promotion") {
            if(relatedId !== undefined) {
                
                where.type = type;
                where.relatedId = relatedId;
                //where.promotion = promotion;
            }
            else {
                return res.status(400).json({"error": "Invalid payload"});
            }
        }
        else if(type === "event") {
            if(relatedId !== undefined) {
                
                where.type = type;
                where.relatedId = relatedId;
                
            }
            else {
                    return res.status(400).json({"error": "Invalid payload"});
                }
        }
        else { //redemption
            where.type = type;
        } 
    }
    
    const transactions = await prisma.transaction.findMany({
            where,
            include: {promotions: true}
        })
    
    let filtered = [];
    if(promotionId !== undefined) {
        
        const findPromotion = await prisma.promotion.findUnique({
            where: {id: promotionId}
        })

        filtered = transactions.filter(t => {
            const found =
            t.promotions.filter(p => {
                return p.id === findPromotion.id;
            })

            if(found.length !== 0) {
                return t;
            }
        })
        
    }

    let roundTwo = filtered;
    if(amount !== undefined) {
        if(operator !== undefined) {
            if(operator === 'gte') {

                roundTwo = filtered.filter(t => {
                    return t.amount >= amount;
                })
                
            }
            else {
                roundTwo = filtered.filter(t => {
                    return t.amount <= amount;
                })
            }
        }
        else {
            return res.status(400).json({"error": "Invalid payload"});
        }
    }

    if(qpage !== undefined) {
        if(parseInt(qpage) < 0) {
            return res.status(400).json({ "error": "Invalid type for page" });
        }
        
        page = parseInt(qpage);        
    }

    if(limit !== undefined) {
        if(parseInt(limit) < 0) {
            return res.status(400).json({ "error": "Invalid type for limit" });
        }
        
        take = parseInt(limit);
    }
    
    const skip = (page - 1) * take;
    
    const result = roundTwo.map(e => {
        const {id, type, spent, amount, remark, createdBy, promotions, ...rest} = e;
        const promotionIds = promotions.map(promo => {
                return promo.id;
        })
        return {id, type, spent, amount, promotionIds, remark, createdBy};
    }).slice(skip, take + skip);

    
    return res.status(201).json({count: roundTwo.length, results: result});
})

app.post('/users/:userId/transactions', get_logged_in, async (req, res) => {
    const userid = req.params.userId;

    const currentUser = req.user; //sender
    if(!currentUser.verified) {
        return res.status(403).json({ "error": "Unverified sender" });
    }

    const findUser = await prisma.user.findUnique({ //recipient
        where: {id: parseInt(userid)}
    })

    console.log(findUser);

    const {type, amount, remark} = req.body;
    if(type === undefined && amount === undefined && remark === undefined) {
        return res.status(400).json({ "error": "Empty payload" });
    }
    else if(type === undefined || amount === undefined) {
        return res.status(400).json({ "error": "Invalid payload" });
    }

    if(currentUser.points < amount) {
        return res.status(400).json({ "error": "Insufficient points" }); //passed up to here
    }

    const dataSender = {relatedId: parseInt(userid), sender: currentUser.utorid, createdBy: currentUser.utorid, recipient: findUser.utorid, utorid: currentUser.utorid, spent: 0, earned: 0, suspicious: false, awarded: 0, processed: false};
    const dataRecipient = {relatedId: currentUser.id, sender: currentUser.utorid, createdBy: currentUser.utorid, recipient: findUser.utorid, utorid: findUser.utorid, spent: 0, earned: 0, suspicious: false, awarded: 0, processed: false};

    if(type !== undefined) {
        if(typeof type === 'string' && type === 'transfer') {
            dataSender.type = type;
            dataRecipient.type = type;
        }
        else {
            return res.status(400).json({"error": "Invalid transaction type"});
        }
    }
    if(amount !== undefined) {
        if(!isNaN(amount) && amount > 0) {
            dataSender.amount = -(amount);
            dataRecipient.amount = amount;
        }
        else {
            return res.status(400).json({"error": "Invalid transaction amount"});
        }
    }
    if(remark !== undefined) {
        if(typeof remark === 'string') {
            dataSender.remark = remark;
            dataRecipient.remark = remark;
        }
        else {
            return res.status(400).json({"error": "Invalid transaction remark"});
        }
    }

    const sender = await prisma.transaction.create({
        data: dataSender
    })

    const newPoints = currentUser.points + dataSender.amount; //less

    await prisma.user.update({
        where: {id: currentUser.id},
        data: {
            cashiers: {connect: {id: sender.id}},
            points: newPoints
        }
    })

    const recipient = await prisma.transaction.create({
        data: dataRecipient
    })

    const receivedPoints = findUser.points + dataRecipient.amount; //more

    await prisma.user.update({
        where: {id: findUser.id},
        data: {
            buyers: {connect: {id: sender.id}},
            points: receivedPoints
        }
    })

    return res.status(201).json({id: sender.id, sender: sender.sender, recipient: sender.recipient, type: sender.type, sent: amount, remark: sender.remark, createdBy: sender.createdBy});
})

app.patch('/transactions/:transactionId/processed', get_logged_in, check_clearance("cashier"), async (req, res) => {
    currentUser = req.user;
    const {processed} = req.body;

    // if(currentUser.role === 'regular') {
    //     return res.status(403).json({"error": "Only cashiers and higher can process a transaction"});
    // }

    const tid = req.params.transactionId;
    const transaction = await prisma.transaction.findUnique({
        where: {id: parseInt(tid)}
    })

    const user = await prisma.user.findUnique({
        where: {utorid: transaction.utorid}
    })

    if(processed === undefined || (processed !== undefined && !processed) || transaction.type !== 'redemption' || transaction.processed) {
        return res.status(400).json({"error": "Invalid payload"});
    }
    
    let newPoints = user.points + transaction.amount;
    await prisma.transaction.update({
        where: {id: parseInt(tid)},
        data: {
            processedBy: currentUser.utorid,
            processed: true,
            points: newPoints
        }
    })

    await prisma.user.update({
        where: {id: user.id},
        data: {
            cashiers: {connect: {id: parseInt(tid)}}
        }
    })

    return res.status(200).json({id: transaction.id, utorid: transaction.utorid, type: transaction.type, processedBy: transaction.processedBy, redeemed: -(transaction.amount), remark: transaction.remark, createdBy: transaction.createdBy})
})

//EVENT ROUTES


app.get('/events', get_logged_in, async (req, res) => {
    const currentUser = req.user;
   
    const {name, location, started, ended, showFull, page: qpage, limit, published} = req.query;
    
    let where = {};
    const page = 1;
    const take = 10;
    //start filtering
    if(name !== undefined) {
        where.name = name;
    }
    if(location !== undefined) {
        where.location = location;
    }

    if(started !== undefined) {
        
        if(started === 'true'){
            where.startTime = { lt: new Date() };
        }
        else if (started === 'false') {
            where.startTime = { gt: new Date() };
        }
    }
    if(ended !== undefined) {
        
        if(ended === 'true'){
            where.endTime = { lt: new Date() };
        }
        else {
            where.endTime = { gt: new Date() };
        }
    }

    if(qpage !== undefined) {
        if(parseInt(qpage) < 0 || isNaN(qpage)) {
            return res.status(400).json({ "error": "Invalid type for page" });
        }
        
        page = parseInt(qpage);        
    }

    if(limit !== undefined) {
        if(parseInt(limit) < 0 || isNaN(limit)) {
            return res.status(400).json({ "error": "Invalid type for limit" });
        }
        
        take = parseInt(limit);
    }
    
    const skip = (page - 1) * take;

    //check for errors
    if(started === 'true' && ended === 'true') {
        return res.status(400).json({"error": "Start time and end time are listed. Only one should be provided."}); //passed
    }

    if(published !== undefined) {
        if(published === 'false') {
            if(currentUser.role === 'manager' || currentUser.role === 'superuser') {
                where.published = false;
            }
            else {
                return res.status(403).json({"error": "Only managers or higher, can view published events"});
            } //passed
        }
        else {
            where.published = true;
        }
    }
    else if (published === undefined) {
        if(currentUser.role !== 'manager' && currentUser.role !== 'superuser') {
            where.published = true; //passed
        }
    }

    //const all = await prisma.event.findMany();
    //console.log(all);

    const events = await prisma.event.findMany({
                    where,
                    include: {guests: true}
                })
   

    let filtered = events;

    if(showFull !== undefined) {
        if(showFull === 'true') {
            filtered = events.filter(event => {
                if(event.capacity !== null) {
                    return event.capacity <= event.guests.length;
                }
            })

        }
        else {
            filtered = events.filter(event => {
                return (event.capacity > event.guests.length) || event.capacity === null;
            })
        }
    }
    else if (showFull === undefined){ //default false, not full
            filtered = events.filter(event => {
                return (event.capacity >= event.guests.length) || event.capacity === null;
            })
    }

    const resultRegular =
        filtered.map(event => {
            const {description, organizers, guests, published, pointsRemain, pointsAwarded, ...rest} = event;
            return {...rest, numGuests: guests.length};
        }).slice(skip, take + skip);
        

    const resultHigher =
        filtered.map(event => {
            const {description, organizers, guests, ...rest} = event;
            return {...rest, numGuests: guests.length};
        }).slice(skip, take + skip);    

    if(currentUser.role === 'manager' || currentUser.role === 'superuser') {
        
        return res.status(200).json({count: filtered.length, results: resultHigher}); 
    }
    else {
        return res.status(200).json({count: filtered.length, results: resultRegular}); 
    }
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

    const {name, description, location, startTime, endTime, capacity, points} = req.body;

    if (name === undefined && description === undefined && location === undefined && startTime === undefined && endTime === undefined && capacity === undefined && points === undefined) {
        return res.status(400).json({"error": "Empty payload"}); //passed
    }
    else if (name === undefined || description === undefined || location === undefined || startTime === undefined || endTime === undefined || points === undefined) {
        return res.status(400).json({"error": "Invalid payload"}); //passed
    }
    else{
        //validate the payload data types
        let dateobj = new Date(startTime);
        let dateobj2 = new Date(endTime);
        if(isNaN(dateobj.getTime()) || isNaN(dateobj2.getTime()) || (dateobj > dateobj2)) { //not a valid date
            return res.status(400).json({"error": "Invalid date format"}); //passed
        }

        if(capacity !== undefined && capacity < 0) {
            return res.status(400).json({"error": "Capacity cannot be negative"}); //passed
        }

        if(points < 0) {
            return res.status(400).json({"error": "Points cannot be negative"}); //passed
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
    const event = await prisma.event.findUnique( {
        where: {id: parseInt(eid)},
        include: {organizers: true}
    })
    
    const alreadyOrganizer = event.organizers.filter(org => {
            return org.id === currentUser.id;
        })

    if(!event.published) {
        return res.status(404).json({"error": "Event not found"});
    }

    if(currentUser.role === 'regular') {
        const {guests, published, pointsRemain, pointsAwarded, ...rest} = event;
        return res.status(200).json({...rest, numGuests: guests.length});
    }

    else if(alreadyOrganizer.length !== 0 || currentUser.role === 'manager' || currentUser.role === 'superuser') {
        return res.status(200).json(event);
    } 
    
})

app.patch('/events/:eventId', get_logged_in, async (req, res) => { //checked https requests
    const currentUser = req.user;
    if(!currentUser) {
        return res.status(401).json({"error": "Unauthorized"});
    }
    
    const eid = req.params.eventId;
    //fetch the event we want to update/patch up
    const event = await prisma.event.findUnique( {
        where: {id: parseInt(eid)},
        include: {organizers: true, guests: true}
    })

    if(!event) {
        return res.status(404).json({"error": "Event not found"});
    }

    //general clearance check
    if(!event.organizers.includes(currentUser) && currentUser.role !== 'manager' && currentUser.role !== 'superuser') {
        return res.status(403).json({"error": "Only managers or higher, or event organizers can update events"});
    }

    const {name, description, location, startTime, endTime, capacity, points, published}  = req.body;
  
    //what is the current date?
    const currentDate = new Date();
    
    //possible conditions leading to a 400 error
    if(startTime !== undefined && startTime !== null) {
         //check if theyre defined

        if(!isNaN(new Date(startTime).getTime()) && (new Date(startTime) < currentDate)) {
            return res.status(400).json({"error": "Event times cannot be in the past"}); //passed
        }  
    }
    if (currentDate > new Date(event.startTime)) {
       if(name !== null || description !== null || location !== null || startTime !== null || (capacity !== undefined && capacity !== event.capacity)) {
           return res.status(400).json({"error": "Cannot update name, description, location, start time, or capacity of an event that has already started"});
       }
   } 
    
    if (endTime !== undefined && endTime !== null) {
        if(!isNaN(new Date(endTime).getTime())) {
            if(new Date(endTime) < currentDate || new Date(endTime) < new Date(event.startTime) || (new Date(event.endTime) < currentDate && currentDate < new Date(endTime))) {
                return res.status(400).json({"error": "Event times cannot be in the past"});
            } 
        }
        else {
            return res.status(400).json({"error": "invalid payload"});
        }
    }

    if(capacity !== undefined && !isNaN(capacity)) {
        if (event.guests.length > capacity || capacity < 0) {
            return res.status(400).json({"error": "Event capacity not valid"});
        }
    }

    if(points !== undefined && !isNaN(points)) {
        if(currentUser.role !== 'manager') {
            return res.status(403).json({"error": "Only managers can update event points"});
        }
        else if ((points - event.pointsAwarded) < 0 || points < 0) { //??
            return res.status(400).json({"error": "Points not valid"});
        }
    }
    if(published) {
        if(currentUser.role !== 'manager') {
            return res.status(403).json({"error": "Only managers can publish events"});
        }
    }


    const dataToUpdate = {};
    if (name !== undefined && name !== null) {
        if(event.name !== name) {
            dataToUpdate.name = name;
        }
    }
    if (description !== undefined && description !== null) {
        if(event.description !== description) {
            dataToUpdate.description = description;
        }
    }
    if (location !== undefined && location !== null) {
        if(event.location !== location) {
            dataToUpdate.location = location;
        }
    }
    if (startTime !== undefined && startTime !== null) {
        if(new Date(event.startTime).getTime() !== new Date(startTime).getTime()) {
            dataToUpdate.startTime = startTime;
        }
    }
    if (endTime !== undefined && endTime !== null) {
        if(new Date(event.endTime).getTime() !== new Date(endTime).getTime()) {
            dataToUpdate.endTime = endTime;
        }
    }
    if (capacity !== undefined) {
        if(event.capacity !== capacity) {
            dataToUpdate.capacity = capacity;
        }
    }
    if (points !== undefined && points !== null) {
        if(event.points !== points) {
            dataToUpdate.pointsRemain = points;
        }
    }
    if (published !== undefined && published !== null) {
        if(event.published !== published) {
            dataToUpdate.published = published;
        }
    }
    
    console.log(dataToUpdate);

    //else
    const updatedEvent = await prisma.event.update({
        where: {id: parseInt(eid)},
        data: dataToUpdate,   
    });

    let resultEvent = {
        "id": updatedEvent.id,
        "name": updatedEvent.name,
        "location": updatedEvent.location,
    };

    Object.keys(dataToUpdate).forEach(key => {
        if(!['name', 'location'].includes(key)) {
            resultEvent[key] = dataToUpdate[key];
            if(key === 'pointsRemain') {
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

    const event = await prisma.event.findUnique( {
        where: {id: parseInt(eid)}
    })

    if(!event) {
        return res.status(404).json({"error": "Not found"});
    }

    if (event.published) {
        return res.status(400).json({"error": "Cannot delete a published event"});
    }

    await prisma.event.delete( {
        where: {id: parseInt(eid)}
    })
    return res.status(204).send();
})

app.post('/events/:eventId/organizers', get_logged_in, check_clearance("manager"), async (req, res) => { //checked https requests
    const currentUser = req.user;
    if(!currentUser) {
        return res.status(401).json({"error": "Unauthorized"});
    }
    // if(currentUser.role !== 'manager' && currentUser.role !== 'superuser') {
    //     return res.status(403).json({"error": "Only managers or higher can create events"});
    // }

    const {utorid} = req.body;
    if(utorid === undefined) {
        return res.status(400).json({"error": "Invalid payload"});
    }

    const user = await prisma.user.findUnique( {
        where: {utorid: utorid}
    })

    //valid user to add as an organizer?
    if(!user) {
        return res.status(404).json({"error": "User not found"});
    }

    const eid = req.params.eventId;
    const event = await prisma.event.findUnique( {
        where: {id: parseInt(eid)},
        include: { guests: true, organizers: true }
    })

    if(!event) {
        return res.status(404).json({"error": "Event not found"});
    }

    //valid user and valid event
    if(event.endTime < new Date()) {
        return res.status(410).json({"error": "Cannot add organizers to an event that has ended"});
    }
    else if (event.guests.includes(user)) {
        return res.status(400).json({"error": "User is already a guest of the event"});
    }
    else {

        const alreadyOrganizer = event.organizers.filter(org => {
            return org.id === user.id;
        })

        console.log(event.organizers);

        if(alreadyOrganizer.length === 0) {
            //console.log(event.organizers);
            const updatedEvent = await prisma.event.update({
                where: {id: parseInt(eid)},
                data: {
                    organizers: {connect: {id: user.id}}
                },
                include: {organizers: true}

            })
            
            const result = [];
            updatedEvent.organizers.forEach(org => {
                //console.log(org);
                const {id, utorid, name, ...rest} = org;
                result.push({id, utorid, name});
            })
            return res.status(201).json({id: event.id, name: event.name, location: event.location, organizers: result});
        }
        else {
            return res.status(409).json({"error": "User is already an organizer for this event"});
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

    const user = await prisma.user.findUnique( {
        where: {id: parseInt(uid)}
    })
    
    const event = await prisma.event.findUnique( {
        where: {id: parseInt(eid)},
        include: {organizers: true}
    })

    if(!event || !user) {
        return res.status(404).json({"error": "Not Found"});
    }

    const validOrganizer = event.organizers.filter(org => {
        return org.id === user.id;
    })

    if(validOrganizer.length !== 0) {
        const deleteUser = validOrganizer[0].id;
        const updatedEvent = await prisma.event.update({
            where: {id: parseInt(eid)},
            data: {
                organizers: {
                    disconnect: {id: deleteUser}
                }},
        })
        return res.status(204).send();
    }
    return res.status(404).json({"error": "User is not an organizer of this event"});
})

app.post('/events/:eventId/guests/me', get_logged_in, async (req, res) => { //checked https requests
    //logged in user
    const eid = req.params.eventId;
    const event = await prisma.event.findUnique( {
        where: {id: parseInt(eid)},
        include: {guests: true}
    })
    
    const user = req.user; //logged in user, needs middleware

    const validGuest = event.guests.filter(guest => {
        return guest.id === user.id;
    })

    if(validGuest.length !== 0) {
        return res.status(400).json({"error": "User is already a guest of the event"});
    }
    else if (event.capacity === event.guests.length || event.endTime < new Date()) {
        return res.status(410).json({"error": "Event is full or has ended"});
    }

    const updatedEvent = await prisma.event.update({
        where: {id: parseInt(eid)},
        data: {
            guests: {
                connect: {id: user.id}
            }
        },
        include: {guests: true}
    })
    
    const {id, utorid, name, ...rest} = user;

    return res.status(201).json({id: event.id, name: event.name, location: event.location, guestAdded: {id, utorid, name}, numGuests: updatedEvent.guests.length});

})

app.delete('/events/:eventId/guests/me', get_logged_in, async (req, res) => { //checked https requests
    const eid = req.params.eventId;
    const event = await prisma.event.findUnique( {
        where: {id: parseInt(eid)},
        include: {guests: true}
    })

    const user = req.user; //logged in user, needs basicAuth middleware
    const validGuest = event.guests.filter(guest => {
        return guest.id === user.id;
    })

    if (event.endTime < new Date()) {
        return res.status(410).json({"error": "Cannot remove guests from an event that has ended"});
    }

    if(validGuest.length !== 0) {
        const updatedEvent = await prisma.event.update({
            where: {id: parseInt(eid)},
            data: {
                guests: {
                    disconnect: {id: user.id}
                }
            }
        })
        return res.status(204).send();
    }
        else {
            return res.status(404).json({"error": "User is not a guest of the event"});
        }
        
});

app.post('/events/:eventId/guests', get_logged_in, async (req, res) => { //checked https requests
    const currentUser = req.user;
    if(!currentUser) {
        return res.status(401).json({"error": "Unauthorized"});
    }

    const eid = req.params.eventId;
    const event = await prisma.event.findUnique( {
        where: {id: parseInt(eid)},
        include: {organizers: true, guests: true}
    })

    const currentUserAlready = event.organizers.filter(org => {
        return org.id === currentUser.id;
    })

    if(currentUserAlready.length === 0 && currentUser.role !== 'manager' && currentUser.role !== 'superuser') {
        return res.status(403).json({"error": "Only managers or higher, or event organizers can update events"});
    }

    const {utorid} = req.body;
    const user = await prisma.user.findUnique( {
        where: {utorid: utorid}
    })

    const alreadyOrganizer = event.organizers.filter(org => {
        return org.id === user.id;
    })

    const alreadyGuest = event.guests.filter(guest => {
        return guest.id === user.id;
    })

    if(alreadyOrganizer.length !== 0) {
        return res.status(400).json({"error": "User is already an organizer of the event"});
    }
    else if(alreadyGuest.length !== 0) {
        return res.status(409).json({"error": "User is already a guest of this event"});
    }
    else if(!event.published) {
        return res.status(404).json({"error": "Event is not published yet"});
    }
    else if(event.capacity === event.guests.length || event.endTime < new Date()) {
        return res.status(410).json({"error": "Event is full or has ended"});
    }
    else {
        const updatedEvent = await prisma.event.update({
            where: {id: parseInt(eid)},
            data: {
                guests: {connect: {id: user.id}}
                },
                include: {guests: true}
        })
        
        const {id, utorid, name, ...rest} = user;

        return res.status(201).json({id: event.id, name: event.name, location: event.location, guestAdded: {id, utorid, name}, numGuests: updatedEvent.guests.length});
    }
})

app.delete('/events/:eventId/guests/:userId', get_logged_in, check_clearance("manager"), async (req, res) => {
    const currentUser = req.user;
    // if(currentUser.role !== 'manager' && currentUser.role !== 'superuser') {
    //     return res.status(403).json({"error": "Only managers or higher can remove guests"});
    // }

    const uid = req.params.userId;
    const eid = req.params.eventId;

    const user = await prisma.user.findUnique( {
        where: {id: parseInt(uid)}
    })
    
    const event = await prisma.event.findUnique( {
        where: {id: parseInt(eid)},
        include: {guests: true}
    })

    event.guests.filter(guest => {
        if(guest === user) {
            event.guests.remove(guest);
            return res.status(204);
        }
    })
})

app.post('/events/:eventId/transactions', get_logged_in, async (req, res) => { //checked https requests
    const currentUser = req.user;
    const {type, utorid, amount, remark} = req.body;

    const eid = req.params.eventId;
    const event = await prisma.event.findUnique( {
        where: {id: parseInt(eid)},
        include: {organizers: true, guests: true}
    })

    const currentUserAlready = event.organizers.filter(org => {
        return org.id === currentUser.id;
    })

    if(currentUserAlready.length === 0 && currentUser.role !== 'manager' && currentUser.role !== 'superuser') {
        return res.status(403).json({"error": "Only managers or higher, or event organizers can update events"});
    }
    
    if(type === undefined || type !== 'event' || amount === undefined || amount < 0 || amount > event.pointsRemain) {
        return res.status(400).json({"error": "Invalid payload"}); //passed
    }
    if(remark === undefined) {
            req.body.remark = null;
        }

    if(utorid !== undefined) {
        const findUser = await prisma.user.findUnique({
                where: {utorid: utorid}
            })

        const alreadyGuest = event.guests.filter(guest => {
            return guest.id === findUser.id;
        })

        if(alreadyGuest.length === 0) {
            return res.status(400).json({"error": "User is not a guest of the event"}); //passed
        }
        

        const newTransaction = await prisma.transaction.create({
        data: {
            utorid: utorid, //recipient transaction
            recipient: utorid,
            awarded: parseInt(amount), //must be <= pointsRemain
            type: type, //event
            relatedId: parseInt(eid), //related event
            remark: req.body.remark,
            createdBy: currentUser.utorid,
            spent: 0.0,
            earned: 0,
            suspicious: false,
            processed: false,
            amount: 0,
            sender:"",
            }
        })


        const prevPoints = findUser.points;
        const newPoints = prevPoints + amount;
        const remain = event.pointsRemain - amount;
        const reward = event.pointsAwarded + amount;
        const updatedEvent = await prisma.event.update({
            where: {id: parseInt(eid)},
            data: {
                pointsRemain: remain,
                pointsAwarded: reward
            }
        })
        const updatedUser = await prisma.user.update({
            where: {id: findUser.id},
            data: {
                buyers: {connect: {
                    id: newTransaction.id
                }},
                guest: {connect: {id: updatedEvent.id}},
                points: newPoints
            }
        })

        return res.status(201).json({id: newTransaction.id, recipient: utorid, awarded: amount, type: type, relatedId: eid, remark: remark, createdBy: newTransaction.createdBy});
    }

    else {
        const allUsers = await prisma.user.findMany();
        const newTransactions = [];

        for(const user of allUsers) {

            const alreadyGuest = event.guests.filter(guest => {
            return guest.id === user.id;
        })
            if(alreadyGuest.length === 0) {
                return res.status(400).json({message: "User is not a guest of the event"});
            }

            const newTransaction = await prisma.transaction.create({
                data: {
                    utorid: user.utorid, //recipient transaction
                    recipient: user.utorid,
                    awarded: parseInt(amount), //must be <= pointsRemain
                    type: type, //event
                    relatedId: parseInt(eid), //related event
                    remark: req.body.remark,
                    createdBy: currentUser.utorid,
                    spent: 0.0,
                    earned: 0,
                    suspicious: false,
                    processed: false,
                    amount: 0,
                    sender:"",
                    }
                 })

            const prevPoints = user.points;
        const newPoints = prevPoints + amount;
        const remain = event.pointsRemain - amount;
        const reward = event.pointsAwarded + amount;

        const updatedEvent = await prisma.event.update({
            where: {id: parseInt(eid)},
            data: {
                pointsRemain: remain,
                pointsAwarded: reward
            }
        })
        const updatedUser = await prisma.user.update({
            where: {id: user.id},
            data: {
                buyers: {connect: {
                    id: newTransaction.id
                }},
                guest: {connect: {id: updatedEvent.id}},
                points: newPoints
            }
        })


            let jsonobj = {
                "id": newTransaction.id,
                "recipient": user.utorid,
                "awarded": amount,
                "type": type,
                "relatedId": eid,
                "remark": req.body.remark,
                "createdBy": newTransaction.createdBy
            }
            newTransactions.push(jsonobj);
        }

        return res.status(201).json(newTransactions);
    }
    
})

//PROMOTIONS
app.post('/promotions', async (req, res) => {
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
    try {

        const { name, description, startTime, endTime, type, minSpending, rate, points, userId } = req.body;

        if (!name || !description || !startTime || !endTime) {
            return res.status(400).json({ error: "Name, description, start time and end time are required." });
        }

        const today = new Date();

        if (startTime < today) {
            return res.status(400).json({ error: "Date must be in the future." });
        }

        if (endTime <= startTime) {
            return res.status(400).json({ error: "Invalid time." });
        }

        if (Number(minSpending) <= 0 || Number(rate) <= 0 || Number(points) <= 0) {
            return res.status(400).json({ error: "min spending, rate and points must be positive numberic value." });
        }

        const newPromotion = await prisma.promotion.create({
            data: {
                name,
                description,
                startTime,
                endTime,
                type,
                minSpending,
                rate,
                points,
                userId
            }
        })

        return res.status(200).json(newPromotion);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database error" });
    }

});

// async function getCurrentUser(prisma, req) {
//     const utorid = req?.user?.username || req?.body?.createdBy || req?.query?.createdBy;
//     if (!utorid) return null;
//     return prisma.user.findUnique({
//         where: {
//             utorid
//         }
//     });
// }

app.get('/promotions', async (req, res) => {
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
        // checking authorized user
        // const currentUser = await getCurrentUser(prisma, req);
        // if(!currentUser) return res.status(401).json({error: "Unauthenticated"});

        const existingPromotions = await prisma.promotion.findMany({
            where: {
                userId: 1
            }
        })

        const formattedResponse = {
            count: existingPromotions.length,
            results: existingPromotions.filter(promotion => promotion.type == "automatic")
        };

        return res.status(200).json(formattedResponse);


    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database error" });
    }


});

app.get('/promotions/:promotionId', async (req, res) => {
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
        const promotionId = Number(req.params.promotionId);
        const existingPromotion = await prisma.promotion.findUnique({
            where: {
                id: promotionId
            }
        })

        return res.status(200).json(existingPromotion);


    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database error" });
    }
});

app.patch('/promotions/:promotionId', async (req, res) => {
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

        const promotionId = Number(req.params.promotionId);
        const oldPromotion = await prisma.promotion.findUnique({
            where: {
                id: promotionId
            }
        });

        if (!oldPromotion) {
            return res.status(404).json({ error: "Promotion not found" });
        }

        const now = new Date();
        const updates = req.body || {};

        if (updates.startTime || updates.endTime) {
            const startTime = updates.startTime ? new Date(updates.startTime) : oldPromotion.startTime;
            const endTime = updates.endTime ? new Date(updates.endTime) : oldPromotion.endTime;

            if (startTime < now || endTime < now) return res.status(400).json({ error: "startTime/endTime cannot be in the past." });
        }

        if (now >= oldPromotion.startTime) {
            const forbidden = ['name', 'description', 'type', 'startTime', 'minSpending', 'rate', 'points'];

            for (const element of forbidden) {
                if (updates[element] != null) {
                    return res.status(400).json({ error: "Cannot update " + element + " after promotion start" });
                }
            }
        }


        if (now >= oldPromotion.endTime && updates.endTime != null) {
            return res.status(400).json({ error: "Cannot update endTime after promotion end." })
        }

        const savedPromtion = await prisma.promotion.update({
            where: { id: promotionId },
            data: {
                name: updates.name ?? undefined,
                description: updates.description ?? undefined,
                type: updates.type ?? undefined,
                startTime: updates.startTime ?? undefined,
                endTime: updates.endTime ?? undefined,
                minSpending: updates.minSpending ?? undefined,
                rate: updates.rate ?? undefined,
                points: updates.points ?? undefined
            }
        })

        res.status(201).json(savedPromtion)

    } catch (error) {
        res.status(500).json({ error: "Database error." });
    }


});

app.delete('/promotions/:promotionId', async (req, res) => {
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
        const promotionId = Number(req.params.promotionId);
        const promotion = await prisma.promotion.findUnique({
            where: {
                id: promotionId
            }
        });


        if (!promotion) {
            return res.status(404).json({ error: "Promotion not found" });
        }

        const now = new Date();
        if (now >= promotion.startTime) {
            return res.status(403).json({ error: "Cannot delete a promotion that has started" });
        }

        await prisma.promotion.delete({
            where: {
                id: promotionId
            }
        })

        res.status(201).json({ message: "Promotion deleted successfully" });

    } catch (error) {
        res.status(500).json({ error: "Database error." });
    }
});


const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

server.on('error', (err) => {
    console.error(`cannot start server: ${err.message}`);
    process.exit(1);
});