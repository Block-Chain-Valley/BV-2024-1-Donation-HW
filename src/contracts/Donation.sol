// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interface/DaoTokenInterface.sol";
import "./interface/DaoInterface.sol";
import "./interface/DonationInterface.sol";

contract Donation is DonationInterface {
    ///////////// @notice 아래에 변수 추가 ////////////

    /// @notice Admin 주소
    address public admin;

    /// @notice 캠페인 아이디 카운트
    uint256 public count;

    /// @notice DAO 토큰 컨트랙트 주소
    DaoTokenInterface public daoToken;

    ///////////// @notice 아래에 매핑 추가 ////////////

    /// @notice 캠페인 아이디 -> 캠페인 구조체
    mapping(uint256 => Campaign) public campaigns;

    /// @notice 캠페인 아이디 -> 사용자 주소 -> 기부 금액
    mapping(uint256 => mapping(address => uint256)) public pledgedUserToAmount;

    ///////////// @notice 아래에 생성자 및 컨트랙트 주소 설정 ////////////

    constructor(address _daoToken) {
        admin = msg.sender;
        daoToken = DaoTokenInterface(_daoToken);
    }

    /// @notice 관리자 및 DAO Token 컨트랙트 주소 설정
    DaoInterface public dao;

    ///////////// @notice 아래에 modifier 추가 ////////////

    /// @notice 관리자만 접근 가능하도록 설정
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    /// @notice DAO 회원만 접근 가능하도록 설정
    modifier onlyDao() {
        require(dao.checkDaoMember(), "Only DAO contract can perform this action");
        _;
    }

    function setDaoAddress(address _daoAddress) external onlyAdmin {
        dao = DaoInterface(_daoAddress);
    }

    function launch(
        address _target,
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint32 _startAt,
        uint32 _endAt
    ) external {
        require(_startAt >= block.timestamp, "start at < now");
        require(_endAt >= _startAt, "end at < start at");
        require(_endAt <= block.timestamp + 90 days, "end at > max duration");

        count++;
        campaigns[count] = Campaign({
            creator: msg.sender,
            target: _target,
            title: _title,
            description: _description,
            goal: _goal,
            pledged: 0,
            startAt: _startAt,
            endAt: _endAt,
            claimed: false
        });

        emit Launch(count, campaigns[count]);
    }

    function cancel(uint256 _campaignId) external {
        Campaign memory campaign = campaigns[_campaignId];
        require(msg.sender == campaign.creator, "not creator");
        require(campaign.startAt > block.timestamp, "started");

        delete campaigns[_campaignId];
        emit Cancel(_campaignId);
    }

    function pledge(uint256 _campaignId, uint256 _amount) external {
        require(address(dao) != address(0), "Dao address not set");
        Campaign storage campaign = campaigns[_campaignId];
        require(block.timestamp >= campaign.startAt, "not started");
        require(!getIsEnded(_campaignId), "Campaign ended");
        require(_amount > 0, "Amount must be greater than zero");

        campaign.pledged += _amount;
        pledgedUserToAmount[_campaignId][msg.sender] += _amount;
        daoToken.transferFrom(msg.sender, address(this), _amount);

        emit Pledge(_campaignId, msg.sender, _amount, campaign.pledged);

        if (campaign.pledged >= campaign.goal) {
            dao.startVote(_campaignId);
        }
    }

    function unpledge(uint256 _campaignId, uint256 _amount) external {
        Campaign storage campaign = campaigns[_campaignId];
        require(_amount > 0, "Amount must be greater than zero");
        require(!getIsEnded(_campaignId), "Campaign ended");

        campaign.pledged -= _amount;
        pledgedUserToAmount[_campaignId][msg.sender] -= _amount;
        daoToken.transfer(msg.sender, _amount);

        emit Unpledge(_campaignId, msg.sender, _amount, campaign.pledged);
    }

    // function claim(uint256 _campaignId) external onlyDao {
    function claim(uint256 _campaignId) external {
        require(getIsEnded(_campaignId), "Campaign not ended");

        Campaign storage campaign = campaigns[_campaignId];
        require(!campaign.claimed, "claimed");

        daoToken.transfer(campaign.target, campaign.pledged);
        campaign.claimed = true;

        emit Claim(_campaignId, campaign.claimed, campaign.pledged);
    }

    function refund(uint256 _campaignId) external {
        require(getIsEnded(_campaignId), "Campaign not ended");

        uint256 bal = pledgedUserToAmount[_campaignId][msg.sender];
        pledgedUserToAmount[_campaignId][msg.sender] = 0;
        daoToken.transfer(msg.sender, bal);

        emit Refund(_campaignId, msg.sender, bal);
    }

    ///////////// @notice 아래에 get함수는 필요한 경우 주석을 해제해 사용해주세요 ////////////

    function getIsEnded(uint256 _campaignId) public view returns (bool) {
        Campaign memory campaign = campaigns[_campaignId];
        return block.timestamp >= campaign.endAt || campaign.pledged >= campaign.goal;
    }

    function getCampaign(uint256 _campaignId) external view returns (Campaign memory) {
        return campaigns[_campaignId];
    }

    function getCampaignCreator(uint256 _campaignId) external view returns (address) {
        return campaigns[_campaignId].creator;
    }

    function getCampaignGoal(uint256 _campaignId) external view returns (uint256) {
        return campaigns[_campaignId].goal;
    }

    function getCampaignTotalAmount(uint256 _campaignId) external view returns (uint256) {
        return campaigns[_campaignId].pledged;
    }
}
