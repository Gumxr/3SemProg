const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

async function uploadFileToCloudinary(fileBuffer, fileName) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'raw', 
                public_id: `chat_files/${Date.now()}_${fileName}`,
            },
            (error, result) => {
                if (error) {
                    console.error('Error uploading to Cloudinary:', error.message);
                    reject(error);
                } else {
                    resolve(result.secure_url);
                }
            }
        );
        stream.end(fileBuffer);
    });
}

module.exports = { uploadFileToCloudinary };
