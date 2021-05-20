import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config()

const auth = async (req, res, next) => {

    try {
        let token = req.headers['authorization'];
        if (!token) return res.status(401).send({
            auth: false,
            message: 'No token provided.'
        });

        jwt.verify(token, process.env.SECRET, async function (err, decoded) {
            if (err) return res.status(401).send({
                auth: false,
                message: 'Failed to authenticate token.'
            });
            if (decoded.isVerified == '1') {
                req.user = decoded;
                next();
            } else {
                res.status(200).send({
                    status: res.statusCode,
                    message: "please verified your account",
                })
            }
        });
    } catch (error) {
        res.status(401).send({
            status: res.statusCode,
            message: "has no authority",
        })
    }
};

export default auth;