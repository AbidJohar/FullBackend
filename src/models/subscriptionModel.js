import mongoose, { Schema } from "mongoose";


const subscriptionSchema = new mongoose.Schema({

    subscriber: {
        type : Schema.Types.ObjectId,  // one who is subscribing
        ref : "user"
    },
    channel :{
        type: Schema.Types.ObjectId,  // one to whom "subsciber" is subscribing
        ref: "User"
    }
},{timestamps: true});

 export const subscription = mongoose.model("Subscription", subscriptionSchema );
 