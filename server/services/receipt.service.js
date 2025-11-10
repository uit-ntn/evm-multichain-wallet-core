/**
 * Receipt Service
 * Business logic cho IPFS receipts
 */

const Receipt = require('../models/receipt.model');
const fs = require("fs");
const path = require("path");
const FormData = require('form-data');
const axios = require('axios');
const { logger } = require("../adapters/logger.adapter");

/**
 * Receipt Service - Upload file lên IPFS
 */

// Kiểm tra IPFS provider từ .env
const provider = process.env.IPFS_PROVIDER || 'web3storage';

if (provider === 'web3storage') {
  const token = process.env.IPFS_API_KEY;
  if (!token) throw new Error("Missing IPFS_API_KEY for Web3.Storage");
} else if (provider === 'pinata') {
  const pinataJWT = process.env.PINATA_JWT;
  if (!pinataJWT) throw new Error("Missing PINATA_JWT for Pinata");
} else {
  throw new Error(`Unsupported IPFS provider: ${provider}`);
}

/**
 * Upload file lên IPFS
 * @param {string} filePath - đường dẫn tạm của file
 * @param {string} fileName - tên file gốc
 * @returns {Promise<{ cid: string, url: string }>}
 */
const uploadToIPFS = async (filePath, fileName) => {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    let cid, url;
    
    if (provider === 'web3storage') {
      const { Web3Storage, File } = require("web3.storage");
      const token = process.env.IPFS_API_KEY;
      const storage = new Web3Storage({ token });
      const files = [new File([fileBuffer], fileName)];
      cid = await storage.put(files);
      url = `https://ipfs.io/ipfs/${cid}/${fileName}`;
    } else if (provider === 'pinata') {
      // Upload file using Pinata API
      const formData = new FormData();
      formData.append('file', fileBuffer, fileName);
      
      const pinataMetadata = JSON.stringify({
        name: fileName,
      });
      formData.append('pinataMetadata', pinataMetadata);

      const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
        maxBodyLength: 'Infinity',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          'Authorization': `Bearer ${process.env.PINATA_JWT}`
        }
      });

      cid = response.data.IpfsHash;
      url = `https://gateway.pinata.cloud/ipfs/${cid}`;
    }
    
    logger.info("File uploaded to IPFS", { provider, cid, url });
    return { cid, url };
  } catch (error) {
    logger.error("IPFS upload error", { provider, error: error.message });
    throw error;
  } finally {
    fs.unlinkSync(filePath); // Xoá file tạm sau khi upload
  }
};

module.exports = { uploadToIPFS };
