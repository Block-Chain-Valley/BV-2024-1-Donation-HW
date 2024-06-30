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

    /// @notice storage gap for upgrading contract
    /// @dev warning: should reduce the appropriate number of slots when adding storage variables
    /// @dev resources: https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable
    uint256[50] private __gap;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    ///////////// @notice 아래에 modifier 추가 ////////////

    /// @notice DAO 멤버만 접근 가능하도록 설정
    modifier onlyDaoMember() {
        require(isDaoMember[msg.sender], "Only Dao members can perform this action");
        _;
    }

    /// @notice 관리자만 접근 가능하도록 설정
    modifier onlyAdmin() {
        require(admin == msg.sender, "Only admin can perform this action");
        _;
    }

    function initialize(DonationInterface _donation, DaoTokenInterface _daoToken) public initializer {
        admin = msg.sender;
        donation = _donation;
        daoToken = _daoToken;
    }

    function startVote(uint256 _campaignId) external {}

    function vote(uint256 _campaignId, bool agree) public {}

    function voteEnd(uint256 _campaignId) internal {}

    function requestDaoMembership() external {}

    function handleDaoMembership(address _user, bool _approve) external {}

    function removeDaoMembership(address _user) external {}

    ///////////// @notice 아래에 set함수 & get함수 추가 ////////////
    function getMembershipRequests() external view onlyAdmin returns (address[] memory) {
        return membershipRequests;
    }

    function getDaoList() external view onlyAdmin returns (address[] memory) {
        return daoMemberList;
    }
}
