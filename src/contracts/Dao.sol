// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {DaoInterface} from "./interface/DaoInterface.sol";
import {DaoTokenInterface} from "./interface/DaoTokenInterface.sol";
import {DonationInterface} from "./interface/DonationInterface.sol";
import {Initializable} from "./common/upgradeable/Initializable.sol";

contract Dao is DaoInterface, Initializable {
    ///////////// @notice 아래에 변수 추가 ////////////

    /// @notice Admin 주소
    address public admin;
    /// @notice DAO 토큰 컨트랙트 주소
    DaoTokenInterface public daoToken;
    /// @notice 기부 컨트랙트 주소
    DonationInterface public donation;
    /// @notice DAO 가입시 필요한 DAO 토큰 수량
    uint256 public daoMembershipAmount;
    /// @notice DAO 멤버 리스트
    address[] public daoMemberList;
    /// @notice 멤버십 신청자 목록
    address[] public membershipRequests;
    ///////////// @notice 아래에 매핑 추가 ////////////

    /// @notice 주소 -> DAO 멤버 여부
    mapping(address => bool) public isDaoMember;
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
    uint256[50] private __gap;

    ///////////// @notice 아래에 modifier 추가 ////////////

    /// @notice DAO 멤버만 접근 가능하도록 설정
    modifier onlyDaoMember() {
        require(isDaoMember[msg.sender], "Only Dao members can perform this action");
        _;
    }

    /// @notice 관리자만 접근 가능하도록 설정
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can mint tokens");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(DonationInterface _donation, DaoTokenInterface _daoToken) public initializer {
        admin = msg.sender;
        donation = _donation;
        daoToken = _daoToken;
    }

    function startVote(uint256 _campaignId) external {
        uint256 goalAmount = donation.getCampaignGoal(_campaignId);
        uint256 totalAmount = donation.getCampaignTotalAmount(_campaignId);

        voteCountYes[_campaignId] = 0;
        voteCountNo[_campaignId] = 0;
        voteInProgress[_campaignId] = true;

        emit VoteStarted(_campaignId, goalAmount, totalAmount);
    }

    function vote(uint256 _campaignId, bool _agree) public onlyDaoMember {
        require(voteInProgress[_campaignId], "No vote in progress for this campaign");
        require(!hasVoted[_campaignId][msg.sender], "You have already voted");

        hasVoted[_campaignId][msg.sender] = true;
        _agree ? voteCountYes[_campaignId] += 1 : voteCountNo[_campaignId] += 1;

        if (voteCountYes[_campaignId] + voteCountNo[_campaignId] == daoMemberList.length) {
            voteEnd(_campaignId);
        }

        emit Voted(_campaignId, msg.sender, _agree);
    }

    function voteEnd(uint256 _campaignId) internal {
        uint256 DECIMAL_PRECISION = 1e18;
        uint256 agreePercentage = (100 * DECIMAL_PRECISION * voteCountYes[_campaignId]) / daoMemberList.length;
        string memory approveMessage = "The campaign has been approved for claim.";
        string memory rejectMessage = "he campaign was declined for claim.";

        voteInProgress[_campaignId] = false;

        uint256 threshold = 70 * DECIMAL_PRECISION;

        if (agreePercentage >= threshold) {
            donation.claim(_campaignId);
            emit VoteEnded(_campaignId, true, agreePercentage, approveMessage);
        } else {
            emit VoteEnded(_campaignId, false, agreePercentage, rejectMessage);
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
                if (i < daoMemberList.length - 1) {
                    daoMemberList[i] = daoMemberList[daoMemberList.length - 1];
                }
                daoMemberList.pop();
                break;
            }
        }

        emit DaoMembershipRemoved(_user, "User has been removed from DAO membership");
    }

    ///////////// @notice 아래에 set함수 & get함수 추가 ////////////

    function getMembershipRequests() external view onlyAdmin returns (address[] memory) {
        return membershipRequests;
    }

    function getDaoList() external view onlyAdmin returns (address[] memory) {
        return daoMemberList;
    }
}
