//reusable code
//first file willbe uploaded at server then we will upload it in cloudinary, after successfull upload, delete it from server.
//Cloudinary's Role: This is where Cloudinary comes in.
// You'll then take the file that Multer has made available and explicitly send it to Cloudinary for long-term, reliable storage.
import {v2 as cloudinary} from "cloudinary"
import fs from "fs"
import dotenv from "dotenv";
dotenv.config();
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type : "auto"
        })
        //file has been uploaded successfully
        // console.log("file is uploaded successfully", response.url);
        fs.unlinkSync(localFilePath);
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath);//remove the locally saved temp file as upload operation got failed.
    }
}

export {uploadOnCloudinary};

