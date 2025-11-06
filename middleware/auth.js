require('dotenv').config();
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET

const get_logged_in = async (req, res, next) => { 
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "missing auth header" });
    }

    const token = authHeader.split(' ')[1]; // this gives the raw token string
    const payload = jwt.verify(token, SECRET_KEY);

    try {
        const current_user = await prisma.user.findUnique({
            where: { utorid: payload.username }
        });

        if (!current_user) {
            return res.status(401).json({ message: "user not found" })
        }

        req.user = current_user;
        next();
    } catch(e) {
        return res.status(401).json({ message: "invalid auth token" });
    }
}

module.exports = get_logged_in;