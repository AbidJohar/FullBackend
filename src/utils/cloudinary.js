import { v2 as cloudinary } from "cloudinary";
import fs from 'fs';


cloudinary.config({ 
    cloud_name:process.env.CLOUDINARY_NAME, 
    api_key:process.env.CLOUDINARY_APIKEY, 
    api_secret:process.env.CLOUDINARY_SECRET
});

const uploadonCloudinay = async (filePath)=>{
    
   try {
     if(!filePath) return null;
       // upload file on cloudinary
   const response = await  cloudinary.uploader.upload(filePath,{
         resource_type: "auto"
     })
     // file uploaded on cloudinary successfully
       //console.log("file uploaded successfully and response is:",response);
      //console.log("file uploaded successfully and response url  is:",response.url);
      fs.unlinkSync(filePath);
     return response;
     
   } catch (error) {
    // if operation got failed, it will remove the locally save temporary file
    fs.unlinkSync(filePath);
       console.log("Error from the uploadonCloudinary func:",error);
       return null;
   }
}

export {uploadonCloudinay}