import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

import User from '../models/users.js'
import auth from '../middleware/auth.js'
let refreshTokens = []

var userRouter = express.Router();

//Create
userRouter.post('/signup', async (req, res) => {
    try {
        const {
            username,
            password,
            isVerified,
            role,
        } = req.body;

        const saltRounds = 10;
        const hashedPw = await bcrypt.hash(password, saltRounds);

        const usernameDuplicate = await User.findOne({
            "username": username
        })

        if (usernameDuplicate) {
            res.status(400).json({
                status: res.statusCode,
                message: 'This Username Already Registered'
            });
        } else {
            User.create({
                username: username,
                password: hashedPw,
                role: role,
                isVerified: isVerified,
            })
            res.status(201).json({
                status: res.statusCode,
                message: 'Success Registration, Please Login'
            });
        }
    } catch (error) {
        res.status(500).json({
            error: error
        })
    }
});

//login
userRouter.post('/login', async (req, res) => {
    try {
        const {
            username,
            password
        } = req.body;

        const currentUser = await new Promise((resolve, reject) => {
            User.find({
                "username": username
            }, function (err, cust) {
                if (err)
                    reject(err)
                resolve(cust)
            })
        })

        //cek apakah ada user?
        if (currentUser[0]) {
            //check password
            bcrypt.compare(password, currentUser[0].password).then(function (result) {
                if (result) {
                    const result = currentUser[0];
                    const id = result.id;
                    const isVerified = result.isVerified;
                    const role = result.role;
                    //urus token disini
                    let accessToken = jwt.sign({
                        id: id,
                        isVerified: isVerified,
                        role: role
                    }, process.env.SECRET, {
                        expiresIn: '20s'
                    });
                    let refreshToken = jwt.sign({
                        id: id,
                        isVerified: isVerified,
                        role: role
                    }, process.env.SECRET2, {
                        expiresIn: 604800
                    });
                    refreshTokens.push(refreshToken);
                    res.cookie('jwt', accessToken, {
                        httpOnly: true,
                        maxAge: -1
                    });
                    res.status(200).json({
                        status: res.statusCode,
                        accessToken,
                        refreshToken
                    });
                } else {
                    res.status(400).json({
                        status: res.statusCode,
                        message: "wrong password."
                    });
                }
            });
        } else {
            res.status(400).json({
                status: res.statusCode,
                message: `User with Username = ${req.body.username} was not found!`
            });
        }
    } catch (error) {
        res.status(500).json({
            error: error
        })
    }
})

//renewAccessToken
userRouter.post('/renewAccessToken', async (req, res, next) => {
    const refreshToken = req.body.token;
    if (!refreshToken || !refreshTokens.includes(refreshToken)) {
        return res.status(403).json({
            status: res.statusCode,
            message: "failed not authenticated"
        });
    }
    jwt.verify(refreshToken, process.env.SECRET2, async function (err, decoded) {
        let result = decoded
        const id = result.id;
        const isVerified = result.isVerified;
        const role = result.role;
        if (!err) {
            const accessToken = jwt.sign({
                id: id,
                isVerified: isVerified,
                role: role
            }, process.env.SECRET, {
                expiresIn: 604800
            });
            return res.status(201).json({
                status: res.statusCode,
                accessToken
            });
        } else {
            return res.status(403).json({
                status: res.statusCode,
                message: "User not authenticated"
            });
        }
    })
})

//Read data users with specific role
userRouter.get('/user', auth, async (req, res) => {

    const role = req.user.role;
    try {
        if (role == '1') {
            const user = await User.find({
                role: 1
            });
            if (user && user.length !== 0) {
                res.status(200).json({
                    status: res.statusCode,
                    data: user
                })
            } else {
                res.status(400).json({
                    status: res.statusCode,
                    message: 'Users not found'
                });
            }
        } else {
            const user = await User.find({
                role: 0
            });
            if (user && user.length !== 0) {
                res.status(200).json({
                    status: res.statusCode,
                    data: user
                })
            }
        }
    } catch (error) {
        res.status(500).json({
            error: error
        })
    }
});

//Update data user with username
//Just Admin (Role = 0)
userRouter.put('/user/:username', auth, async (req, res) => {
    // const id = req.user.id
    const role = req.user.role;
    const data = req.params.username;
    try {
        if (role == '0') {
            const {
                username,
                password
            } = req.body;

            const user = await User.findOne({
                username: data
            });
            if (user) {
                let saltRounds = 10;
                const hashedPw = await bcrypt.hash(password, saltRounds);
                user.username = username;
                user.password = hashedPw;

                const updateDatauser = await user.save()

                res.status(200).json({
                    status: res.statusCode,
                    data: updateDatauser
                })
            } else {
                res.status(400).json({
                    status: res.statusCode,
                    message: `User with Username = ${data} was not found!`
                })
            }
        } else {
            res.status(401).send({
                status: res.statusCode,
                message: "this role not allowed to access this endpoint",
            })
        }
    } catch (error) {
        res.status(500).json({
            error: error
        })
    }
})

//Delete User with username
//Just Admin (Role = 0)
userRouter.delete('/user/:username', auth, async (req, res) => {
    const role = req.user.role;
    try {
        if (role == '0') {
            User.findOneAndDelete({
                    username: req.params.username
                })
                .then(data => {
                    if (!data) {
                        res.status(400).send({
                            status: res.statusCode,
                            message: `User with Username = ${req.params.username} was not found!`
                        });
                    } else {
                        res.send({
                            status: res.statusCode,
                            message: `User with Username = ${req.params.username} was deleted successfully!`
                        });
                    }
                })
                .catch(err => {
                    res.status(500).send({
                        status: res.statusCode,
                        message: "Could not delete User with Username = " + req.params.username
                    });
                });
        } else {
            res.status(401).send({
                status: res.statusCode,
                message: "this role not allowed to access this endpoint",
            })
        }
    } catch (error) {
        res.status(500).json({
            error: error
        })
    }
})

export default userRouter;