import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';


const app = express();
// setup the cors to avoid the cors error
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}));

// default limit is 100kb
app.use(express.json({
    limit:"40kb"
}));
app.use(express.urlencoded({
    extended: true,
}));
app.use(express.static("public"));
app.use(cookieParser());
// routes import
import userRouter from './routes/userRouter.js';

app.use("/api/v1/users", userRouter);
 





export {app};