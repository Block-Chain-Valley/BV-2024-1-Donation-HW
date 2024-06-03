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
    mapping(uint256 => mapping(address => uint256)) public pledgeUserToAmount;

    ///////////// @notice 아래에 생성자 및 컨트랙트 주소 설정 ////////////

    /// @notice 관리자 및 DAO Token 컨트랙트 주소 설정
    constructor(address _daoToken) {
        admin = msg.sender;
        daoToken = DaoTokenInterface(_daoToken);
    }

    ///////////// @notice 아래에 modifier 추가 ////////////

    /// @notice 관리자만 접근 가능하도록 설정

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
        require(_startAt < block.timestamp + 90 days, "The maximum allowed campaign duration is 90 days.");

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
    }

    function cancel(uint256 _campaignId) external {
        // 캠페인 정보를 불러오는 변수 선언
        Campaign memory campaign = campaigns[_campaignId];

        // 캠페인 생성자가 호출자인지 확인
        require(campaign.creator == msg.sender, "Only creator can cancel");

        // 현재 시간보다 시작 시간이 빨라야함
        require(block.timestamp < campaign.startAt, "Already Started");

        // 지우고자 하는 아이디에 해당 캠페인을 삭제
        delete campaigns[_campaignId];

        // cancel 이벤트 실행
        emit Cancel(_campaignId);
    }

    function pledge(uint256 _campaignId, uint256 _amount) external {
        // 캠페인 정보 가져오기
        Campaign storage campaign = campaigns[_campaignId];

        // 현재 시간이 시작 시간 이후 확인
        require(block.timestamp > campaign.startAt, "not started");

        // 캠페인이 종료되지 않았는지 확인
        require(!getIsEnded(_campaignId), "Campaign ended");

        // 기부 금액이 0보다 큰지 확인
        require(_amount > 0, "Amount must be greator than zero");

        // 기부된 총 금액을 업데이트
        campaign.pledged += _amount;

        // 아이디와 기부 금액 기록
        pledgeUserToAmount[_campaignId][msg.sender] += _amount;

        // DAO 토큰을 기부자 -> 컨트랙트
        daoToken.transferFrom(msg.sender, address(this), _amount);

        // Pledge 이벤트 실행
        emit Pledge(_campaignId, msg.sender, _amount, campaign.pledged);
    }

    function unpledge(uint256 _campaignId, uint256 _amount) external {
        // 캠페인 정보 가져오기
        Campaign storage campaign = campaigns[_campaignId];

        // 취소 금액 확인
        require(_amount > 0, "Amount must be greater than zero");

        // 캠페인 종료 여부 확인
        require(!getIsEnded(_campaignId), "Campaign ended");

        // 기존에 냈던 금액이 취소 금액보다 큰지 확인
        uint256 pledgedAmount = pledgeUserToAmount[_campaignId][msg.sender];
        require(pledgedAmount >= _amount, "Unpledge amount must be smaller than the amount you pledged");

        // 캠페인 총 금액 업데이트
        campaign.pledged -= _amount;

        // 아이디와 취소 금액 기록
        pledgeUserToAmount[_campaignId][msg.sender] -= _amount;

        // DAO 토큰 컨트랙트 -> 기부자
        daoToken.transfer(msg.sender, _amount);

        // Unpledge 이벤트 실행
        emit Unpledge(_campaignId, msg.sender, _amount, campaign.pledged);
    }

    //2. onlyDao modifier 추가
    function claim(uint256 _campaignId) external {
        // 캠페인 종료 여부 확인
        require(getIsEnded(_campaignId), "Campaign not ended");

        // 캠페인 정보 가져오기
        Campaign storage campaign = campaigns[_campaignId];

        // 캠페인 클레임 여부 확인
        require(!campaign.claimed, "claimed");

        // DAO 토큰 -> 타겟 주소
        daoToken.transfer(campaign.target, campaign.pledged);

        // 캠페인 클레임 상태 확인
        campaign.claimed = true;

        // Claim 이벤트 실행
        emit Claim(_campaignId, campaign.claimed, campaign.pledged);
    }

    function refund(uint256 _campaignId) external {
        // 캠페인 종료 여부 확인
        require(getIsEnded(_campaignId), "Campaign not ended");

        // 아이디와 기부 금액 가져오기
        uint256 bal = pledgeUserToAmount[_campaignId][msg.sender];

        // 기부 금액 초기화
        pledgeUserToAmount[_campaignId][msg.sender] = 0;

        // DAO 토큰 컨트랙트 -> 기부자
        daoToken.transfer(msg.sender, bal);

        // Refund 이벤트 실행
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
