"use strict";

const AWS = require("aws-sdk");
const sharp = require("sharp");

// Initialize the S3 client with the another aws account
const s3 = new AWS.S3({
  accessKeyId: process.env.RGS_ACCESS_KEY_ID,
  secretAccessKey: process.env.RGS_SECRET_ACCESS_KEY,
});

module.exports.imageHandler = async (event) => {
  try {
    const bucket = process.env.BUCKET_NAME;
    const imageId = event.pathParameters.proxy;;
    const queryParams = event.queryStringParameters || {};

    const originalImage = await s3
      .getObject({
        Bucket: bucket,
        Key: imageId,
      })
      .promise();

    const width = parseInt(queryParams.width) || null;
    const height = parseInt(queryParams.height) || null;
    const format = queryParams.format || "jpeg";
    const quality = parseInt(queryParams.quality) || 80;

    let imageProcessor = sharp(originalImage.Body);

    if (width || height) {
      imageProcessor = imageProcessor.resize(width, height, {
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      });
    }

    if (["jpeg", "png", "webp", "tiff", "gif"].includes(format)) {
      imageProcessor = imageProcessor.toFormat(format, { quality });
    } else {
      throw new Error("Unsupported image format");
    }

    const transformedImageBuffer = await imageProcessor.toBuffer();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": `image/${format}`,
        "Content-Disposition": `inline; filename="${imageId}.${format}"`,
      },
      body: transformedImageBuffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error("Error processing image:", error.message);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to process the image.",
        error: error.message,
      }),
    };
  }
};
