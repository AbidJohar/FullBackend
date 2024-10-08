import mongoose from "mongoose";

async function connectDB(){
    try {
      // Connect to MongoDB
      await mongoose.connect(`${process.env.MONGODB_URI}/youtubeClone`);

    // Get connection details
    const db = mongoose.connection;
    

    // Log success message with connection details
    console.log(`MongoDB connected!`);
    console.log(`DB Host: ${db.host}`);
    console.log(`DB Port: ${db.port}`);
    console.log(`DB Name: ${db.name}`);
          
    } catch (error) {
         console.log("MONGODB connection Error", error);
         
    }

}
export default connectDB;