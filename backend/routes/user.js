const express = require('express')
const { z } = require('zod')
const { User, Account } = require('../db')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET
const SALT = 10

// SignUpBody validation
const signUpBody = z.object({
    username: z.string({
        required_error: 'Username is required',
        invalid_type_error: 'Username must be string'
    }).min(3).trim().toLowerCase(),
    firstName: z.string().toLowerCase(),
    lastName: z.string().toLowerCase().optional(),
    password: z.string({
        required_error: 'Password is required',
        invalid_type_error: 'Password must be a string'
    }).min(4, { message: 'Paasword must be a longer than 4 characters!' })
})

router.post('/signup', async (req, res) => {

    const body = req.body

    const userBody = signUpBody.safeParse(body)

    if (userBody.success) {

        const existingUser = await User.findOne({ username: userBody.data.username })

        if (!existingUser) {
            try {
                const user = User.create({
                    ...userBody.data,
                    password: bcrypt.hash(userBody.data.password, SALT)
                })
                const userId = user._id;

                Account.create({
                    userId,
                    balance: 1 + Math.random() * 10000
                })

                const token = jwt.sign({ userId }, JWT_SECRET)

                res.status(201).json({
                    message: "User create successfully",
                    token: token
                })

            } catch (error) {
              res.status(500).send(error)
            }
        }
        else {
            res.status(400).json({ message: 'User already exists' })
        }
    }
    else {
        res.status(400).send(userBody.error.format())
    }
})

//login body validation

const loginBody = z.object({
    username: z.string({
        required_error: 'Username is required',
        invalid_type_error: 'Username must be a string'
    }),
    password: z.string({
        required_error: 'Password is required',
        invalid_type_error: 'Password must be a string'
    }).min(4, {message: 'Password must be longer than 4 characters'})
})

router.post('/signin' , async (req,res) => {
    
    const body = req.body

    const userBody = loginBody.safeParse(body)

    if(userBody.success){
     const existingUser = User.findOne({username: userBody.data.username})

     if(!existingUser) {
        return res.status(404).json({ message: "User not found! Please check username or signup first." })
     }else {
      
        const passCheck = await bcrypt.compare(User.data.password, existingUser.password);
        
        if(passCheck) {

            const userId = existingUser._id;
            const token = jwt.sign({ userId }, JWT_SECRET);
            return res.status(200).json({ message: "Logged in successfully!", token: token });
        }

        return res.status(401).json({message: 'Incorrect Password, Please Retry!'})
     }
    }
    else {
        res.status(400).send(userBody.error.format())
    }
})

// Update User Body Validation
const updateUserBody = z.object({
    password: z.string({
        required_error: "Password is required",
        invalid_type_error: "Password must be a string",
    }).min(3).trim(),
    firstName: z.string(),
    lastName: z.string(),
}).partial();

router.put('/updateUser', authMiddleware, async (req, res) => {
    try {
        const User = updateUserBody.safeParse(req.body)
        if (!User.success) {
            return res.status(411).send(User.error.format());
        }

        // If password is provided in body hash it
        if (User.data.password) {
            // Hash the password
            User.data.password = await bcrypt.hash(User.data.password, SALT);
        }

        const updatedUser = await userModel.updateOne({ _id: req.userId }, User.data)

        console.log(updatedUser)
        res.status(200).json({ message: 'Successfully Updated!' })

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server Error" });
    }
})

module.exports = router;
