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
    })
};