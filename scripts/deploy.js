const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const PolyNFT = await hre.ethers.getContractFactory("PolyNFT");
  const nft = await PolyNFT.deploy();
  await nft.waitForDeployment();

  const address = await nft.getAddress();
  console.log("PolyNFT deployed to:", address);

  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/PolyNFT.sol/PolyNFT.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const config = {
    address,
    abi: artifact.abi,
  };

  const outPath = path.join(__dirname, "../frontend/src/app/contract.json");
  fs.writeFileSync(outPath, JSON.stringify(config, null, 2));
  console.log("Contract config written to frontend/src/app/contract.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
