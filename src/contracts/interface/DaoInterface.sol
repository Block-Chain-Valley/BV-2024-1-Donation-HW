// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface DaoInterface {
    enum MembershipRequestStatusCode {
        DEFAULT,
        PENDING,
        APPROVED,
        REJECTED
    }

    function startVote(uint256 _campaignId) external;

    function vote(uint256 _campaignId, bool _agree) external;

    function requestDaoMembership() external;

    function handleDaoMembership(address _user, bool _approve) external;

    function removeDaoMembership(address _user) external;

    function getMembershipRequests() external view returns (address[] memory);

    function getDaoList() external view returns (address[] memory);

    event VoteStarted(uint256 indexed campaignId, uint256 goalAmount, uint256 totalAmount);

    event Voted(uint256 indexed campaignId, address voter, bool agree);

    event VoteEnded(uint256 indexed campaignId, bool indexed result, uint256 agreePercentage, string message);

    event DaoMembershipRequested(address indexed user, string message);

    event DaoMembershipApproved(address indexed user, string message);

    event DaoMembershipRejected(address indexed user, string message);

    event DaoMembershipRemoved(address indexed user, string message);
}
