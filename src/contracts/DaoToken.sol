// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./common/token/ERC20.sol";

/// @notice ERC20을 상속받아 DAO 토큰을 구현한 컨트랙트
contract DaoToken is ERC20 {
    address public admin;

    /// @notice ETH <-> DAO Token 교환비
    /// @dev ETH number * exchangeRate = DAO Token number
    uint256 public exchangeRate;

    event TokensPurchased(address indexed buyer, uint256 amountOfETH, uint256 amountOfTokens);
    event TokensWithdrawn(address indexed target, uint256 amountOfETH);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can mint tokens");
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _exchangeRate,
        uint256 _initialSupply
    ) ERC20(_name, _symbol) {
        admin = msg.sender;
        exchangeRate = _exchangeRate;

        /// @notice 초기 공급량을 배포자에게 할당
        _mint(msg.sender, _initialSupply);
    }

    /// @notice 기존 기능에 관리자만 민트가 가능하도록 onlyAdmin modifier 설정
    function mint(address _to, uint256 _amount) public onlyAdmin {
        _mint(_to, _amount);
    }

    /// @notice ETH를 받아 DAO 토큰을 구매하는 함수
    /// @notice 0.001ETH당 100DAO를 구매할 수 있음
    function buyTokens() external payable {
        require(msg.value > 0, "You must send ETH to buy tokens");
        require(msg.sender.balance >= msg.value, "Insufficient balance");

        uint256 tokensToMint = (msg.value * exchangeRate) / 10 ** uint256(decimals());
        _mint(msg.sender, tokensToMint);

        emit TokensPurchased(msg.sender, msg.value, tokensToMint);
    }

    /// @notice DAO토큰량에 따라 ETH 인출 기능
    function sellTokens(uint256 _amount) external {
        require(_amount > 0, "You must sell at least some tokens");
        require(balanceOf(msg.sender) >= _amount, "Insufficient balance");

        uint256 ethToTransfer = (_amount * 10 ** uint256(decimals())) / exchangeRate;

        _transfer(msg.sender, address(this), _amount);
        _burn(address(this), _amount);

        payable(msg.sender).transfer(ethToTransfer);

        emit TokensWithdrawn(msg.sender, ethToTransfer);
    }

    /// @notice 교환비 설정 함수
    function setExchangeRate(uint256 _exchangeRate) external onlyAdmin {
        exchangeRate = _exchangeRate;
    }

    /// @notice 컨트랙트의 이더 잔액 조회 함수
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice 컨트랙트가 ETH를 받을 수 있도록 receive 함수 구현
    receive() external payable {}
}
