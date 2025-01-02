const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types'); // Using mime-types
const { BlobServiceClient } = require('@azure/storage-blob');
const Redis = require('ioredis')

const publisher = new Redis('redis://default:b1X8bwMf08gUhhe7zh2MpxsEPEjIO0uo@redis-13839.crce179.ap-south-1-1.ec2.redns.redis-cloud.com:13839')



// Azure Blob Storage connection string
const AZURE_STORAGE_CONNECTION_STRING =
    "DefaultEndpointsProtocol=https;AccountName=vercelclone;AccountKey=FiINltkleR6aMBo7zBbDwJM2xYPEef45+qR9z9RM0gF/Ktn9aIR37skDHkJb9uprFZmilGbivr57+AStrfuW3A==;EndpointSuffix=core.windows.net";
const containerName = "static-sites";

// Retrieve projectId from the environment variable
const projectId = process.env.PROJECT_ID;
if (!projectId) {
    console.error("Error: PROJECT_ID environment variable is not set.");
    process.exit(1);
}

function publishLog(log) {
    publisher.publish(`logs:${projectId}`, JSON.stringify({ log }))
}


// Recursively upload all files from a directory to Azure Blob Storage
async function uploadDirectoryToBlob(distFolderPath, containerClient, basePath = '') {
    const entries = fs.readdirSync(distFolderPath, { withFileTypes: true });

    for (const entry of entries) {
        const entryPath = path.join(distFolderPath, entry.name);
        const blobName = path.posix.join("__outputs", projectId, basePath, entry.name); // Always use `/` for Azure Blob Storage paths

        if (entry.isDirectory()) {
            // Recursively process subdirectories
            await uploadDirectoryToBlob(entryPath, containerClient, path.posix.join(basePath, entry.name));
        } else if (entry.isFile()) {
            const data = fs.readFileSync(entryPath);

            // Determine the MIME type
            const contentType = mime.lookup(entry.name) || 'application/octet-stream';

            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            console.log(`Uploading "${blobName}"...`);
            publishLog(`uploading ${blobName}`)
            

            await blockBlobClient.uploadData(data, {
                blobHTTPHeaders: { blobContentType: contentType }, // Set the correct content type
            });

            console.log(`Uploaded: ${blobName}`);
            publishLog(`uploaded ${blobName}`)
        }
    }
}

async function init() {
    console.log("Executing script.js");
    publishLog('Build Started...')
    const outDirPath = path.join(__dirname, 'output');

    // Build the project
    console.log(`Building project in ${outDirPath}`);
    publishLog(`Building project in ${outDirPath}`)
    const p = exec(`cd ${outDirPath} && npm install && npm run build`);
    publishLog(`run npm install && npm run build`)

    p.stdout.on('data', function (data) {
        console.log(data.toString());
        publishLog(data.toString())
    });

    p.stderr.on('data', function (data) {
        console.error(data.toString());
        publishLog(`error: ${data.toString()}`)
    });

    p.on('close', async function () {
        console.log('Build completed...');
        publishLog(`Build Complete`)
        const distFolderPath = path.join(__dirname, 'output', 'dist');

        try {
            const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
            const containerClient = blobServiceClient.getContainerClient(containerName);


            // Upload all files and subdirectories
            await uploadDirectoryToBlob(distFolderPath, containerClient);

            console.log('All files uploaded successfully.');
            publishLog(`All files uploaded successfully`)
        } catch (err) {
            console.error("Error during file upload:", err);
            publishLog(`Error during file upload: ${err}`)
        }

        console.log('Done...');
        publishLog(`Done...`)
    });
}

init().catch(console.error);
