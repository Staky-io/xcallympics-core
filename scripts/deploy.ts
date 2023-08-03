import { ethers } from "hardhat";

async function main() {
  const CALL_SERVICE = '0x9B68bd3a04Ff138CaFfFe6D96Bc330c699F34901' // ETH sepolia testnet address
  const ETH_NETWORK_ID = '0xaa36a7.eth2' // ETH sepolia network id

  const RunnerNFT = await ethers.getContractFactory("XCallympicsNFT");
  const runnerNFT = await RunnerNFT.deploy('XCallympics Runner', 'XCR', 'https://ipfs.io/ipfs/');

  console.log(`RunnerNFT deployed to ${runnerNFT.address}`);

  const NFTBridge = await ethers.getContractFactory("NFTBridge");
  const nftbridge = await NFTBridge.deploy(
    runnerNFT.address,
    CALL_SERVICE,
    ETH_NETWORK_ID
  );

  await nftbridge.deployed();

  console.log(`NFTbridge deployed to ${nftbridge.address}`);

  await runnerNFT.transferOwnership(nftbridge.address);

  console.log(`runnerNFT ownership transfered to NFTBridge`);

  console.log('NFTBridge initialized with the following params:')
  console.log(`runnerNFT address: ${runnerNFT.address}`)
  console.log(`Call service address: ${CALL_SERVICE}`)
  console.log(`Network ID: ${ETH_NETWORK_ID}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
