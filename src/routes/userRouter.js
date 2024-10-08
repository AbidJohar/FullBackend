import express from 'express'
import { accessIncomingRefreshToken, getCurrentPassword, getCurrentUser, getUserChannelProfile, getWatchHistory, loginUser, logoutUser, registerUser, updateUserAvatar, updateUserCoverImage, userUpdate } from '../controllers/userController.js';
import { upload } from '../middlewares/multerMiddleware.js';
import { verifyJWT } from '../middlewares/authMiddleware.js';
 


const userRouter = express.Router();

userRouter.route("/register").post(
     upload.fields([
         {
            name :"avatar",
            maxCount : 1
         },
         {
            name :"coverImage",
            maxCount : 1
         }
     ])
    ,registerUser);

userRouter.route("/login").post(loginUser);

userRouter.route("/logout").post(verifyJWT, logoutUser);

userRouter.route("/refresh-Token").post(accessIncomingRefreshToken);

userRouter.route("/get-User").post(verifyJWT, getCurrentUser);

userRouter.route("/refresh-Token").post(accessIncomingRefreshToken);

userRouter.route("/change-password").post(verifyJWT, getCurrentPassword);

userRouter.route("/current-user").get(verifyJWT, getCurrentUser);

userRouter.route("/update-account").get(verifyJWT, userUpdate);

userRouter.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

userRouter.route("/update-coverImage").patch(verifyJWT,upload.single("coverImage"), updateUserCoverImage);

userRouter.route("/c/:username").get(verifyJWT, getUserChannelProfile);

userRouter.route("/watch-history").get(verifyJWT, getWatchHistory);
export default userRouter;