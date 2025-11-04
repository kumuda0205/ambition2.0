const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying Yield Farming contract with account:", deployer.address);

  const YieldFarming = await hre.ethers.getContractFactory("YieldFarming");
  const yieldFarming = await YieldFarming.deploy();

  await yieldFarming.deployed();

  console.log("Yield Farming deployed to:", yieldFarming.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
