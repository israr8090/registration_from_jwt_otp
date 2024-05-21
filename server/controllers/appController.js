import UserModel from "../model/User.model.js"
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import ENV from '../config.js';
import otpGenerator from 'otp-generator'


//--middleware for verify user---------
export async function verifyUser(req, res, next) {
    try {

        const { username } = req.method == "GET" ? req.query : req.body;

        //--check the user existance--
        let exist = await UserModel.findOne({ username });
        if (!exist) return res.status(404).send({ error: "Can't find User!" });
        next();

    } catch (error) {
        return res.status(404).send({ error: "Autentication Error" });
    }
}

//--------------------------------------------------------------------------------------

/** POST: http://localhost:8000/api/register 
 * @param : {
  "username" : "example123",
  "password" : "admin123",
  "email": "example@gmail.com",
  "firstName" : "bill",
  "lastName": "william",
  "mobile": 8009860560,
  "address" : "Apt. 556, Kulas Light, Gwenborough",
  "profile": ""
}
*/
export async function register(req, res) {
    const { username, password, profile, email } = req.body;
    // console.log(req.body);
    try {
        let user = await UserModel.findOne({ email: email });
        //--check the existing username
        if (user) return res.status(500).send({ message: "Email already registered...!" });

        user = await UserModel.findOne({ username: username });
        //--check the existing user email
        if (user) return res.status(500).send({ message: "username already registered...!" });

        //--bcrypting password--
        const hashedPassword = await bcrypt.hash(password, 10);

        //--asigning newUser in shema model
        const newUser = new UserModel({
            username,
            password: hashedPassword,
            profile: profile || '',
            email
        });

        //--save the newUser in db
        const result = await newUser.save();

        return res.status(201).send({ msg: "User Register Successfully", user: result })

    } catch (error) {
        return res.status(500).send({ msg: "hello1", error })
    }
};


/** POST: http://localhost:8000/api/login 
 * @param: {
  "username" : "example123",
  "password" : "admin123"
}
*/
export async function login(req, res) {
    const { username, password } = req.body;

    try {

        UserModel.findOne({ username })
            .then(user => {
                bcrypt.compare(password, user.password)
                    .then(passwordCheck => {

                        if (!passwordCheck) return res.status(400).send({ error: "Don't have Password" });

                        //--create jwt token
                        const token = jwt.sign({
                            userId: user._id,
                            username: user.username
                        }, ENV.JWT_SECRET, { expiresIn: "24h" });

                        return res.status(200).send({
                            msg: "Login Successful...!",
                            usrname: user.username,
                            token
                        })

                    })

                    .catch(error => {
                        return res.status(400).send({ error: "Password does not Match" });
                    })
            })
            .catch(error => {
                return res.status(404).send({ error: "Username not Found" });
            })

    } catch (error) {
        return res.status(500).send({ error })
    }
};


/** GET: http://localhost:8080/api/user/example123 */
export async function getUser(req, res) {
    const { username } = req.params;
    // console.log(username)

    try {

        if (!username) return res.status(501).send({ error: "Invalid Username" });

        // UserModel.findOne({username}, function(err, user){
        //     if(err) return res.status(500).send({err});
        //     if(!user) return res.status(501).send({error: "Couldn't Find the User"});

        //     return res.status(201).send(user);
        // })

        let user = await UserModel.findOne({ username })
        if (!user) return res.status(501).send({ error: "Couldn't Find the User" });

        //--remove password from user--
        // mongoose return unnecessary data with object so convert it into json
        const { password, ...rest } = Object.assign({}, user.toJSON());

        return res.status(201).send(rest);

    } catch (error) {
        return res.status(404).send({ error: "Cannot Find User Data" });
    }
};


/** PUT: http://localhost:8000/api/updateuser 
 * @param: {
  "header" : "<token>"
}
body: {
    firstName: '',
    address : '',
    profile : ''
}
*/
export async function updateUser(req, res) {

    try {
        const id = req.query.id;
        // console.log(id)
        // const {userId} = req.user;
        // console.log(userId)

        if (id) {
            const body = req.body;

            // //--update the data
            // UserModel.updateOne({ _id: id }, body, function (err, data) {
            //     if (err) throw err;

            //     return res.status(201).send({ msg: "Record Updated...!" });
            // });

            const user = await UserModel.updateOne({ _id: id }, body);

            return res.status(201).send({ msg: "Record Updated...!" });

        } else {
            return res.status(401).send({ erro: "User Not Found...!" });
        }

    } catch (error) {
        return res.status(401).send({ error })
    }
};


/** GET: http://localhost:8000/api/generateOTP */
export async function generateOTP(req, res) {
    req.app.locals.OTP = await otpGenerator.generate(6, { lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false });
    res.status(201).send({ code: req.app.locals.OTP });

};


/** GET: http://localhost:8080/api/verifyOTP */
export async function verifyOTP(req, res) {
    const { code } = req.query;
    if (parseInt(req.app.locals.OTP) === parseInt(code)) {
        req.app.locals.OTP = null;      //-reset the OTP value
        req.app.locals.resetSession = true;    //--start session for reset password
        return res.status(201).send({ msg: "Verify Successfully!" })
    }
    return res.status(400).send({ msg: "Infvalid OTP" })
};



// successfully redirect user when OTP is valid
/** GET: http://localhost:8080/api/createResetSession */
export async function createResetSession(req, res) {
    if (req.app.locals.resetSession) {
        req.app.locals.resetSession = false; //allow access to this route only once
        return res.status(201).send({ msg: "access granted!" })
    }
    return res.status(440).send({ error: "Session expired" });
};


// update the password when we have valid session
/** PUT: http://localhost:8000/api/resetPassword */
export async function resetPassword(req, res) {
    try {
        if (!req.app.locals.resetSession) return res.status(440).send({ error: "Session expired" });
        const { username, password } = req.body;

        try {

            const user = await UserModel.findOne({ username })
            if (!user) return res.status(404).send({ error: "Username not Found" });
            if (user) {
                const hashedPassword = await bcrypt.hash(password, 10);
                const updatedUser = await UserModel.updateOne({ username: user.username }, { password: hashedPassword });

                req.app.locals.resetSession = false;

                return res.status(201).send({ msg: "Record Updated...!", user: updatedUser });
                
            } else {
                return res.status(401).send({ error: "Enable to hashed Password" })
            }


        } catch (error) {
            return res.status(500).send({ error })
        }

    } catch (error) {
        return res.status(401).send({ error })
    }
};