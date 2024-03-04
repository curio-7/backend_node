import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js"
import {uploadOnCloudinary,deleteFromCloudinary} from "../utils/cloudinary.js"
import jwt from "jsonwebtoken"


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating access and refresh token")
    }
}

const registerUser = asyncHandler( async (req,res) => {
    // res.status(200).json({
    //     message: "ok"
    // })

    //LOGIC:
    //get user details from frontend
    //validation - entry empty ??
    //check if user already exit : username, email
    //check for files: images,avatar
    //upload them to cloudinary
    //create user object - create entry in db
    //remove password and refresh token from response 
    //check for user creation, return res

    const { fullname,email,username,password } = req.body //data frontend se idhr aa rha
   // console.log("email:" ,email);

    // if(fullname === ""){
    //     throw new ApiError(400,"fullname is required")
    // }
    //we can do this by checking each if or we can do this in another manner

    if(
        [fullname, email, password, username].some((field) => 
            field?.trim() === "")
    ){
        throw new ApiError(400, "All Fields are required");
    }

    const existedUser = await User.findOne({
        //$or : [{},{}] : we use this to check for multiple values together
        $or : [{username},{email}]
    })

    if(existedUser){
        throw new ApiError(400,"User Already Existed,Change your Username or email");
    }

    //  REQ.FILES IS PROVIDED BY MULTER
    const avatarLocalPath = req.files?.avatar[0]?.path //this is where multer stored our files in server

    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar Is Required!")
    }

    //Upload them to Cloudinary

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);


    if(!avatar){
        throw new ApiError(400,"Avatar Is Required!")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })

    const userCreated = await User.findById(user._id).select(
        "-password -refreshToken" //these things will not be there
    )

    if(!userCreated){
        throw new ApiError(500, "Something Went Wrong while created User")
    }

    return res.status(201).json(
        new ApiResponse(200,userCreated,"User Created SuccessFully!!")
    )


})

const loginUser = asyncHandler( async (req,res) => {
    //LOGIC:
    //req.body -> data
    //username or email
    //find user
    //password check
    //acess and refresh token
    //send cookie

    const {email,password,username,avatar} = req.body

    if (!(username || email)) {
        throw new ApiError(400,"username or email is required!!")
    }

    const user = await User.findOne({
        $or : [{username},{email}]
    })

    if(!user){
        throw new ApiError(400,"User does not exist!")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid User Password!")
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    //Cookies
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            "User Logged In Successfully!!"
        )
    )

})

const logoutUser = asyncHandler( async (req,res) => {
    //ab yha pr hamare pass req.user ka access hai kyuki wo ham middleware se bhej rhe h
    await User.findByIdAndUpdate(
        req.user._id,
        {
            //$set: {} : it is used to update fields in db
            $set: {
                refreshToken: undefined
            }
        },{
            new : true
        }
    )

    //Cookies
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200,"User Logged Out!")
    )

})

const refreshAccessToken = asyncHandler( async (req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized Event")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401,"Invalid Refresh Token!")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refersh Token is expired or used!")
        }
    
        const options = {
            httpOnly :true,
            secure: true
        }
    
        const {accessToken,newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken, refreshToken: newRefreshToken
                },
                "Access Token Refreshed!!"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid Access Token")
    }

})

const changeCurrentPassword = asyncHandler( async (req,res) => {
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(401,"Wrong Password!")
    }

    user.password = newPassword;
    await user.save({validateBeforeSave:false})

    return res.status(200)
    .json(
        new ApiResponse(200,"Password Changed Successfully!")
    )

})

const getCurrentUser = asyncHandler( async (req,res)=>{
    return res.status(200)
    .json(
        new ApiResponse(200,req.user,"Current User Fetched Successfully!")
    )
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullname, email} = req.body

    if (!fullname || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname, //we can write here in both mentioned ways 
                email: email
            }
        },
        {new: true} //isse update hone ke baad wali info return hoti h 
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
});

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path //req.file hame multer ke middleware se mila

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO: delete old image 
    //get the path of image that is uploaded from db and take out public id from it 
    //then delete them
    const {avatar} = req.body
    console.log(typeof avatar)
    const getPublicId = (path) => {
        if (typeof path === 'object') {
            path = path.imagePath;
        }
        return path?.split("/").pop().split(".")[0];
      };
    const publicID = getPublicId(avatar);
    console.log(publicID)
    await deleteFromCloudinary(publicID);

    const avatarUpdate = await uploadOnCloudinary(avatarLocalPath)

    if (!avatarUpdate.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatarUpdate.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})

//same as above
const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image - assignment


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
};
