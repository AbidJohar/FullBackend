import { User } from "../models/userModel.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiErrorHandler.js";


 const verifyJWT = asyncHandler(async (req,res,next)=>{
         
  try {
      
    const token =  req.cookies?.accessToken;
       console.log("req.cookies:", req.cookies);
       console.log("req.cookies.accessToken:", req.cookies.accessToken);
        
       
    if(!token){
      throw new ApiError(401, "unauthorized access");
    }
  
   const decodedInfo = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        
         const user = await User.findById(decodedInfo?._id).select("-password -refreshToken");
  
         if(!user){
          throw new ApiError(400, "invalid access token");
         }
  
         req.user = user;
         next();
  } catch (error) {
      console.log("Error in authMiddleware:", error);
    throw new ApiError(401, error?.message);
    
  }
})
export {verifyJWT};