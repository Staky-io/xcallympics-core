import { ethers } from "hardhat";

export async function deployBridgeAndNFT() {
    const [deployer, user] = await ethers.getSigners();

    const BSC_BRIDGE = 'btp://0x61.bsc/0xf83f73e4B10a23438B4BeA591FcFdDd7a81Ba7E3'
    const CALL_SERVICE = '0x9B68bd3a04Ff138CaFfFe6D96Bc330c699F34901' // ETH sepolia testnet address
    const ETH_NETWORK_ID = '0xaa36a7.eth2' // ETH sepolia network id

    const RunnerNFT = await ethers.getContractFactory("XCallympicsNFT");
    const runnerNFT = await RunnerNFT.deploy('XCallympics Runner', 'XCR', 'https://ipfs.io/ipfs/');

    const NFTBridge = await ethers.getContractFactory("NFTBridge");
    const nftBridge = await NFTBridge.deploy(
        runnerNFT.address,
        CALL_SERVICE,
        ETH_NETWORK_ID
    );

    await nftBridge.deployed();
    await nftBridge.allowBridgeAddress(BSC_BRIDGE);
    await runnerNFT.transferOwnership(nftBridge.address);

    return {
        BSC_BRIDGE,
        CALL_SERVICE,
        ETH_NETWORK_ID,
        runnerNFT,
        nftBridge,
        deployer,
        user
    };
}