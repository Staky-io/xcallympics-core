import fs from "fs";
import { ethers, run } from "hardhat";
import {
    getBSCNetworkSettings,
    getBSCSigner,
    getETHNetworkSettings,
    getETHSigner
} from "./utils";

const deployETH = async (factory: string, args: any[] = [], overrides = {}) => {
    const ethSigner = getETHSigner(process.env.EVM_PRIVATE_KEY!)
    const ContractFactory = await ethers.getContractFactory(factory, ethSigner);
    const contract = await ContractFactory.deploy(...args, overrides);

    await contract.deployed();

    console.log(`[ETH] ${factory}: ${contract.address}`);
    return contract;
}

const deployBSC = async (factory: string, args: any[] = [], overrides = {}) => {
    const bscSigner = getBSCSigner(process.env.EVM_PRIVATE_KEY!)
    const ContractFactory = await ethers.getContractFactory(factory, bscSigner);
    const contract = await ContractFactory.deploy(...args, overrides);

    await contract.deployed();

    console.log(`[BSC] ${factory}: ${contract.address}`);
    return contract;
}

async function main() {
    const privateKey = process.env.EVM_PRIVATE_KEY || undefined;

    if (!privateKey) {
        throw new Error('EVM_PRIVATE_KEY env variable is not set')
    }

    try {
        const ETHNetworkSettings = getETHNetworkSettings()
        const BSCNetworkSettings = getBSCNetworkSettings()

        const contractsETH: object[] = [];
        const contractsBSC: object[] = [];

        // Deploy on ETH
        const runnerNFTArgs = ['XCallympics Runner', 'XCR', 'https://ipfs.io/ipfs/'];
        const RunnerNFTETH = await deployETH('XCallympicsNFT', runnerNFTArgs);
        contractsETH.push({ name: 'RunnerNFT', address: RunnerNFTETH.address, args: runnerNFTArgs });
        
        const NFTBridgeETHArgs = [
            RunnerNFTETH.address,
            ETHNetworkSettings.callService,
            ETHNetworkSettings.networkID
        ]
        
        const NFTBridgeETH = await deployETH('NFTBridge', NFTBridgeETHArgs);
        contractsETH.push({ name: 'NFTBridge', address: NFTBridgeETH.address, args: NFTBridgeETHArgs });
        
        await NFTBridgeETH.deployed();
        await RunnerNFTETH.transferOwnership(NFTBridgeETH.address);
        console.log(`[ETH] RunnerNFT ownership transfered to NFTBridge`);
        
        // Deploy on BSC
        const RunnerNFTBSC = await deployBSC('XCallympicsNFT', runnerNFTArgs);
        contractsBSC.push({ name: 'RunnerNFT', address: RunnerNFTBSC.address, args: runnerNFTArgs });
        
        const NFTBridgeBSCArgs = [
            RunnerNFTBSC.address,
            BSCNetworkSettings.callService,
            BSCNetworkSettings.networkID
        ]
        
        const NFTBridgeBSC = await deployBSC('NFTBridge', NFTBridgeBSCArgs);
        contractsBSC.push({ name: 'NFTBridge', address: NFTBridgeBSC.address, args: NFTBridgeBSCArgs });

        await NFTBridgeBSC.deployed();
        await RunnerNFTBSC.transferOwnership(NFTBridgeBSC.address);
        console.log(`[BSC] RunnerNFT ownership transfered to NFTBridge`);

        // Bridge config

        await NFTBridgeETH.allowBridgeAddress(`btp://${BSCNetworkSettings.networkID}/${NFTBridgeBSC.address}`);
        console.log(`[ETH] BSC bridge address allowed`);
        await NFTBridgeBSC.allowBridgeAddress(`btp://${ETHNetworkSettings.networkID}/${NFTBridgeETH.address}`);
        console.log(`[BSC] ETH bridge address allowed`);

        if (!fs.existsSync('./deployments')) {
            fs.mkdirSync('./deployments');
        }

        if (contractsETH.length > 0) {
            fs.writeFileSync(
                'deployments/deployment-ETH.json',
                JSON.stringify(contractsETH, null, 4)
            );
        }

        if (contractsBSC.length > 0) {
            fs.writeFileSync(
                'deployments/deployment-BSC.json',
                JSON.stringify(contractsBSC, null, 4)
            );
        }
    } catch (err) {
        console.error(err);
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
