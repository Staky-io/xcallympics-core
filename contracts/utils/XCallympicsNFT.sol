// SPDX-License-Identifier: MIT
pragma solidity >=0.8.18;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract XCallympicsNFT is ERC721, ERC721Burnable, Ownable {
    string private baseURI;

    mapping(address => uint256[]) private ownerToIds;

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _uri
    ) ERC721(_name, _symbol) {
        setBaseURI(_uri);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function getUserOwnedTokens(address _owner) public view returns (uint256[] memory) {
        return ownerToIds[_owner];
    }

    function setBaseURI(
        string memory _uri
    ) public onlyOwner {
        baseURI = _uri;
    }

    function mint(
        address _to,
        uint256 _id
    ) public onlyOwner {
        _safeMint(_to, _id);
        ownerToIds[_to].push(_id);
    }

    function _beforeTokenTransfer(
        address _from,
        address _to,
        uint256 _tokenId,
        uint256 _batchSize
    ) internal override(ERC721) {
        super._beforeTokenTransfer(_from, _to, _tokenId, _batchSize);

        if (_from != address(0)) {
            uint256[] storage fromIds = ownerToIds[_from];

            for (uint256 i = 0; i < fromIds.length; i++) {
                if (fromIds[i] == _tokenId) {
                    fromIds[i] = fromIds[fromIds.length - 1];
                    fromIds.pop();
                    break;
                }
            }
        }
    }
}