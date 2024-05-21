import jwt from 'jsonwebtoken';
import ENV from '../config.js';


//--auth middleware
export default  function Auth(req, res, next){
    try {

        //--access authorize header to validate ueequest
        const token = req.headers.authorization.split(" ")[1];

        //--retrive the user details of the logged in user--
        const decodedToken =  jwt.verify(token, ENV.JWT_SECRET)

        req.user = decodedToken

        res.json(decodedToken); 

        // console.log('hello')

        next();

    } catch (error) {
        return res.status(401).json({error:"Authentication Failed...!"})
    }
}

//-----local variables for OTP
export function localVariables(req, res, next){
    req.app.locals = {
        OTP : null,
        resetSeession : false
    }
    next();
};

