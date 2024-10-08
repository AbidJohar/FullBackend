//required("dotenv").config({path: './.env'});

import dotenv from 'dotenv'
import connectDB from './config/db.js';
import { app } from './app.js';
dotenv.config({
    path: './.env'
});
 
const port = process.env.PORT || 3000;

// mongoDb and server port connection setup
connectDB()
.then(()=>{
    app.listen(port, ()=>{
        console.log(`server is running on port ${port}`);
        
    })
})
.catch((error)=>{
      console.log("MongoDB connection failed ", error);
})
