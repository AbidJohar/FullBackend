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
const registerUser = asyncHandler( async (req,res)=>{
    
    const {username, email, fullName,password}  = req.body;
      console.log("user detils", username,email,fullName, password);
      

    if(
        ["username", "email", "fullName", "password"].some(field => 
            field.trim() === ""
        )
    ){
       throw new ApiError(400, "All field name is required");
    }

    const existedUser = await User.findOne({
        $or: [{username}, {email}]
     });
     if(existedUser){
        throw new ApiError(409, "user with email and username is already exist");
     }
    // console.log("req file:",req.files);
   const avatarLocalPath  =  req.files?.avatar[0]?.path;
  //  console.log("avatarLocalpath: ",avatarLocalPath);
   
  //  const coverImageLocalPath  =  req.files?.coverImage[0]?.path;

  let coverImageLocalPath;

   if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
              coverImageLocalPath = req.files.coverImage[0].path;
   }
              
   if(!avatarLocalPath){
    throw new ApiError(400, "Avatar image is required");
}

const avatar =  await uploadonCloudinay(avatarLocalPath);
 
const coverImage =  await uploadonCloudinay(coverImageLocalPath);


console.log("cloudinay avatar file:",avatar);
if(!avatar){
      throw new ApiError(400, "Avatar image is required");
  }
  console.log("avatar last portion after cloudinary:",avatar);
  

  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email,
    avatar : avatar.url,
    coverImage: coverImage?.url || "",
    password
});
  // console.log("user after create:",user);
  
  // to exclude the -password and refreshToken from the instance of mongoDB
 const createdUser = await User.findById(user._id).select(
     "-password -refreshToken"
 );

 if(!createdUser){
    throw new ApiError(500, "something went wrong while registering user");
 }

  return res.status(200).json(
    new ApiResponse(201,createdUser, "user created successfully")
  );
               
})

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

const updateUserAvatar = asyncHandler(async (req,res)=>{
  
  const  localAvatarPath = req.file?.path;
  if(!localAvatarPath){
    throw new ApiError(400, "avatar image is missing");
  }

  const  avatar =   await uploadonCloudinay(localAvatarPath);
  if(!avatar.url){
    throw new ApiError(401,"Error in cloudinary while uploading avatar")
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {
      $set:{
        avatar: avatar.url
      }
    },
    {
     new: true
    }
  ).select("-password");

  return res
 .status(200)
 .json(new ApiResponse(200, user, "avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req,res)=>{
  
  const  localCoverImagePath = req.file?.path;
  if(!localCoverImagePath){
    throw new ApiError(400, "avatar image is missing");
  }

  const  coverImage =   await uploadonCloudinay(localCoverImagePath);
  if(!coverImage.url){
    throw new ApiError(401,"Error in cloudinary while uploading coverImage")
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {
      $set:{
        avatar: coverImage.url
      }
    },
    {
     new: true
    }
  ).select("-password");

  return res
 .status(200)
 .json(new ApiResponse(200, user, "coverImage updated successfully"));
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