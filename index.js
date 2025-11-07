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
const SECRET_KEY = process.env.JWT_SECRET
app.use(express.json());

// ADD YOUR WORK HERE


//TOKEN 
function generateToken(utorid, time) {
  const token = jwt.sign(
    { username: utorid },
    SECRET_KEY,
    { expiresIn: time }
  )

  return token
}

//USER
app.post('/users', async (req, res) => {
const {utorid, name, email, role} = req.body;

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
            return res.status(400).json({ message: "A user with that utorid already exists" });
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
                points: 0,
                suspicious: false,
                verified: false,
                resetToken,
                token: '',
                createdAt: curr_time,
                expiresAt: week_later.toISOString(),
                role
            },
        });

        // Respond with updated note
        return res.status(200).json({
            id: user.id,
            utorid: user.utorid,
            name: user.name,
            email: user.email,
            verified: user.verified,
            expiresAt: user.expiresAt,
            resetToken: user.resetToken
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database error"});
    }
});

app.get('/users', async (req, res) => {
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

app.patch('/users/me', get_logged_in, async (req, res) => {
    //TODO
    return res.status(200).json(req.user);
});

app.get('/users/me', get_logged_in, async (req, res) => {
    //TODO
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

app.patch('/users/me/password', async (req, res) => {
    //TODO
});

app.get('/users/:userId', async (req, res) => {
    const clearance = "Manager";
    const high_clearance = clearance === "Manager" || clearance === "Superuser"; 
    const target_id = parseInt(req.params.userId, 10);

    if (isNaN(target_id)) {
        console.log(req.params.userId)
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

app.patch('/users/:userId', async (req, res) => {
    const target_id = parseInt(req.params.userId, 10);
    const {email, verified, suspicious, role} = req.body;
    const data = {};

    if (isNaN(target_id)) {
        console.log(req.params.userId)
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


//AUTH
app.post('/auth/tokens', async (req, res) => {
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

        if (existing.password !== password) {
            return res.status(410).json({ message: "Incorrect password" });
        }

        let data = {};
        data.resetToken = '';
        data.token = jwt;
        data.createdAt = curr_time;
        data.lastLogin = curr_time;
        data.expiresAt = week_later;

        const updated_user = await prisma.user.update({
            where: { utorid: utorid,
                password: password
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
    //TODO
});

app.post('/auth/resets/:resetToken', async (req, res) => {
const resetToken = req.params.resetToken;
    const {utorid, password} = req.body;

    if (!resetToken || !utorid || !password) {
        return res.status(404).json({ error: "Must provide a reset token" });
    }
    
    let RegEx = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

    if (password.length < 8 || password.length > 20 || !RegEx.test(password)) {
        return res.status(400).json({ error: "password given was incorrect" });
    }

    try {
        const curr_time = new Date().toISOString();
        const existing = await prisma.user.findUnique({
            where: { utorid }
        });

        if (!existing) {
            return res.status(404).json({ message: "A user with that utorid does not exist" });
        }

        if (existing.lastLogin < curr_time) {
            return res.status(410).json({ message: "Token has expired" });
        }

        if (existing.resetToken !== resetToken) {
            return res.status(400).json({ message: "A user with that token and utorid combination does not exist" });
        }

        const updated_user = await prisma.user.update({
            where: { utorid: utorid },
            data: {
                password: password
            }
        });
        
        // Respond with updated note
        return res.status(200).json({})
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database error"});
    }
});

//TRANSACTIONS
app.post('/transactions', async (req, res) => {
    //TODO
});

app.get('/transactions', async (req, res) => {
    //TODO
});

app.get('/transactions/:transactionId', async (req, res) => {
    //TODO
});

app.patch('/transactions/:transactionId/suspicious', async (req, res) => {
    //TODO
});

//My part
app.post('users/:userId/transactions', async (req, res) => {
    const userid = req.params.userId;


    const currentUser = get_logged_in();

    //currentUser = req.user;
    if(!currentUser) {
        return res.status(403).json({ "error": "Unauthorized" });
    }

    const findUser = await prisma.user.findUnique({
        where: {id: userid}
    })

    const {type, amount, remark} = req.body;
    if(type === undefined && amount === undefined && remark === undefined) {
        return res.status(400).json({ "error": "Empty payload" });
    }
    else if(type === undefined || amount === undefined) {
        return res.status(400).json({ "error": "Invalid payload" });
    }

    if(currentUser.points < amount) {
        return res.status(400).json({ "error": "Insufficient points" });
    }


    const dataSender = {relatedId: userid, sender: currentUser.utorid, createdBy: currentUser.utorid, recipient: findUser.utorid};
    const dataRecipient = {relatedId: currentUser.id, sender: currentUser.utorid, createdBy: currentUser.utorid, recipient: findUser.utorid};
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
        if(typeof amount === 'number' && amount > 0) {
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

    currentUser.transactions.push(sender);
    currentUser.points = currentUser.points + dataSender.amount;

    const recipient = await prisma.transaction.create({
        data: dataRecipient
    })

    findUser.transactions.push(recipient);
    findUser.points = findUser.points + dataRecipient.amount;


    return res.status(201).json({id: sender.id, sender: sender.sender, recipient: sender.recipient, type: sender.type, sent: amount, remark: sender.remark, createdBy: sender.createdBy});
})

app.post('users/me/transactions', async (req, res) => {
    currentUser = req.user;
    if(!currentUser) {
        return res.status(403).json({ "error": "Unauthorized" });
    }

    const {type, amount, remark} = req.body;
    if(type === undefined && amount === undefined && remark === undefined) {
        return res.status(400).json({ "error": "Empty payload" });
    }
    else if(type === undefined || amount === undefined) {
        return res.status(400).json({ "error": "Invalid payload" });
    }

    if(currentUser.points < amount) {
        return res.status(400).json({ "error": "Insufficient points to be redeemed" });
    }

    const data = {utorid: currentUser.utorid, createdBy: currentUser.utorid};
    
    if(type !== undefined) {
        if(typeof type === 'string' && type === 'redemption') {
            data.type = type;
        }
        else {
            return res.status(400).json({"error": "Invalid transaction type"});
        }
    }
    if(amount !== undefined) {
        if(typeof amount === 'number' && amount > 0) {
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

    return res.status(201).json({id: redeem.id, utorid: redeem.utorid, type: type, processedBy: redeem.processedBy, amount: amount, remark: remark, createdBy: redeem.createdBy})
})

app.get('users/me/transactions', async (req, res) => {
    currentUser = req.user;

    const {type, relatedId, promotionId, amount, operator, page: qpage, limit} = req.query;
    where = {utorid: currentUser.utorid};
    const page = 1;
    const take = 10;

    if(type !== undefined) {
        if(type === 'transfer') {
            if(relatedId !== undefined) {
                const user = await prisma.user.findUnique({
                    where:{id: relatedId}
                })
                where.type = type;
                where.relatedId = relatedId;
                where.transfer = user;
            }
            else {
                return res.status(400).json({"error": "Invalid payload"});
            }
        }
        else if(type === "promotion") {
            if(relatedId !== undefined) {
                const promotion = await prisma.promotion.findUnique({
                    where:{id: relatedId}
                })
                where.type = type;
                where.relatedId = relatedId;
                where.promotion = promotion;
            }
            else {
                return res.status(400).json({"error": "Invalid payload"});
            }
        }
        else if(type === "event") {
            if(relatedId !== undefined) {
                const event = await prisma.event.findUnique({
                    where:{id: relatedId}
                })
                where.type = type;
                where.relatedId = relatedId;
                where.event = event;
            }
            else {
                    return res.status(400).json({"error": "Invalid payload"});
                }
        }
        else { //redemption
            where.type = type;
        }
        
    }
    
    if(promotionId !== undefined) {
        where.promotionIds.includes(promotionId);
    }
    if(amount !== undefined) {
        if(operator !== undefined) {
            if(operator === 'gte') {
                where.amount >= amount;
            }
            else {
                where.anount <= amount;
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
    
    const transactions = await prisma.transaction.findMany({
            where
        })
    
    const transactionspage = await prisma.transaction.findMany({
            where,
            skip,
            take
        })
    
    return res.status(201).json({count: transactions.length, results: transactionspage});
})

app.patch('transactions/:transactionId/processed', async (req, res) => {
    currentUser = req.user;
    const {processed} = req.body;

    if(currentUser.role === 'regular') {
        return res.status(403).json({"error": "Only cashiers and higher can process a transaction"});
    }

    const tid = req.params.transactionId;
    const transaction = await prisma.transaction.findUnique({
        where: {id: tid}
    })

    const user = await prisma.user.findUnique({
        where: {utorid: transaction.utorid}
    })

    if(processed === undefined || (processed !== undefined && !processed) || transaction.type !== 'redemption' || transaction.processed) {
        return res.status(400).json({"error": "Invalid payload"});
    }
    
    transaction.processedBy = currentUser.utorid;
    transaction.processed = true;
    user.points += transaction.amount; //redemption amount is negative
    user.transactions.push(transaction);

    return res.status(200).json({id: transaction.id, utorid: transaction.utorid, type: transaction.type, processedBy: transaction.processedBy, redeemed: -(transaction.amount), remark: transaction.remark, createdBy: transaction.createdBy})
})

//EVENT ROUTES
app.get('/events', get_logged_in, async (req, res) => {
    const currentUser = req.user;
    //query = req.query;
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
        
        if(started){
            where.startTime < new Date();
        }
        else {
            where.startTime > new Date();
        }
    }
    if(ended !== undefined) {
        
        if(ended){
            where.startTime < new Date();
        }
        else {
            where.startTime > new Date();
        }
    }
    if(showFull !== undefined) {
        if(showFull){
            where.capacity = guests.length;
        }
        else {
            where.capacity > guests.length;
        }
    }
    else if (showFull === undefined){ //default false, not full
            where.capacity > guests.length;
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

    //check for errors
    if(started && ended) {
        return res.status(400).json({"error": "Start time and end time are listed. Only one should be provided."});
    }

    if(published !== undefined) {
        if(!published) {
            if(currentUser.role === 'manager' || currentUser.role === 'superuser') {
                where.published = false;
            }
            else {
                return res.status(403).json({"error": "Only managers or higher, can view published events"});
            }
        }
        else {
            where.published = true;
        }
    }
    else if (published === undefined) {
        if(currentUser.role !== 'manager' && currentUser.role !== 'superuser') {
            where.published = true;
        }
    }

    const events = await prisma.event.findMany({
                    where,
                    skip,
                    take
                })
    
    const resultRegular =
        events.map(event => {
            const {description, organizers, guests, published, pointsRemain, pointsAwarded, ...rest} = event;
            return {...rest, numGuests: guests.length};
        });

    const resultHigher =
        events.map(event => {
            const {description, organizers, guests, ...rest} = event;
            return {...rest, numGuests: guests.length};
        });    

    if(currentUser.role === 'manager' || currentUser.role === 'superuser') {
        return res.status(200).json({count: resultHigher.length, results: resultHigher}); 
    }
    else {
        return res.status(200).json({count: resultRegular.length, results: resultRegular}); 
    }
})

app.post('/events', get_logged_in, async (req, res) => { //checked HTTP requests
    //Check that user is a manager or higher!!
    
    const currentUser = req.user;
    
    if(!currentUser) {
        console.log(currentUser);
        return res.status(401).json({"error": "Unauthorized"}); //passed, this is actually caught by middleware
    }
    if(currentUser.role !== 'Manager' && currentUser.role !== 'Superuser') {
        console.log(currentUser.role);
        return res.status(403).json({"error": "Only managers or higher can create events"});
    }

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
    currentUser = req.user;

    const eid = req.params.eventId;
    const event = await prisma.event.findUnique( {
        where: {id: parseInt(eid)}
    })
    
    if(!event.published) {
        return res.status(404).json({"error": "Event not found"});
    }

    if(currentUser.role === 'regular') {
        const {guests, published, pointsRemain, pointsAwarded, ...rest} = event;
        return res.status(200).json({...rest, numGuests: guests.length});
    }
           
    else if(event.organizers.includes(currentUser) || currentUser.role === 'manager' || currentUser.role === 'superuser') {
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

app.delete('/events/:eventId', get_logged_in, async (req, res) => { //checked https requests
    const currentUser = req.user;
    if(currentUser.role !== 'manager' && currentUser.role !== 'superuser') {
        return res.status(403).json({"error": "Only managers or higher can remove organizers"});
    }

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

app.post('/events/:eventId/organizers', get_logged_in, async (req, res) => { //checked https requests
    const currentUser = req.user;
    if(!currentUser) {
        return res.status(401).json({"error": "Unauthorized"});
    }
    if(currentUser.role !== 'manager' && currentUser.role !== 'superuser') {
        return res.status(403).json({"error": "Only managers or higher can create events"});
    }

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


app.delete('/events/:eventId/organizers/:userId', get_logged_in, async (req, res) => { //checked https requests
    const currentUser = req.user;
    if(currentUser.role !== 'manager' && currentUser.role !== 'superuser') {
        return res.status(403).json({"error": "Only managers or higher can remove organizers"});
    }

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

    if(!event.organizers.includes(currentUser) && currentUser.role !== 'manager' && currentUser.role !== 'superuser') {
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

app.delete('/events/:eventId/guests/:userId', get_logged_in, async (req, res) => {
    const currentUser = req.user;
    if(currentUser.role !== 'manager' && currentUser.role !== 'superuser') {
        return res.status(403).json({"error": "Only managers or higher can remove guests"});
    }

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
        include: {organizers: true}
    })

    if(!event.organizers.includes(currentUser) && currentUser.role !== 'manager' && currentUser.role !== 'superuser') {
        return res.status(403).json({"error": "Only managers or higher, or event organizers can update events"});
    }
    
    if(type === undefined || type !== 'event' || amount === undefined || amount < 0 || amount > event.pointsRemain) {
        return res.status(400).json({"error": "Invalid payload"});
    }


    if(!utorid === undefined) {
        const user = await prisma.user.findUnique({
                where: {utorid: utorid}
            })

        if(!event.guests.includes(user)) {
            return res.status(400).json({"error": "User is not a guest of the event"});
        }

        const newTransaction = await prisma.transaction.create({
        data: {
            utorid: utorid,
            recipient: utorid,
            awarded: amount,
            type: type,
            relatedId: eid,
            remark: remark,
            createdBy: currentUser.utorid
            }
        })

        user.transactions.push(newTransaction);
        user.points += amount;
        event.pointsRemain -= amount;
        event.pointsAwarded += amount;
        user.events.push(event);

        return res.status(201).json({id: newTransaction.id, recipient: utorid, awarded: amount, type: type, relatedId: eid, remark: remark, createdBy: newTransaction.createdBy});
    }

    else {
        const allUsers = await prisma.user.findMany();
        const newTransactions = [];
        allUsers.forEach(async user => {
            if(!event.guests.includes(user)) {
                return res.status(400).json({message: "User is not a guest of the event"});
            }

            const newTransaction = await prisma.transaction.create({
                data: {
                    utorid: user.utorid,
                    recipient: user.utorid,
                    awarded: amount,
                    type: type,
                    relatedId: eid,
                    remark: remark,
                    createdBy: currentUser.utorid
                }
            })

            user.transactions.push(newTransaction);
            user.points += amount;
            event.pointsRemain -= amount;
            event.pointsAwarded += amount;
            user.events.push(event);

            let jsonobj = {
                "id": newTransaction.id,
                "recipient": user.utorid,
                "awarded": amount,
                "type": type,
                "relatedId": eid,
                "remark": remark,
                "createdBy": newTransaction.createdBy
            }
            newTransactions.push(jsonobj);
        })

        return res.status(201).json(newTransactions);
    }
    
})

//PROMOTIONS

const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

server.on('error', (err) => {
    console.error(`cannot start server: ${err.message}`);
    process.exit(1);
});