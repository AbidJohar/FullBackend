import multer from "multer";
import {v4 as uuidv4} from 'uuid';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("Destination called for file:", file.originalname);
    cb(null, './public/temp');
  },
  filename: function (req, file, cb) {
    const uniqeID = uuidv4();
    const extension = file.originalname.split(".").pop(); // get the file extension;
    cb(null, `${uniqeID}.${extension}`);
  }
});
export const upload = multer({ storage, })