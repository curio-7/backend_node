import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))  //this means that i am accepting json data 
app.use(express.urlencoded({extended:true,limit:"16kb"})) //in url , space is converted into + or % thsi is done by urlencoded
app.use(express.static("public"))
app.use(cookieParser())

//router
import userRouter from './routes/user.routes.js'
//not using app.get becoz we have distributed our middlewares and routes 
app.use("/api/v1/users",userRouter)

export { app };