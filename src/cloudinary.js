const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

async function uploadVideo(filePath, publicId) {
    try {
        const crypto = require('crypto');
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = crypto.createHash('sha1')
            .update(`public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`)
            .digest('hex');

        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));
        form.append('api_key', API_KEY);
        form.append('timestamp', timestamp);
        form.append('signature', signature);
        form.append('public_id', publicId);
        form.append('resource_type', 'video');
        form.append('folder', 'tiguy-bot');

        const response = await axios.post(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
            form,
            { headers: form.getHeaders(), timeout: 120000 }
        );

        console.log(`[CLOUDINARY] Video uploadee: ${response.data.secure_url}`);
        return response.data.secure_url;
    } catch (error) {
        console.error('[CLOUDINARY] Erreur upload:', error.response?.data || error.message);
        throw error;
    }
}

async function uploadAudio(filePath, publicId) {
    try {
        const crypto = require('crypto');
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = crypto.createHash('sha1')
            .update(`public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`)
            .digest('hex');

        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));
        form.append('api_key', API_KEY);
        form.append('timestamp', timestamp);
        form.append('signature', signature);
        form.append('public_id', publicId);
        form.append('resource_type', 'video');
        form.append('folder', 'tiguy-bot/audio');

        const response = await axios.post(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
            form,
            { headers: form.getHeaders(), timeout: 60000 }
        );

        return response.data.secure_url;
    } catch (error) {
        console.error('[CLOUDINARY] Erreur upload audio:', error.message);
        throw error;
    }
}

module.exports = { uploadVideo, uploadAudio };
