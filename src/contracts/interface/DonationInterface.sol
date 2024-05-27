// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface DonationInterface {
    struct Campaign {
        address creator;
        address target;
        string title;
        string description;
        uint256 goal;
        uint256 pledged;
        uint32 startAt;
        uint32 endAt;
        bool claimed;
    }

    /// @notice donation 주요 기능
    function launch(
        address _target,
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint32 _startAt,
        uint32 _endAt
    ) external virtual;

    function cancel(uint256 _campaignId) external;

    function pledge(uint256 _campaignId, uint256 _amount) external;

    function unpledge(uint256 _campaignId, uint256 _amount) external;

    function claim(uint256 _campaignId) external;

    function refund(uint256 _campaignId) external;

    /// @notice 캠페인 정보를 조회
    function getCampaign(uint256 _campaignId) external view returns (Campaign memory);

    function getIsEnded(uint256 _campaignId) external view returns (bool);

    function getCampaignCreator(uint256 _campaignId) external view returns (address);

    function getCampaignGoal(uint256 _campaignId) external view returns (uint256);

    function getCampaignTotalAmount(uint256 _campaignId) external view returns (uint256);

    event Launch(uint256 campaignId, Campaign launchedCampaign);

    event Cancel(uint256 indexed campaignId);

    event Pledge(uint256 indexed campaignId, address indexed caller, uint256 amount, uint256 totalAmount);

    event Unpledge(uint256 indexed campaignId, address indexed caller, uint256 amount, uint256 totalAmount);

    event Claim(uint256 indexed campaignId, bool claimed, uint256 amount);

    event Refund(uint256 indexed campaignId, address indexed caller, uint256 amount);
}
