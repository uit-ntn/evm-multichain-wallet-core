import { ethers } from "ethers";

const wallet = new ethers.Wallet(
  "1762b83287a288fa794da5e9a1cda9755253cac78aa6671a857da2e409e3e8c3"
);
console.log("Wallet:", await wallet.getAddress());

const domain = {
  name: "LimitOrder",
  version: "1",
  chainId: 11155111,
  verifyingContract: "0x02f5d533E0a3fEF9995b285b0bd2AFF6deeb721d",
};

const types = {
  Order: [
    { name: "tokenIn", type: "address" },
    { name: "tokenOut", type: "address" },
    { name: "amountIn", type: "uint256" },
    { name: "targetPrice", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

// deadline = hiện tại + 1h
const deadline = Math.floor(Date.now() / 1000) + 3600;

const message = {
  tokenIn: "0x0000000000000000000000000000000000000001",
  tokenOut: "0x0000000000000000000000000000000000000002",
  amountIn: "1000000000000000000",
  targetPrice: "2000000000000000000000",
  deadline,
};

console.log("Message:", message);

const signature = await wallet.signTypedData(domain, types, message);
console.log("Signature:", signature);
