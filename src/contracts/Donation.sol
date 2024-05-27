// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interface/DaoTokenInterface.sol";
import "./interface/DaoInterface.sol";
import "./interface/DonationInterface.sol";

contract Donation {
    ///////////// @notice 아래에 변수 추가 ////////////

    /// @notice Admin 주소

    /// @notice 캠페인 아이디 카운트

    /// @notice DAO 토큰 컨트랙트 주소

    ///////////// @notice 아래에 매핑 추가 ////////////

    /// @notice 캠페인 아이디 -> 캠페인 구조체

    /// @notice 캠페인 아이디 -> 사용자 주소 -> 기부 금액

    ///////////// @notice 아래에 생성자 및 컨트랙트 주소 설정 ////////////

    /// @notice 관리자 및 DAO Token 컨트랙트 주소 설정

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
    ) external {}

    function cancel(uint256 _campaignId) external {}

    function pledge(uint256 _campaignId, uint256 _amount) external {}

    function unpledge(uint256 _campaignId, uint256 _amount) external {}

    //2. onlyDao modifier 추가
    function claim(uint256 _campaignId) external {}

    function refund(uint256 _campaignId) external {}

    ///////////// @notice 아래에 get함수는 필요한 경우 주석을 해제해 사용해주세요 ////////////

    // function getIsEnded(uint256 _campaignId) public view returns (bool) {
    //     Campaign memory campaign = campaigns[_campaignId];
    //     return block.timestamp >= campaign.endAt || campaign.pledged >= campaign.goal;
    // }

    // function getCampaign(uint256 _campaignId) external view returns (Campaign memory) {
    //     return campaigns[_campaignId];
    // }

    // function getCampaignCreator(uint256 _campaignId) external view returns (address) {
    //     return campaigns[_campaignId].creator;
    // }

    // function getCampaignGoal(uint256 _campaignId) external view returns (uint256) {
    //     return campaigns[_campaignId].goal;
    // }

    // function getCampaignTotalAmount(uint256 _campaignId) external view returns (uint256) {
    //     return campaigns[_campaignId].pledged;
    // }
}
