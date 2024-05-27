// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {DaoInterface} from "./interface/DaoInterface.sol";
import {DaoTokenInterface} from "./interface/DaoTokenInterface.sol";
import {DonationInterface} from "./interface/DonationInterface.sol";
import {Initializable} from "./common/upgradeable/Initializable.sol";

contract Dao {
    ///////////// @notice 아래에 변수 추가 ////////////

    /// @notice Admin 주소

    /// @notice DAO 토큰 컨트랙트 주소

    /// @notice 기부 컨트랙트 주소

    /// @notice DAO 가입시 필요한 DAO 토큰 수량

    /// @notice DAO 멤버 리스트

    /// @notice 멤버십 신청자 목록

    ///////////// @notice 아래에 매핑 추가 ////////////

    /// @notice 주소 -> DAO 멤버 여부

    /// @notice 신청자 주소 -> DAO 멤버십 신청 승인 여부

    /// @notice 투표 아이디 -> 찬성 투표 수

    /// @notice 투표 아이디 -> 반대 투표 수

    /// @notice 투표 아이디 -> 투표 진행 여부

    /// @notice 투표 아이디 -> 투표자 주소 -> 투표 여부

    ///////////// @notice 아래에 modifier 추가 ////////////

    /// @notice DAO 멤버만 접근 가능하도록 설정

    /// @notice 관리자만 접근 가능하도록 설정

    function startVote(uint256 _campaignId) external {}

    function vote(uint256 _campaignId, bool agree) public {}

    function voteEnd(uint256 _campaignId) internal {}

    function requestDaoMembership() external {}

    function handleDaoMembership(address _user, bool _approve) external {}

    function removeDaoMembership(address _user) external {}

    ///////////// @notice 아래에 set함수 & get함수 추가 ////////////
}
