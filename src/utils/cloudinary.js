import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_APIKEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

const uploadonCloudinay = async (fileBuffer, originalname) => {
    try {
        if (!fileBuffer) return null;
        
        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    resource_type: "auto",
                    public_id: `uploads/${Date.now()}_${originalname.split('.')[0]}`, // Optional: customize public_id
                    folder: "user_uploads" // Optional: organize in folders
                },
                (error, result) => {
                    if (error) {
                        console.log("Error from uploadonCloudinary func:", error);
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            ).end(fileBuffer);
        });
        
    } catch (error) {
        console.log("Error from the uploadonCloudinary func:", error);
        return null;
    }
}

export { uploadonCloudinay }