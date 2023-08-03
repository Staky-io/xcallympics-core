// SPDX-License-Identifier: MIT
pragma solidity >=0.8.18;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./xcall/libraries/BTPAddress.sol";
import "./xcall/interfaces/ICallService.sol";
import "./utils/XCallBase.sol";
import "./utils/XCallympicsNFT.sol";

contract NFTBridge is XCallBase {
    address public nftAddress;

    mapping(string => bool) public authorizedBridges; // authorized bridges on other chains (BTP Address) => true/false
    mapping(string => string) public bridgesNID; // networkID => Bridge BTP Address
    mapping(uint256 => bool) public usedNonces; // id => true/false

    event TokenMinted(address indexed _to, uint indexed _id);
    event TokenBridged(address indexed _from, string indexed _to, uint indexed _id);
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

        require(usedNonces[id], "Nonce already used");
        require(nft.ownerOf(id) == address(0), "NFT already minted");

        usedNonces[id] = true;
        nft.mint(msg.sender, id);

        emit TokenMinted(msg.sender, id);
        return id;
    }

    function getID() public view returns (uint256) {
        uint256 prefix = uint256(keccak256(abi.encodePacked(networkID))) % 100000;
        return ((uint256(keccak256(abi.encodePacked(msg.sender))) % block.number) + (block.timestamp - 1600000000)) * prefix;
    }

    // Bridge NFT functions

    function _processBridgeNFTFromChain(
        bytes memory _data
    ) internal {
        /**
            @notice The data is encoded as follows:
            @param to The destination address on the current chain
            @param id The token id
            (supposed to be as close as handleCallMessage input)
        */

        (address to, uint256 id) = abi.decode(_data, (address, uint256));

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

        emit TokenBurned(msg.sender, _id);
        token.safeTransferFrom(msg.sender, address(this), _id);
        token.burn(_id);

        emit TokenBridged(msg.sender, _to, _id);
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

        emit TokenBridged(msg.sender, _to, _id);

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
}
