import {asyncHandler} from '../utils/asyncHandler.js'
import { ApiError } from '../utils/apiErrorHandler.js';
import { User } from '../models/userModel.js';
import { uploadonCloudinay } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/apiResponseHandler.js';
import jwt from "jsonwebtoken";
import mongoose, { mongo } from 'mongoose';


// generate access and refresh token
const generateAccessandRefreshTokens = async(userid)=>{
 try {
      const user =  await User.findById(userid);
       const accessToken =  user.generateAccessToken();
       const refreshToken =  user.generateRefreshToken();
           
       user.refreshToken = refreshToken;
       // after adding refresh token save the user in db
       // as password is required, that'why we write validateBeforeSave
       user.save({validateBeforeSave: false});

       return {accessToken, refreshToken}

 } catch (error) {
    console.log("Error at generateAccessAndRefreshTokens:", error);
    
 }
}
const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body;
    
    // Validation
    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // Check if user already exists
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    // Handle file uploads directly from memory
    let avatarResponse = null;
    let coverImageResponse = null;

    if (req.files?.avatar?.[0]) {
        const avatarFile = req.files.avatar[0];
        avatarResponse = await uploadonCloudinay(avatarFile.buffer, avatarFile.originalname);
        if (!avatarResponse) {
            throw new ApiError(400, "Avatar upload failed");
        }
    }

    if (req.files?.coverImage?.[0]) {
        const coverImageFile = req.files.coverImage[0];
        coverImageResponse = await uploadonCloudinay(coverImageFile.buffer, coverImageFile.originalname);
    }

    // Create user
    const user = await User.create({
        fullName,
        avatar: avatarResponse?.secure_url || "",
        coverImage: coverImageResponse?.secure_url || "",
        email,
        password,
        username: username.toLowerCase()
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    );
});

const loginUser = asyncHandler( async(req,res)=>{

  // req.body -> data
  // check username and password
  // find the user
  //password check
  //access and refresh token
  // send cookie

    const {email,username,password} = req.body;
            console.log("email and password",email,password);
            
    if(!(username || email)){
      throw new ApiError(400, "username or email is required");
    }
        // check the user exist or not on the basis of email or username
    const user = await User.findOne({
      $or:[{email},{username}]
    })
   
    if(!user){
      throw new ApiError(404, "user doesn't exist")
    }

  const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid){
 throw new ApiError(401, "Incorrect password");
    }
     
  
  const {accessToken, refreshToken}  = await generateAccessandRefreshTokens(user._id);
  // console.log("accessToken", accessToken, "refreshToken",refreshToken);
  
     const loggedInUser =   await User.findById(user._id).select("-password -refreshToken");
  // httponly make the cookie only editable by server side, not at frontend side
  const options = {
    httpOnly: false,
    secure: false
  }

  return res
   .cookie("accessToken", accessToken, options)
   .cookie("refreshToken", refreshToken, options)
   .json(
    new ApiResponse(
      200,
      {
        user: loggedInUser,accessToken,refreshToken
      },
      "User login successfully"   
    )
   )
  

});

const logoutUser = asyncHandler( async(req,res)=>{
        
     await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          refreshToken:null
        },
      },
      {
        new: true
      }
    )

    const options = {
      httpOnly: true,
      secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new ApiResponse(200,{}, "User logout sucessfully")
    )

});

const accessIncomingRefreshToken = asyncHandler(async (req,res)=>{
   const incomingRefreshToken = req.cookies.refreshToken;
   if(!incomingRefreshToken){
    throw new ApiError(401, "unauthorized request");
   }

   const decodedData = jwt.verify(incomingRefreshToken, process.env.refreshToken);
   
const user = await  User.findById(decodedData?._id);
  if(!user){
    throw new ApiError(400, "Invalid refresh Token");
  }

  if(incomingRefreshToken !== user?.refreshToken){
    throw new ApiError(400, "Refresh Token is expired or used");
  }

 const {accessToken, newRefreshToken} = await generateAccessandRefreshTokens(user._id);
    
  const options = {
    httpOnly: true,
    secure: true
  }

  return res
       .status(200)
       .cookie("accessToken", accessToken, options )
       .cookie("refreshToken", newRefreshToken, options )
       .res(
        200,
        {
          accessToken, newRefreshToken
        },
        "New refresh Token is generated"

       )


});

const getCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword, newPassword} = req.body;

    if(!(oldPassword && newPassword)){
      throw new ApiError(400, "required both field to change password");
    }
   
  const user = await User.findById(req.user._id); 
 const  isPasswordCorrect =  user.isPasswordCorrect(oldPassword);

 if(!isPasswordCorrect){
  throw new ApiError(401, "Old password is incorrect");
 }
    
    user.password = newPassword;

   await user.save({validateBeforeSave: false});

   return res
   .status(200)
   .json(new ApiResponse( 200, {}, "Password successfully changed"));

});

const userUpdate = asyncHandler(async (req,res)=>{

const {email,fullName}  = req.body;

if(!email && !fullName){
  throw new ApiError(404, "Email and full name is required");
}

 await User.findByIdAndUpdate(req.user._id,
  {
    $set: {
      email,
      fullName: fullName
    }
  },
  {
    new: true
  }
 ).select("-password");

 return res
 .status(200)
 .json(new ApiResponse(200, {}, "profile updated successfully"));


})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
              .status(200)
              .json(new ApiResponse(200, req.user, "Current user get successfully"))
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, "Avatar file is missing");
    }

    // Upload directly from buffer
    const avatarResponse = await uploadonCloudinay(req.file.buffer, req.file.originalname);
    
    if (!avatarResponse) {
        throw new ApiError(400, "Error while uploading avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatarResponse.secure_url
            }
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, "Cover image file is missing");
    }

    // Upload directly from buffer
    const coverImageResponse = await uploadonCloudinay(req.file.buffer, req.file.originalname);
    
    if (!coverImageResponse) {
        throw new ApiError(400, "Error while uploading cover image");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImageResponse.secure_url
            }
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req,res)=>{

  const {username} = req.params;

  if(!username?.trim()){
    throw new ApiError(400, "username is not existing");
  }
  
 const ChannelDetails = await User.aggregate(
  [
    {
      $match:{
        username:username
      }
    },
    {
      $lookup:{
          from: "subscriptions",
          localField:"_id",
          foreignField: "channel",
          as: "subscribers"
      }
    },
    {
      $lookup:{
         from: "subscriptions",
         localField:"_id",
         foreignField:"subscriber",
         as:"subscribedTo"
      }
    },
    {
      $addFields:{
         subscribersCount:{
            $size: "$subscibers"
         },
         channelsSubscribedToCount:{
          $size: "$subscribedTo"
         },
         isSubscribed:{
          $cond: {
            if: {$in: [req.user?._id, "$subscibers.subscriber"]},
            then: true,
            else: false
          }
         }
      }
    },
    {
      $project:{
        username:1,
        fullName:1,
        avatar:1,
        coverImage:1,
        isSubscribed:1,
        email:1,
        channelsSubscribedToCount:1,
        subscribersCount:1
      }
    }
  ]
 )
 if(!ChannelDetails?.length){
  throw new ApiError(404, "channel not found");
 }

 return res
           .status(200)
           .json(new ApiResponse(200, ChannelDetails, "user channel  Details fetched successfully"));
});

const getWatchHistory = asyncHandler(async(req,res)=>{

  const user = await aggregate([
    {
      $match: {
        _id: mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "watchHistory",
        as: "watchHistory",
        pipeline:[
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,

                  }
                }
              ]

            }
          },
          {         // for user easier so that they don't need to extract by uing owner[0]
            $addFields: {
              owner: {
               $first: "$owner"
              }
            }
          }
        ]
      }
    }
  ])


  return res
            .status(200)
            .json(new ApiResponse(200, user[0].watchHistory, "watch History fetch successfully"))
           // why user[0]? because aggreation return array and we need array first value
})



export {registerUser,
       loginUser,
       logoutUser,
       accessIncomingRefreshToken,
       userUpdate,
       getCurrentPassword,
       getCurrentUser,
       updateUserAvatar,
       updateUserCoverImage,
       getUserChannelProfile,
       getWatchHistory
      }