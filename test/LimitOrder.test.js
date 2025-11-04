import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;

describe("LimitOrder", function () {
  let limitOrder;
  let owner;
  let user1;
  let user2;

  const TOKEN_IN = "0x0000000000000000000000000000000000000001";
  const TOKEN_OUT = "0x0000000000000000000000000000000000000002";

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const LimitOrder = await ethers.getContractFactory("LimitOrder");
    limitOrder = await LimitOrder.deploy();
    await limitOrder.waitForDeployment();
  });

  describe("Order Creation", function () {
    it("Should create a new order", async function () {
      const amountIn = ethers.parseEther("1");
      const minAmountOut = ethers.parseEther("2000");
      const limitPrice = ethers.parseEther("2000");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await expect(
        limitOrder.connect(user1).createOrder(
          TOKEN_IN,
          TOKEN_OUT,
          amountIn,
          minAmountOut,
          limitPrice,
          deadline
        )
      )
        .to.emit(limitOrder, "OrderCreated")
        .withArgs(1, user1.address, TOKEN_IN, TOKEN_OUT, amountIn, minAmountOut, limitPrice);

      const order = await limitOrder.getOrder(1);
      expect(order.user).to.equal(user1.address);
      expect(order.amountIn).to.equal(amountIn);
      expect(order.isFilled).to.be.false;
      expect(order.isCancelled).to.be.false;
    });

    it("Should fail with invalid token addresses", async function () {
      const amountIn = ethers.parseEther("1");
      const minAmountOut = ethers.parseEther("2000");
      const limitPrice = ethers.parseEther("2000");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await expect(
        limitOrder.connect(user1).createOrder(
          ethers.ZeroAddress,
          TOKEN_OUT,
          amountIn,
          minAmountOut,
          limitPrice,
          deadline
        )
      ).to.be.revertedWith("Invalid tokenIn");
    });
  });

  describe("Order Cancellation", function () {
    let orderId;

    beforeEach(async function () {
      const amountIn = ethers.parseEther("1");
      const minAmountOut = ethers.parseEther("2000");
      const limitPrice = ethers.parseEther("2000");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const tx = await limitOrder.connect(user1).createOrder(
        TOKEN_IN,
        TOKEN_OUT,
        amountIn,
        minAmountOut,
        limitPrice,
        deadline
      );

      await tx.wait();
      orderId = 1;
    });

    it("Should cancel an order", async function () {
      await expect(limitOrder.connect(user1).cancelOrder(orderId))
        .to.emit(limitOrder, "OrderCancelled")
        .withArgs(orderId, user1.address);

      const order = await limitOrder.getOrder(orderId);
      expect(order.isCancelled).to.be.true;
    });

    it("Should fail if not order owner", async function () {
      await expect(
        limitOrder.connect(user2).cancelOrder(orderId)
      ).to.be.revertedWith("Not order owner");
    });
  });

  describe("View Functions", function () {
    it("Should get user orders", async function () {
      const amountIn = ethers.parseEther("1");
      const minAmountOut = ethers.parseEther("2000");
      const limitPrice = ethers.parseEther("2000");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await limitOrder.connect(user1).createOrder(
        TOKEN_IN,
        TOKEN_OUT,
        amountIn,
        minAmountOut,
        limitPrice,
        deadline
      );

      await limitOrder.connect(user1).createOrder(
        TOKEN_IN,
        TOKEN_OUT,
        amountIn,
        minAmountOut,
        limitPrice,
        deadline
      );

      const userOrders = await limitOrder.getUserOrders(user1.address);
      expect(userOrders.length).to.equal(2);
      expect(userOrders[0]).to.equal(1);
      expect(userOrders[1]).to.equal(2);
    });
  });
});