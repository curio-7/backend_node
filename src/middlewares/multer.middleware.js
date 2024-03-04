import multer from "multer"

//Multer adds a body object and a file or files object to the request object. 
//Multer is a middleware
//Multer's Role: Multer's primary job is to handle the incoming multipart/form-data (which usually contains your uploaded file). 
//It parses the data and makes it temporarily available within your backend code (often storing it in memory or on the server's filesystem).

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null,"./public/temp")
    },
    filename: function (req, file, cb) {
      //const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.originalname)
    }
})
  
export const upload = multer({ storage })