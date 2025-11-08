const supabase = require('./supabaseClient');

async function uploadFileToBucket(bucket, path, fileBuffer, contentType) {
    const { error } = await supabase.storage
        .from(bucket)
        .upload(path, fileBuffer, {
            contentType,
            upsert: true,
        });

    if (error) {
        throw new Error(`Upload error: ${error.message}`);
    }
}

async function getPublicUrl(bucket, path) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
}

module.exports = {
    uploadFileToBucket,
    getPublicUrl,
};
