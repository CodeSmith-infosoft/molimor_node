import model from '../model/aboutModel.js';
const { aboutUsModel } = model;
import response from "../utils/response.js";
import constants from '../utils/constants.js';
const { resStatusCode, resMessage } = constants;

export async function addAbout(req, res) {
  const { p1, p2, url, p3, p4, box1T, box1D, box2T, box2D, box3T, box3D, boxFtr, p5, p6, p7, p8 } = req.body;
  const img = req.uploadedImages.find(file => file.field === 'img');
  const box1Img = req.uploadedImages.find(file => file.field === 'box1Img');
  const box2Img = req.uploadedImages.find(file => file.field === 'box2Img');
  const box3Img = req.uploadedImages.find(file => file.field === 'box3Img');

  try {
    let existing = await aboutUsModel.findOne();
    let aboutus;

    if (!existing) {
      aboutus = await aboutUsModel.create({
        p1, p2, img: img?.s3Url,
        url, p3, p4, box1Img: box1Img?.s3Url,
        box1T, box1D, box2Img: box2Img?.s3Url,
        box2T, box2D, box3Img: box3Img?.s3Url,
        box3T, box3D, boxFtr, p5, p6, p7, p8
      });
      return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.ABOUT_US_CREATED, aboutus);
    } else {
      aboutus = await aboutUsModel.findOneAndUpdate({}, {
        p1, p2, img: img?.s3Url,
        url, p3, p4, box1Img: box1Img?.s3Url,
        box1T, box1D, box2Img: box2Img?.s3Url,
        box2T, box2D, box3Img: box3Img?.s3Url,
        box3T, box3D, boxFtr, p5, p6, p7, p8
      }, { new: true });
      return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.ABOUT_US_UPDATED, aboutus);
    };
  } catch (error) {
    return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, error);
  };
};

export async function getAbout(req, res) {
  try {
    const aboutData = await aboutUsModel.findOne();
    return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.ABOUT_US_RETRIEVED, aboutData);
  } catch (error) {
    return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
  };
};

