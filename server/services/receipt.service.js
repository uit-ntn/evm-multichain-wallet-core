/**
 * Receipt Service
 * Business logic cho IPFS receipts (Pinata version)
 */

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const { logger } = require("../adapters/logger.adapter");

const pinataJWT = process.env.PINATA_JWT;
if (!pinataJWT) throw new Error("Missing PINATA_JWT in environment");

/**
 * Upload file (PDF/JSON) lên IPFS thông qua Pinata
 */
const uploadToIPFS = async (filePath, fileName) => {
  try {
    const data = new FormData();
    data.append("file", fs.createReadStream(filePath));

    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      data,
      {
        maxBodyLength: Infinity,
        headers: {
          Authorization: `Bearer ${pinataJWT}`,
          ...data.getHeaders(),
        },
      }
    );

    const cid = res.data.IpfsHash;
    const url = `https://gateway.pinata.cloud/ipfs/${cid}`;

    logger.info("✅ File uploaded to IPFS via Pinata", { cid, url });
    return { cid, url };
  } catch (error) {
    logger.error("❌ IPFS upload error (Pinata)", { error: error.message });
    throw error;
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
};

/**
 * Sinh file PDF biên lai giao dịch
 */
const generateReceiptPDF = async (txHash, owner, meta) => {
  const tmpDir = path.join(__dirname, "../../uploads");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const pdfPath = path.join(tmpDir, `receipt_${txHash}.pdf`);
  const doc = new PDFDocument();
  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);

  doc.fontSize(20).text("Transaction Receipt", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(`Tx Hash: ${txHash}`);
  doc.text(`Owner: ${owner}`);
  doc.text(`Date: ${new Date().toLocaleString()}`);
  doc.moveDown();
  doc.text("Metadata:");
  doc.text(JSON.stringify(meta, null, 2));
  doc.end();

  await new Promise((resolve) => writeStream.on("finish", resolve));
  return pdfPath;
};

/**
 * Sinh file JSON metadata
 */
const generateMetadataJSON = async (txHash, meta) => {
  const tmpDir = path.join(__dirname, "../../uploads");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const jsonPath = path.join(tmpDir, `metadata_${txHash}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(meta, null, 2));
  return jsonPath;
};

/**
 * Sinh PDF + JSON → upload lên IPFS + lưu vào DB
 */
const generateAndUploadReceipt = async ({ txHash, owner, meta }) => {
  // Tạo record ban đầu (status = UPLOADING)
  const receipt = await Receipt.create({
    txHash,
    owner,
    fileName: `receipt_${txHash}.pdf`,
    cid: "pending",
    fileSize: 0,
    mimeType: "application/pdf",
    status: "UPLOADING",
    metadata: meta,
  });

  // Sinh file
  const pdfPath = await generateReceiptPDF(txHash, owner, meta);
  const jsonPath = await generateMetadataJSON(txHash, meta);

  // Upload Pinata
  const pdfUpload = await uploadToPinata(pdfPath);
  const jsonUpload = await uploadToPinata(jsonPath);

  // Cập nhật DB
  receipt.cid = pdfUpload.cid;
  receipt.status = "PINNED";
  receipt.fileSize = fs.statSync(jsonPath).size;
  await receipt.save();

  logger.info("Receipt pinned successfully", { cid: receipt.cid });

  return {
    cid: pdfUpload.cid,
    files: ["receipt.pdf", "receipt.json"],
    urls: [pdfUpload.url, jsonUpload.url],
  };
};

module.exports = { uploadToIPFS, generateAndUploadReceipt };
