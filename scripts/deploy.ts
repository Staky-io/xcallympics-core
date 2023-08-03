import hre from "hardhat";
import fs from "fs";
import { ethers } from "hardhat";
import { getNetworkSettings } from "./utils";

async function main() {
    try {
        const { callService, networkID } = getNetworkSettings(hre.network.name)

        const contracts: object[] = [];

        const deploy = async (factory: string, args: any[] = [], overrides = {}) => {
            const ContractFactory = await ethers.getContractFactory(factory);
            const contract = await ContractFactory.deploy(...args, overrides);

            await contract.deployed();

            contracts.push({ name: factory, address: contract.address, args: args });

            console.log(`${factory}: ${contract.address}`);
            return contract;
        }

        const RunnerNFT = await deploy('XCallympicsNFT', ['XCallympics Runner', 'XCR', 'https://ipfs.io/ipfs/']);
        const nftbridge = await deploy('NFTBridge', [RunnerNFT.address, callService, networkID]);

        await nftbridge.deployed();

        await RunnerNFT.transferOwnership(nftbridge.address);

        console.log(`RunnerNFT ownership transfered to NFTBridge`);

        console.log('NFTBridge initialized with the following params:')
        console.log(`runnerNFT address: ${RunnerNFT.address}`)
        console.log(`Call service address: ${callService}`)
        console.log(`Network ID: ${networkID}`)

        if (!fs.existsSync('./deployments')) {
            fs.mkdirSync('./deployments');
        }

        fs.writeFileSync(
            `deployments/nftbridge-${hre.network.name}.json`,
            JSON.stringify(contracts, null, 4)
        );
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
