// require('dotenv').config({path:'./env'})//this is bad practice
import dotenv from "dotenv"
// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";
import connectDB from "./db/index.js";
import {app} from "./app.js"

dotenv.config({
    path: './.env'
})

connectDB()//since this is a async function it means that it will return a promise so 
.then( () => {
    app.listen(process.env.PORT || 3000, ()  => {
        console.log(`Server Started at PORT: ${process.env.PORT}`);
    });
})
.catch((err) => {
    console.log("Server and DB Connection Failed!!",err);
})



// ( async () => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error", () => {
//             console.log("Error: ",error);
//             throw error
//         })
        
//         app.listen(process.env.PORT, () => {
//             console.log(`App is listening on Port ${process.env.PORT}`)
//         })

//     } catch (error) {
//         console.log("Error: ",error);
//         throw error;
//     }
// } )();

