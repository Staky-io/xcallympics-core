// SPDX-License-Identifier: MIT
pragma solidity >=0.8.18;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./xcall/libraries/BTPAddress.sol";
import "./xcall/libraries/ParseAddress.sol";
import "./xcall/interfaces/ICallService.sol";
import "./utils/XCallBase.sol";
import "./utils/XCallympicsNFT.sol";

contract NFTBridge is XCallBase {
    address public nftAddress;

    mapping(string => bool) public authorizedBridges; // authorized bridges on other chains (BTP Address) => true/false
    mapping(string => string) public bridgesNID; // networkID => Bridge BTP Address
    mapping(uint256 => bool) public usedNonces; // id => true/false

    event TokenMinted(address indexed _to, uint indexed _id);
    event TokenBridgedToChain(address indexed _from, string indexed _to, uint indexed _id);
    event TokenBurned(address indexed _from, uint indexed _id);
    event NFTAddressChanged(address indexed _from, address indexed _to);

    /**
        @notice Uses XCallBase Initializer that replaces it's constructor.
        @dev Callable only once by deployer.
        @param _nftAddress Instance of token NFT contract
        @param _callServiceAddress Address of x-call service on the current chain
        @param _networkID The network ID of the current chain
     */

    constructor(
        address _nftAddress,
        address _callServiceAddress,
        string memory _networkID
    ) {
        require(_nftAddress != address(0), "NFTBridge: NFT address is zero");
        require(_callServiceAddress != address(0), "NFTBridge: call service address is zero");
        require(bytes(_networkID).length != 0, "NFTBridge: network ID is empty");

        nftAddress = _nftAddress;

        initialize(
            _callServiceAddress,
            _networkID
        );
    }

    // utility functions

    function allowBridgeAddress(
        string memory _bridgeBTPAddress
    ) public onlyOwner {
        authorizedBridges[_bridgeBTPAddress] = true;
        string memory nid = BTPAddress.networkAddress(_bridgeBTPAddress);
        bridgesNID[nid] = _bridgeBTPAddress;
    }

    function revokeBridgeAddress(
        string memory _bridgeBTPAddress
    ) public onlyOwner {
        authorizedBridges[_bridgeBTPAddress] = false;
        string memory nid = BTPAddress.networkAddress(_bridgeBTPAddress);
        delete bridgesNID[nid];
    }

    function setNFTAddress(
        address _nftAddress
    ) public onlyOwner {
        require(_nftAddress != address(0), "NFTBridge: NFT address is zero");
        address oldAddress = nftAddress;
        nftAddress = _nftAddress;
        emit NFTAddressChanged(oldAddress, _nftAddress);
    }

    function mintNFT() public returns (uint256) {
        XCallympicsNFT nft = XCallympicsNFT(nftAddress);

        // create unique id based on block number and timestamp
        uint256 id = getID();

        require(!usedNonces[id], "NFTBridge: Nonce already used");

        usedNonces[id] = true;
        nft.mint(msg.sender, id);

        emit TokenMinted(msg.sender, id);
        return id;
    }

    function getID() private view returns (uint256) {
        uint256 prefix = uint256(keccak256(abi.encodePacked(networkID))) % 100000;
        return ((uint256(keccak256(abi.encodePacked(msg.sender))) % block.number) + (block.timestamp - 1600000000)) * prefix;
    }

    // Bridge NFT functions

    function _processBridgeNFTFromChain(
        bytes memory _data
    ) internal {
        /**
            @notice The data is encoded as follows:
            @param btpTo The BTP destination address
            @param id The token id
            (supposed to be as close as handleCallMessage input)
        */

        (string memory btpTo, uint256 id) = abi.decode(_data, (string, uint256));

        address to = btpStringToAddress(btpTo);

        XCallympicsNFT nft = XCallympicsNFT(nftAddress);
        nft.mint(to, id);
        emit TokenMinted(to, id);
    }

    function _bridgeNFTToChain(
        string memory _bridgeAddress,
        string memory _to,
        uint256 _id
    ) internal {
        XCallympicsNFT token = XCallympicsNFT(nftAddress);
        address approved = token.getApproved(_id);

        require(approved == address(this), "NFTProxy: proxy is not approved to transfer this token");

        bytes memory payload = abi.encode("BRIDGE_NFT_FROM_CHAIN", abi.encode(_to, _id));
        bytes memory rollbackData = abi.encode("ROLLBACK_BRIDGE_NFT_FROM_CHAIN", abi.encode(msg.sender, _id));

        token.transferFrom(msg.sender, address(this), _id);
        token.burn(_id);

        _sendXCallMessage(_bridgeAddress, payload, rollbackData);
    }

     /**
        @notice Handles bridge NFT to chain. Callable by everyone.
        @param _to The BTP address of the recipient on the destination chain
        @param _id The token id
     */
    function bridgeNFToChain(
        string memory _to,
        uint256 _id
    ) public payable {
        uint fee = getXCallFee(_to, true);
        string memory destinationNetworkID = BTPAddress.networkAddress(_to);
        string memory bridgeAddress = bridgesNID[destinationNetworkID];

        require(msg.value >= fee, "NFTProxy: insufficient fee");
        require(authorizedBridges[bridgeAddress], "NFTProxy: no bridge found for this network");

        _bridgeNFTToChain(bridgeAddress, _to, _id);

        emit TokenBridgedToChain(msg.sender, _to, _id);

        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
    }

    // X-Call handlers

    function _processXCallRollback(bytes memory _data) internal override {
        emit RollbackDataReceived(callSvcBtpAddr, _data);

        (string memory method, bytes memory data) = abi.decode(_data, (string, bytes));

        if (compareTo(method, "ROLLBACK_BRIDGE_NFT_FROM_CHAIN")) {
            _processBridgeNFTFromChain(data);
        } else {
            revert("NFTProxy: method not supported");
        }
    }

    function _processXCallMethod(
        string calldata _from,
        bytes memory _data
    ) internal override {
        emit MessageReceived(_from, _data);

        (string memory method, bytes memory data) = abi.decode(_data, (string, bytes));

        if (compareTo(method, "BRIDGE_NFT_FROM_CHAIN")) {
            require(authorizedBridges[_from], "NFTProxy: only NFT Bridge can call this function");
            _processBridgeNFTFromChain(data);
        } else {
            revert("NFTProxy: method not supported");
        }
    }

    // Helpers

    function btpStringToAddress(string memory btpAddr) internal pure returns (address) {
        (, string memory _a) = BTPAddress.parseBTPAddress(btpAddr);
        bytes memory tmp = bytes(_a);
        uint160 iaddr = 0;
        uint160 b1;
        uint160 b2;
        for (uint i = 2; i < 2 + 2 * 20; i += 2) {
            iaddr *= 256;
            b1 = uint160(uint8(tmp[i]));
            b2 = uint160(uint8(tmp[i + 1]));
            if ((b1 >= 97) && (b1 <= 102)) {
                b1 -= 87;
            } else if ((b1 >= 65) && (b1 <= 70)) {
                b1 -= 55;
            } else if ((b1 >= 48) && (b1 <= 57)) {
                b1 -= 48;
            }
            if ((b2 >= 97) && (b2 <= 102)) {
                b2 -= 87;
            } else if ((b2 >= 65) && (b2 <= 70)) {
                b2 -= 55;
            } else if ((b2 >= 48) && (b2 <= 57)) {
                b2 -= 48;
            }
            iaddr += (b1 * 16 + b2);
        }
        return address(iaddr);
    }
}
