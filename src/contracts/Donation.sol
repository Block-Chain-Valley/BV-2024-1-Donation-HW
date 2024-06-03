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
        require(msg.sender == admin, "Only admin can execute");
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
        require(_endAt > _startAt, "end at < start at");
        require(_endAt < block.timestamp + 90 days, "The maximum allowed campaign duration is 90 days.");

        count += 1;

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
        Campaign memory campaignInfo;
        campaignInfo = campaigns[_campaignId];
        require(msg.sender == campaignInfo.creator, "Only creater can cancel");
        require(campaignInfo.startAt > block.timestamp, "Already Started");

        delete campaigns[_campaignId];

        emit Cancel(_campaignId);
    }

    function pledge(uint256 _campaignId, uint256 _amount) external {
        Campaign memory campaignInfo;
        campaignInfo = campaigns[_campaignId];
        require(campaignInfo.startAt < block.timestamp, "not started");
        require(!getIsEnded(_campaignId), "Campaign ended");
        require(_amount > 0, "Amount must be greater than zero");

        require(daoToken.transferFrom(msg.sender, address(this), _amount), "Token transfer failed");

        campaigns[_campaignId].pledged += _amount;
        pledgedUserToAmount[_campaignId][msg.sender] += _amount;

        emit Pledge(_campaignId, msg.sender, _amount, campaigns[_campaignId].pledged);
    }

    function unpledge(uint256 _campaignId, uint256 _amount) external {
        Campaign memory campaignInfo;
        campaignInfo = campaigns[_campaignId];
        require(_amount > 0, "Amount must be greater than zero");
        require(!getIsEnded(_campaignId), "Campaign ended");
        require(
            _amount <= pledgedUserToAmount[_campaignId][msg.sender],
            "Unpledge amount must be smaller than the amount you pledged"
        );

        require(daoToken.transfer(msg.sender, _amount));

        campaigns[_campaignId].pledged -= _amount;
        pledgedUserToAmount[_campaignId][msg.sender] -= _amount;

        emit Unpledge(_campaignId, msg.sender, _amount, campaigns[_campaignId].pledged);
    }

    //2. onlyDao modifier 추가
    function claim(uint256 _campaignId) external {
        require(getIsEnded(_campaignId), "Campaign not ended");

        Campaign memory campaignInfo;
        campaignInfo = campaigns[_campaignId];

        require(!campaignInfo.claimed, "claimed");
        require(daoToken.transfer(campaignInfo.target, campaignInfo.pledged), "Token transfer failed");

        campaigns[_campaignId].claimed = true;

        // event Claim(uint256 indexed campaignId, bool claimed, uint256 amount);

        emit Claim(_campaignId, campaigns[_campaignId].claimed, campaigns[_campaignId].pledged);
    }

    function refund(uint256 _campaignId) external {
        require(getIsEnded(_campaignId), "Campaign not ended");
        uint256 bal = pledgedUserToAmount[_campaignId][msg.sender];

        require(daoToken.transfer(msg.sender, bal), "Token transfer failed");

        pledgedUserToAmount[_campaignId][msg.sender] = 0;

        // event Refund(uint256 indexed campaignId, address indexed caller, uint256 amount);

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
