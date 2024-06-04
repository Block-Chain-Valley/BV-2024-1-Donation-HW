// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {DaoInterface} from "./interface/DaoInterface.sol";
import {DaoTokenInterface} from "./interface/DaoTokenInterface.sol";
import {DonationInterface} from "./interface/DonationInterface.sol";
import {Initializable} from "./common/upgradeable/Initializable.sol";

contract Dao is DaoInterface, Initializable {
    /// @notice Admin 주소
    address public admin;

    /// @notice DAO 토큰 주소
    DaoTokenInterface public daoToken;

    /// @notice 기부 컨트랙트 주소
    DonationInterface public donation;

    /// @notice DAO 가입시 필요한 DAO 토큰 수량
    uint256 public daoMembershipAmount;

    /// @notice DAO 멤버 리스트
    address[] public daoMemberList;

    /// @notice 주소 -> DAO 멤버 여부
    mapping(address => bool) public isDaoMember;

    /// @notice 멤버십 신청자 목록
    address[] public membershipRequests;

    /// @notice 신청자 주소 -> DAO 멤버십 신청 승인 여부
    mapping(address => MembershipRequestStatusCode) public membershipRequestStatus;

    /// @notice 투표 아이디 -> 찬성 투표 수
    mapping(uint256 => uint256) public voteCountYes;

    /// @notice 투표 아이디 -> 반대 투표 수
    mapping(uint256 => uint256) public voteCountNo;

    /// @notice 투표 아이디 -> 투표 진행 여부
    mapping(uint256 => bool) public voteInProgress;

    /// @notice 투표 아이디 -> 투표자 주소 -> 투표 여부
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    /// @notice storage gap for upgrading contract
    /// @dev warning: should reduce the appropriate number of slots when adding storage variables
    /// @dev resources: https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable
    uint256[50] private __gap;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(DonationInterface _donation, DaoTokenInterface _daoToken) public initializer {
        admin = msg.sender;
        donation = _donation;
        daoToken = _daoToken;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyDaoMember(address caller) {
        require(isDaoMember[caller], "Only DAO members can perform this action");
        _;
    }

    function startVote(uint256 _campaignId) external {
        require(!voteInProgress[_campaignId], "A vote is already in progress for this campaign.");

        uint256 goalAmount = donation.getCampaignGoal(_campaignId);
        uint256 totalAmount = donation.getCampaignTotalAmount(_campaignId);

        voteCountYes[_campaignId] = 0;
        voteCountNo[_campaignId] = 0;
        voteInProgress[_campaignId] = true;

        emit VoteStarted(_campaignId, goalAmount, totalAmount);
    }

    function vote(uint256 _campaignId, bool agree) public onlyDaoMember(msg.sender) {
        require(voteInProgress[_campaignId], "No vote in progress for this campaign.");
        require(!hasVoted[_campaignId][msg.sender], "You have already voted.");

        hasVoted[_campaignId][msg.sender] = true;
        agree ? voteCountYes[_campaignId] += 1 : voteCountNo[_campaignId] += 1;

        if (voteCountYes[_campaignId] + voteCountNo[_campaignId] == daoMemberList.length) {
            voteEnd(_campaignId);
        }
        emit Voted(_campaignId, msg.sender, agree);
    }

    function voteEnd(uint256 _campaignId) internal {
        uint256 totalVotes = voteCountYes[_campaignId] + voteCountNo[_campaignId];
        uint256 agreePercentage = (voteCountYes[_campaignId] * 1e18) / totalVotes;

        voteInProgress[_campaignId] = false;

        if (agreePercentage >= 0.7 * 1e18) {
            donation.claim(_campaignId);
            emit VoteEnded(_campaignId, true, agreePercentage, "The campaign has been approved for claim.");
        } else {
            emit VoteEnded(_campaignId, false, agreePercentage, "The campaign was declined for claim.");
        }
    }

    function requestDaoMembership() external {
        require(!isDaoMember[msg.sender], "User is already a DAO member");
        require(daoToken.balanceOf(msg.sender) >= daoMembershipAmount, "Insufficient DAO tokens");

        membershipRequests.push(msg.sender);
        membershipRequestStatus[msg.sender] = MembershipRequestStatusCode.PENDING;

        emit DaoMembershipRequested(msg.sender, "User has requested DAO membership");
    }

    function handleDaoMembership(address _user, bool _approve) external onlyAdmin {
        if (_approve) {
            membershipRequestStatus[_user] = MembershipRequestStatusCode.APPROVED;

            daoMemberList.push(_user);
            isDaoMember[_user] = true;

            emit DaoMembershipApproved(_user, "User has been approved as a DAO member");
        } else {
            membershipRequestStatus[_user] = MembershipRequestStatusCode.REJECTED;
            emit DaoMembershipRejected(_user, "User has been rejected as a DAO member");
        }
    }

    function removeDaoMembership(address _user) external {
        require(isDaoMember[_user], "User is not a DAO member");

        isDaoMember[_user] = false;
        for (uint256 i = 0; i < daoMemberList.length; i++) {
            if (daoMemberList[i] == _user) {
                daoMemberList[i] = daoMemberList[daoMemberList.length - 1];
                daoMemberList.pop();
                break;
            }
        }

        emit DaoMembershipRemoved(_user, "User has been removed from DAO membership");
    }

    function getMembershipRequests() external view onlyAdmin returns (address[] memory) {
        return membershipRequests;
    }

    function getDaoList() external view onlyAdmin returns (address[] memory) {
        return daoMemberList;
    }
}
