// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract PolyNFT is ERC721, ERC721URIStorage {
    uint256 private _nextTokenId;

    event NFTMinted(address indexed to, uint256 indexed tokenId, string tokenURI);

    constructor() ERC721("PolyNFT", "PNFT") {}

    function mint(string memory uri) external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
        emit NFTMinted(msg.sender, tokenId, uri);
        return tokenId;
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
