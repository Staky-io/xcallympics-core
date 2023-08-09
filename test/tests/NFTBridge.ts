import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { deployBridgeAndNFT } from "../fixtures/base";

export default function () {
    describe("NFTBridge", function () {
        it("Mint NFT", async function () {
            const { nftBridge, runnerNFT, deployer } = await loadFixture(deployBridgeAndNFT);

            const tx = await nftBridge.mintNFT();
            const ids = await runnerNFT.getUserOwnedTokens(deployer.address);

            await expect(tx).to.emit(nftBridge, 'TokenMinted').withArgs(deployer.address, ids[0]);
        });

        it('Transfer NFT', async function () {
            const { BSC_BRIDGE, nftBridge, runnerNFT, deployer } = await loadFixture(deployBridgeAndNFT);
            const deployerBTPAddress = `btp://0x61.bsc/${deployer.address}`;

            await nftBridge.mintNFT();
            const ids = await runnerNFT.getUserOwnedTokens(deployer.address);
            await runnerNFT.approve(nftBridge.address, ids[0]);
            const xcallFee = await nftBridge.getXCallFee(BSC_BRIDGE, true);
            const tx = await nftBridge.bridgeNFToChain(
                deployerBTPAddress,
                ids[0],
                {
                    value: xcallFee
                }
            );

            await expect(tx).to.emit(nftBridge, 'TokenBridgedToChain').withArgs(
                deployer.address,
                deployerBTPAddress,
                ids[0]
            );
        });
    })
};