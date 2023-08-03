import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { deployBridgeAndNFT } from "../fixtures/base";
import { ethers } from 'hardhat'

export default function () {
    describe("NFTBridge", function () {
        it("Deploy with right params", async function () {
            const { nftBridge } = await loadFixture(deployBridgeAndNFT);
            const id = await nftBridge.getID();
            console.log('NFTBridge deployed with id: ', id);

            expect(id).to.equal(1);
        });
    })
};