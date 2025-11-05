/**
 * Receipt Service
 * Business logic cho IPFS receipts
 */

const Receipt = require('../models/receipt.model');
const { Web3Storage, File } = require("web3.storage");
const fs = require("fs");
const path = require("path");
const { logger } = require("../adapters/logger.adapter");

/**
 * Receipt Service - Upload file lên IPFS
 */

// Lấy key từ .env (đặt IPFS_API_KEY=<web3.storage token>)
const token = process.env.IPFS_API_KEY;
if (!token) throw new Error("Missing IPFS_API_KEY in environment");

const storage = new Web3Storage({ token });

/**
 * Upload file lên IPFS
 * @param {string} filePath - đường dẫn tạm của file
 * @param {string} fileName - tên file gốc
 * @returns {Promise<{ cid: string, url: string }>}
 */
const uploadToIPFS = async (filePath, fileName) => {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const files = [new File([fileBuffer], fileName)];
    const cid = await storage.put(files);
    const url = `https://ipfs.io/ipfs/${cid}/${fileName}`;
    logger.info("File uploaded to IPFS", { cid, url });
    return { cid, url };
  } catch (error) {
    logger.error("IPFS upload error", { error: error.message });
    throw error;
  } finally {
    fs.unlinkSync(filePath); // Xoá file tạm sau khi upload
  }
};

module.exports = { uploadToIPFS };
