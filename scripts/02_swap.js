// scripts/02_swap.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

let solc;
try {
  solc = require("solc");
} catch (e) {
  console.error("❌ Missing dependency: solc");
  console.error("=> Run: npm i -D solc@0.8.20");
  process.exit(1);
}

/* =======================
   Helpers: deployments
======================= */
function deploymentsPath(network) {
  return path.join(__dirname, "..", "deployments", `${network}.json`);
}
function loadDeployments(network) {
  const p = deploymentsPath(network);
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function saveDeployments(network, data) {
  const p = deploymentsPath(network);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

/* =======================
   Helper: registry upsert
======================= */
async function upsert(registry, name, addr) {
  const cur = await registry.contractOf(name);
  const zero = hre.ethers.constants.AddressZero;

  if (cur && cur !== zero) {
    if (cur.toLowerCase() === addr.toLowerCase()) {
      console.log(`ℹ️ Registry keep ${name}: ${addr}`);
      return;
    }
    await (await registry.updateContract(name, addr)).wait();
    console.log(`✅ Registry updated ${name}: ${addr}`);
  } else {
    await (await registry.registerContract(name, addr)).wait();
    console.log(`✅ Registry registered ${name}: ${addr}`);
  }
}

/* =======================
   Compile in-script UniswapV2 Mock (0.8.x)
   - FIX Stack too deep: viaIR: true + optimizer
======================= */
function compileMockUniswap() {
  const source = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Like {
  function balanceOf(address) external view returns (uint256);
  function transfer(address,uint256) external returns (bool);
  function transferFrom(address,address,uint256) external returns (bool);
}

/* ============ Minimal ERC20 ============ */
contract ERC20 {
  string public name;
  string public symbol;
  uint8 public immutable decimals = 18;
  uint256 public totalSupply;

  mapping(address => uint256) public balanceOf;
  mapping(address => mapping(address => uint256)) public allowance;

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);

  constructor(string memory n, string memory s) { name = n; symbol = s; }

  function approve(address spender, uint256 value) external returns (bool) {
    allowance[msg.sender][spender] = value;
    emit Approval(msg.sender, spender, value);
    return true;
  }

  function transfer(address to, uint256 value) external returns (bool) {
    _transfer(msg.sender, to, value);
    return true;
  }

  function transferFrom(address from, address to, uint256 value) external returns (bool) {
    uint256 a = allowance[from][msg.sender];
    require(a >= value, "ERC20: allowance");
    if (a != type(uint256).max) {
      allowance[from][msg.sender] = a - value;
      emit Approval(from, msg.sender, allowance[from][msg.sender]);
    }
    _transfer(from, to, value);
    return true;
  }

  function _transfer(address from, address to, uint256 value) internal {
    require(to != address(0), "ERC20: to=0");
    uint256 b = balanceOf[from];
    require(b >= value, "ERC20: balance");
    balanceOf[from] = b - value;
    balanceOf[to] += value;
    emit Transfer(from, to, value);
  }

  function _mint(address to, uint256 value) internal {
    totalSupply += value;
    balanceOf[to] += value;
    emit Transfer(address(0), to, value);
  }

  function _burn(address from, uint256 value) internal {
    uint256 b = balanceOf[from];
    require(b >= value, "ERC20: burn");
    balanceOf[from] = b - value;
    totalSupply -= value;
    emit Transfer(from, address(0), value);
  }
}

/* ============ WETH Mock ============ */
contract WETH9Mock is ERC20("Wrapped Ether", "WETH") {
  event Deposit(address indexed dst, uint256 wad);
  event Withdrawal(address indexed src, uint256 wad);

  receive() external payable { deposit(); }

  function deposit() public payable {
    require(msg.value > 0, "WETH: value=0");
    _mint(msg.sender, msg.value);
    emit Deposit(msg.sender, msg.value);
  }

  function withdraw(uint256 wad) external {
    _burn(msg.sender, wad);
    (bool ok,) = msg.sender.call{value: wad}("");
    require(ok, "WETH: withdraw failed");
    emit Withdrawal(msg.sender, wad);
  }
}

/* ============ Pair Mock ============ */
contract UniswapV2PairMock {
  address public token0;
  address public token1;
  uint112 private reserve0;
  uint112 private reserve1;

  function initialize(address _token0, address _token1) external {
    require(token0 == address(0) && token1 == address(0), "PAIR: inited");
    token0 = _token0;
    token1 = _token1;
  }

  function getReserves() external view returns (uint112, uint112, uint32) {
    return (reserve0, reserve1, uint32(block.timestamp));
  }

  function _update(uint256 bal0, uint256 bal1) internal {
    require(bal0 <= type(uint112).max && bal1 <= type(uint112).max, "PAIR: overflow");
    reserve0 = uint112(bal0);
    reserve1 = uint112(bal1);
  }

  function mint() external {
    uint256 bal0 = IERC20Like(token0).balanceOf(address(this));
    uint256 bal1 = IERC20Like(token1).balanceOf(address(this));
    _update(bal0, bal1);
  }

  function swap(uint256 amount0Out, uint256 amount1Out, address to) external {
    require(to != address(0), "PAIR: to=0");
    require(amount0Out > 0 || amount1Out > 0, "PAIR: out=0");

    (uint112 _r0, uint112 _r1,) = this.getReserves();
    require(amount0Out < _r0 && amount1Out < _r1, "PAIR: liq");

    if (amount0Out > 0) require(IERC20Like(token0).transfer(to, amount0Out), "PAIR: t0");
    if (amount1Out > 0) require(IERC20Like(token1).transfer(to, amount1Out), "PAIR: t1");

    uint256 bal0 = IERC20Like(token0).balanceOf(address(this));
    uint256 bal1 = IERC20Like(token1).balanceOf(address(this));
    _update(bal0, bal1);
  }
}

/* ============ Factory Mock ============ */
contract UniswapV2FactoryMock {
  mapping(address => mapping(address => address)) public getPair;
  address[] public allPairs;
  address public feeToSetter;

  event PairCreated(address indexed token0, address indexed token1, address pair);

  constructor(address _feeToSetter) { feeToSetter = _feeToSetter; }

  function allPairsLength() external view returns (uint256) { return allPairs.length; }

  function createPair(address tokenA, address tokenB) external returns (address pair) {
    require(tokenA != tokenB, "FACTORY: identical");
    (address t0, address t1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    require(t0 != address(0), "FACTORY: zero");
    require(getPair[t0][t1] == address(0), "FACTORY: exists");

    UniswapV2PairMock p = new UniswapV2PairMock();
    p.initialize(t0, t1);
    pair = address(p);

    getPair[t0][t1] = pair;
    getPair[t1][t0] = pair;
    allPairs.push(pair);

    emit PairCreated(t0, t1, pair);
  }
}

/* ============ Router Mock (UniswapV2Router02-like subset) ============ */
contract UniswapV2Router02Mock {
  address public immutable factory;
  address public immutable WETH;

  constructor(address _factory, address _weth) {
    require(_factory != address(0) && _weth != address(0), "ROUTER: zero");
    factory = _factory;
    WETH = _weth;
  }

  function _pairFor(address a, address b) internal view returns (address) {
    return UniswapV2FactoryMock(factory).getPair(a, b);
  }

  function _ensurePair(address a, address b) internal returns (address pair) {
    pair = _pairFor(a, b);
    if (pair == address(0)) {
      pair = UniswapV2FactoryMock(factory).createPair(a, b);
    }
  }

  function _getReserves(address a, address b) internal view returns (uint256 ra, uint256 rb) {
    address pair = _pairFor(a, b);
    require(pair != address(0), "ROUTER: no pair");
    (uint112 r0, uint112 r1,) = UniswapV2PairMock(pair).getReserves();
    if (a < b) { ra = uint256(r0); rb = uint256(r1); }
    else { ra = uint256(r1); rb = uint256(r0); }
  }

  function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256) {
    require(amountIn > 0, "ROUTER: in=0");
    require(reserveIn > 0 && reserveOut > 0, "ROUTER: liq=0");
    uint256 amountInWithFee = amountIn * 997;
    return (amountInWithFee * reserveOut) / (reserveIn * 1000 + amountInWithFee);
  }

  function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256) {
    require(amountOut > 0, "ROUTER: out=0");
    require(reserveIn > 0 && reserveOut > 0, "ROUTER: liq=0");
    require(amountOut < reserveOut, "ROUTER: liq");
    uint256 numerator = reserveIn * amountOut * 1000;
    uint256 denominator = (reserveOut - amountOut) * 997;
    return numerator / denominator + 1;
  }

  function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts) {
    require(path.length >= 2, "ROUTER: path");
    amounts = new uint256[](path.length);
    amounts[0] = amountIn;
    for (uint256 i = 0; i < path.length - 1; i++) {
      (uint256 rIn, uint256 rOut) = _getReserves(path[i], path[i+1]);
      amounts[i+1] = getAmountOut(amounts[i], rIn, rOut);
    }
  }

  function getAmountsIn(uint256 amountOut, address[] calldata path) external view returns (uint256[] memory amounts) {
    require(path.length >= 2, "ROUTER: path");
    amounts = new uint256[](path.length);
    amounts[amounts.length - 1] = amountOut;
    for (uint256 i = path.length - 1; i > 0; i--) {
      (uint256 rIn, uint256 rOut) = _getReserves(path[i-1], path[i]);
      amounts[i-1] = getAmountIn(amounts[i], rIn, rOut);
    }
  }

  function addLiquidity(
    address tokenA,
    address tokenB,
    uint256 amountADesired,
    uint256 amountBDesired,
    address to,
    uint256 deadline
  ) external returns (uint256 amountA, uint256 amountB) {
    require(to != address(0), "ROUTER: to=0");
    require(block.timestamp <= deadline, "ROUTER: deadline");

    address pair = _ensurePair(tokenA, tokenB);

    require(IERC20Like(tokenA).transferFrom(msg.sender, pair, amountADesired), "ROUTER: tA");
    require(IERC20Like(tokenB).transferFrom(msg.sender, pair, amountBDesired), "ROUTER: tB");

    UniswapV2PairMock(pair).mint();
    amountA = amountADesired;
    amountB = amountBDesired;
  }

  function swapExactTokensForTokens(
    uint256 amountIn,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external returns (uint256[] memory amounts) {
    require(block.timestamp <= deadline, "ROUTER: deadline");
    require(path.length >= 2, "ROUTER: path");
    require(to != address(0), "ROUTER: to=0");

    amounts = new uint256[](path.length);
    amounts[0] = amountIn;
    for (uint256 i = 0; i < path.length - 1; i++) {
      (uint256 rIn, uint256 rOut) = _getReserves(path[i], path[i+1]);
      amounts[i+1] = getAmountOut(amounts[i], rIn, rOut);
    }
    require(amounts[amounts.length - 1] >= amountOutMin, "ROUTER: slippage");

    address firstPair = _pairFor(path[0], path[1]);
    require(firstPair != address(0), "ROUTER: no pair");
    require(IERC20Like(path[0]).transferFrom(msg.sender, firstPair, amounts[0]), "ROUTER: in transfer");

    for (uint256 i = 0; i < path.length - 1; i++) {
      address inTok = path[i];
      address outTok = path[i+1];
      address pair = _pairFor(inTok, outTok);
      require(pair != address(0), "ROUTER: no pair");

      (address t0, ) = inTok < outTok ? (inTok, outTok) : (outTok, inTok);
      uint256 amountOut = amounts[i+1];

      uint256 amount0Out = outTok == t0 ? amountOut : 0;
      uint256 amount1Out = outTok == t0 ? 0 : amountOut;

      address nextTo = (i < path.length - 2) ? _pairFor(outTok, path[i+2]) : to;
      UniswapV2PairMock(pair).swap(amount0Out, amount1Out, nextTo);
    }
  }

  function swapTokensForExactTokens(
    uint256 amountOut,
    uint256 amountInMax,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external returns (uint256[] memory amounts) {
    require(block.timestamp <= deadline, "ROUTER: deadline");
    require(path.length >= 2, "ROUTER: path");
    require(to != address(0), "ROUTER: to=0");

    amounts = new uint256[](path.length);
    amounts[amounts.length - 1] = amountOut;
    for (uint256 i = path.length - 1; i > 0; i--) {
      (uint256 rIn, uint256 rOut) = _getReserves(path[i-1], path[i]);
      amounts[i-1] = getAmountIn(amounts[i], rIn, rOut);
    }
    require(amounts[0] <= amountInMax, "ROUTER: amountInMax");

    address firstPair = _pairFor(path[0], path[1]);
    require(firstPair != address(0), "ROUTER: no pair");
    require(IERC20Like(path[0]).transferFrom(msg.sender, firstPair, amounts[0]), "ROUTER: in transfer");

    for (uint256 i = 0; i < path.length - 1; i++) {
      address inTok = path[i];
      address outTok = path[i+1];
      address pair = _pairFor(inTok, outTok);
      require(pair != address(0), "ROUTER: no pair");

      (address t0, ) = inTok < outTok ? (inTok, outTok) : (outTok, inTok);
      uint256 outAmt = amounts[i+1];

      uint256 amount0Out = outTok == t0 ? outAmt : 0;
      uint256 amount1Out = outTok == t0 ? 0 : outAmt;

      address nextTo = (i < path.length - 2) ? _pairFor(outTok, path[i+2]) : to;
      UniswapV2PairMock(pair).swap(amount0Out, amount1Out, nextTo);
    }
  }
}
`;

  const input = {
    language: "Solidity",
    sources: { "MockUniswapV2.sol": { content: source } },
    settings: {
      viaIR: true,
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors?.length) {
    const fatal = output.errors.filter((e) => e.severity === "error");
    if (fatal.length) {
      throw new Error(
        "Solc compile errors:\n" + fatal.map((e) => e.formattedMessage).join("\n")
      );
    }
  }

  const contracts = output.contracts["MockUniswapV2.sol"];
  const pick = (name) => ({
    abi: contracts[name].abi,
    bytecode: "0x" + contracts[name].evm.bytecode.object,
  });

  return {
    WETH9Mock: pick("WETH9Mock"),
    UniswapV2FactoryMock: pick("UniswapV2FactoryMock"),
    UniswapV2Router02Mock: pick("UniswapV2Router02Mock"),
  };
}

/* =======================
   Main
======================= */
async function main() {
  const { ethers } = hre;
  const network = hre.network.name;
  const [deployer] = await ethers.getSigners();
  const d = loadDeployments(network);

  console.log("🚀 Deploy Nghiệp vụ 2 - Swap (ONLY edit 02_swap.js: deploy UniswapV2 Mock 0.8.x + seed + config)");
  console.log("Network :", network);
  console.log("Deployer:", deployer.address);

  if (!d.registry) throw new Error("❌ Missing registry. Run scripts/00_registry.js first.");
  const registry = await ethers.getContractAt("Registry", d.registry);

  // NOTE:
  // - The original example used large numbers (e.g. 15 ETH) which easily cause
  //   "insufficient funds for intrinsic transaction cost" on testnets.
  // - Use much smaller defaults so script can run with typical faucet balances.
  // - You can still override via env: SEED_TRADE, SEED_LINK, SEED_WETH, SEED_ETH_FOR_WETH.
  const SEED_TRADE = process.env.SEED_TRADE || "1000";
  const SEED_LINK = process.env.SEED_LINK || "1000";
  const SEED_WETH = process.env.SEED_WETH || "0.05"; // WETH per pool
  const SEED_ETH_FOR_WETH = process.env.SEED_ETH_FOR_WETH || "0.15"; // total ETH to wrap

  console.log("\n🧱 Compiling in-script UniswapV2 Mock (solc, viaIR) ...");
  const mock = compileMockUniswap();

  // Deploy WETH/Factory/Router
  const WETHFactory = new ethers.ContractFactory(mock.WETH9Mock.abi, mock.WETH9Mock.bytecode, deployer);
  const weth = await WETHFactory.deploy();
  await weth.deployed();
  console.log("✅ WETH9Mock deployed:", weth.address);

  const FactoryFactory = new ethers.ContractFactory(
    mock.UniswapV2FactoryMock.abi,
    mock.UniswapV2FactoryMock.bytecode,
    deployer
  );
  const v2Factory = await FactoryFactory.deploy(deployer.address);
  await v2Factory.deployed();
  console.log("✅ UniswapV2FactoryMock deployed:", v2Factory.address);

  const RouterFactory = new ethers.ContractFactory(
    mock.UniswapV2Router02Mock.abi,
    mock.UniswapV2Router02Mock.bytecode,
    deployer
  );
  const v2Router = await RouterFactory.deploy(v2Factory.address, weth.address);
  await v2Router.deployed();
  console.log("✅ UniswapV2Router02Mock deployed:", v2Router.address);

  // Deploy tokens
  const TradeToken = await ethers.getContractFactory("TradeToken");
  const MockERC20 = await ethers.getContractFactory("MockERC20");

  const MAX_SUPPLY = ethers.utils.parseEther("1000000");
  const INITIAL_MINT = ethers.utils.parseEther("300000");

  const tradeToken = await TradeToken.deploy("Trade Token", "TRADE", MAX_SUPPLY, INITIAL_MINT);
  await tradeToken.deployed();
  console.log("✅ TradeToken deployed:", tradeToken.address);

  const mockLink = await MockERC20.deploy("Mock LINK", "mLINK", ethers.utils.parseEther("1000000"));
  await mockLink.deployed();
  console.log("✅ MockLINK deployed :", mockLink.address);

  // Deposit ETH -> WETH (safely, avoid insufficient funds)
  const desiredDeposit = ethers.utils.parseEther(SEED_ETH_FOR_WETH);
  const deployerBalance = await deployer.getBalance();

  if (deployerBalance.lte(ethers.utils.parseEther("0.01"))) {
    throw new Error(
      `❌ Deployer balance quá thấp (<= 0.01 ETH). Nạp thêm ETH cho ${deployer.address} rồi chạy lại.`
    );
  }

  // Giữ ~20% cho gas, tối đa dùng 80% balance để wrap
  const maxSafeDeposit = deployerBalance.mul(80).div(100);
  const actualDeposit = desiredDeposit.gt(maxSafeDeposit)
    ? maxSafeDeposit
    : desiredDeposit;

  if (actualDeposit.lte(0)) {
    throw new Error("❌ Số ETH có thể wrap ra WETH = 0. Kiểm tra lại balance.");
  }

  await (await weth.deposit({ value: actualDeposit })).wait();
  console.log(
    `✅ Deposited ${ethers.utils.formatEther(actualDeposit)} ETH -> WETH (requested ${SEED_ETH_FOR_WETH} ETH)`
  );

  // Seed liquidity
  const seedTrade = ethers.utils.parseEther(SEED_TRADE);
  const seedLink = ethers.utils.parseEther(SEED_LINK);
  const seedWethEach = ethers.utils.parseEther(SEED_WETH);
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

  await (await tradeToken.approve(v2Router.address, seedTrade)).wait();
  await (await mockLink.approve(v2Router.address, seedLink)).wait();
  await (await weth.approve(v2Router.address, seedWethEach.mul(2))).wait();

  console.log("\n🌊 Seeding liquidity TRADE/WETH ...");
  await (await v2Router.addLiquidity(tradeToken.address, weth.address, seedTrade, seedWethEach, deployer.address, deadline)).wait();
  console.log("✅ Seeded TRADE/WETH");

  console.log("\n🌊 Seeding liquidity mLINK/WETH ...");
  await (await v2Router.addLiquidity(mockLink.address, weth.address, seedLink, seedWethEach, deployer.address, deadline)).wait();
  console.log("✅ Seeded mLINK/WETH");

  // Deploy your SwapRouterProxy + Adapter
  const SwapRouterProxy = await ethers.getContractFactory("SwapRouterProxy");
  const swapRouter = await SwapRouterProxy.deploy(weth.address);
  await swapRouter.deployed();
  console.log("\n✅ SwapRouterProxy deployed:", swapRouter.address);

  const UniswapV2Adapter = await ethers.getContractFactory("UniswapV2Adapter");
  const adapter = await UniswapV2Adapter.deploy(v2Router.address, weth.address);
  await adapter.deployed();
  console.log("✅ UniswapV2Adapter deployed:", adapter.address);

  await (await swapRouter.setDexAdapter(0, adapter.address)).wait();
  console.log("✅ Adapter set for DEX_TYPE.UNISWAP_V2 (0)");

  await (await swapRouter.setSupportedTokens([tradeToken.address, mockLink.address, weth.address], true)).wait();
  console.log("✅ Supported tokens set");

  // Save + registry
  d.weth = weth.address;
  d.uniswapV2FactoryMock = v2Factory.address;
  d.uniswapV2RouterMock = v2Router.address;
  d.tradeToken = tradeToken.address;
  d.mockLink = mockLink.address;
  d.swapRouter = swapRouter.address;
  d.uniswapV2Adapter = adapter.address;

  await upsert(registry, "WETH", weth.address);
  await upsert(registry, "DEX_V2_FACTORY", v2Factory.address);
  await upsert(registry, "DEX_V2_ROUTER", v2Router.address);
  await upsert(registry, "TRADE_TOKEN", tradeToken.address);
  await upsert(registry, "MOCK_LINK", mockLink.address);
  await upsert(registry, "SWAP_ROUTER", swapRouter.address);
  await upsert(registry, "UNISWAP_V2_ADAPTER", adapter.address);

  saveDeployments(network, d);

  console.log("\n📦 DEPLOY SUMMARY");
  console.log("Registry            :", d.registry);
  console.log("WETH (Mock)         :", d.weth);
  console.log("V2 Factory (Mock)   :", d.uniswapV2FactoryMock);
  console.log("V2 Router (Mock)    :", d.uniswapV2RouterMock);
  console.log("TradeToken          :", d.tradeToken);
  console.log("MockLINK            :", d.mockLink);
  console.log("SwapRouterProxy     :", d.swapRouter);
  console.log("UniswapV2Adapter    :", d.uniswapV2Adapter);
  console.log("📄 Saved            :", `deployments/${network}.json`);

  console.log("\n✅ Swap demo paths:");
  console.log(" - TRADE <-> WETH");
  console.log(" - mLINK <-> WETH");
  console.log(" - TRADE <-> mLINK (nếu FE/adapter build path qua WETH)");
}

main().catch((err) => {
  console.error("❌ Deploy failed:", err);
  process.exit(1);
});
