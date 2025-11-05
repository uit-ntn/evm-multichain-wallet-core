const { ethers } = require("ethers");

function formatResponse(success, data, message = null) {
  const response = { success };
  if (success) response.data = data;
  else response.error = data;
  if (message) response.message = message;
  return response;
}

async function verifyEIP712Signature(typedData, signature) {
  try {
    const { domain, types, message } = typedData;
    const recovered = ethers.utils.verifyTypedData(domain, types, message, signature);
    return recovered.toLowerCase();
  } catch (err) {
    console.error("Signature verification failed:", err.message);
    return null;
  }
}

module.exports = { formatResponse, verifyEIP712Signature };
