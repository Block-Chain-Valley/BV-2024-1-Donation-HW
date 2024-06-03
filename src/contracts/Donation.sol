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

    /// @notice 관리자 및 DAO Token 컨트랙트 주소 설정
    constructor(address _daoToken) {
        admin = msg.sender;
        daoToken = DaoTokenInterface(_daoToken);
    }

    ///////////// @notice 아래에 modifier 추가 ////////////

    /// @notice 관리자만 접근 가능하도록 설정
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can init Donation contract");
        _;
    }

    /// @notice DAO 회원만 접근 가능하도록 설정

    function launch(
        address _target,
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint32 _startAt,
        uint32 _endAt
    ) external {
        require(_startAt > block.timestamp, "start at < now");
        require(_startAt < _endAt, "end at < start at");
        require(_endAt - _startAt <= 90 days, "The maximum allowed campaign duration is 90 days.");

        count++;

        Campaign memory campaign = Campaign({
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
        campaigns[count] = campaign;

        emit Launch(count, campaign);
    }

    function cancel(uint256 _campaignId) external {
        Campaign memory campaign = campaigns[_campaignId];

        require(msg.sender == campaign.creator, "Only creator can cancel");
        require(campaign.startAt > block.timestamp, "Already Started");

        delete campaigns[_campaignId];

        emit Cancel(_campaignId);
    }

    function pledge(uint256 _campaignId, uint256 _amount) external {
        Campaign memory campaign = campaigns[_campaignId];

        require(block.timestamp >= campaign.startAt, "not started");
        require(!this.getIsEnded(_campaignId), "Campaign ended");
        require(_amount > 0, "Amount must be greater than zero");

        campaign.pledged += _amount;
        pledgedUserToAmount[_campaignId][msg.sender] += _amount;
        daoToken.transferFrom(msg.sender, address(this), _amount);

        emit Pledge(_campaignId, msg.sender, _amount, campaign.pledged);
    }

    function unpledge(uint256 _campaignId, uint256 _amount) external {
        Campaign memory campaign = campaigns[_campaignId];

        require(_amount > 0, "Amount must be greater than zero");
        require(!this.getIsEnded(_campaignId), "Campaign ended");
        require(
            _amount <= pledgedUserToAmount[_campaignId][msg.sender],
            "Unpledge amount must be smaller than the amount you pledged"
        );

        campaign.pledged -= _amount;
        pledgedUserToAmount[_campaignId][msg.sender] -= _amount;
        daoToken.transfer(msg.sender, _amount);

        emit Unpledge(_campaignId, msg.sender, _amount, campaign.pledged);
    }

    //2. onlyDao modifier 추가
    function claim(uint256 _campaignId) external {
        require(this.getIsEnded(_campaignId), "Campaign not ended");

        Campaign memory campaign = campaigns[_campaignId];

        require(!campaign.claimed, "claimed");

        daoToken.transfer(campaign.target, campaign.pledged);
        campaign.claimed = true;

        emit Claim(_campaignId, true, campaign.pledged);
    }

    function refund(uint256 _campaignId) external {
        require(this.getIsEnded(_campaignId), "Campaign not ended");

        uint256 bal = pledgedUserToAmount[_campaignId][msg.sender];
        pledgedUserToAmount[_campaignId][msg.sender] = 0;
        daoToken.transfer(msg.sender, bal);

        emit Refund(_campaignId, msg.sender, bal);
    }

    ///////////// @notice 아래에 get함수는 주석을 해제해 사용해주세요 ////////////

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
