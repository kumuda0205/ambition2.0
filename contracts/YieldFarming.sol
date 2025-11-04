// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract YieldFarming is ERC20, Ownable, ReentrancyGuard {
    struct Pool {
        address tokenAddress;
        uint256 totalStaked;
        uint256 rewardRate;
        uint256 lastUpdateTime;
        bool isActive;
    }

    mapping(address => uint256) public stakedAmount;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public lastStakeTime;
    
    Pool[] public pools;
    uint256 public constant REWARD_PER_SECOND = 1 ether;

    event Staked(address indexed user, uint256 amount, uint256 poolId);
    event Unstaked(address indexed user, uint256 amount, uint256 poolId);
    event RewardsClaimed(address indexed user, uint256 amount);

    constructor() ERC20("YieldToken", "YIELD") Ownable(msg.sender) {
        _mint(msg.sender, 1000000 * 10**18); // 1M tokens
    }

    function createPool(address tokenAddress, uint256 rewardRate) external onlyOwner {
        pools.push(Pool({
            tokenAddress: tokenAddress,
            totalStaked: 0,
            rewardRate: rewardRate,
            lastUpdateTime: block.timestamp,
            isActive: true
        }));
    }

    function stake(uint256 poolId, uint256 amount) external nonReentrant {
        require(poolId < pools.length, "Invalid pool");
        require(pools[poolId].isActive, "Pool inactive");
        require(amount > 0, "Amount must be greater than 0");

        // Update rewards before staking
        _updateRewards(msg.sender, poolId);

        // Transfer tokens to contract
        IERC20(pools[poolId].tokenAddress).transferFrom(msg.sender, address(this), amount);
        
        stakedAmount[msg.sender] += amount;
        pools[poolId].totalStaked += amount;
        lastStakeTime[msg.sender] = block.timestamp;

        emit Staked(msg.sender, amount, poolId);
    }

    function unstake(uint256 poolId, uint256 amount) external nonReentrant {
        require(poolId < pools.length, "Invalid pool");
        require(amount <= stakedAmount[msg.sender], "Insufficient staked amount");

        // Update rewards before unstaking
        _updateRewards(msg.sender, poolId);

        stakedAmount[msg.sender] -= amount;
        pools[poolId].totalStaked -= amount;

        // Transfer tokens back to user
        IERC20(pools[poolId].tokenAddress).transfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount, poolId);
    }

    function claimRewards() external nonReentrant {
        uint256 totalRewards = 0;
        for (uint256 i = 0; i < pools.length; i++) {
            totalRewards += _updateRewards(msg.sender, i);
        }
        
        require(totalRewards > 0, "No rewards to claim");
        rewards[msg.sender] = 0;
        _mint(msg.sender, totalRewards);
        
        emit RewardsClaimed(msg.sender, totalRewards);
    }

    function _updateRewards(address user, uint256 poolId) internal returns (uint256) {
        if (stakedAmount[user] == 0) return 0;
        
        uint256 timeElapsed = block.timestamp - lastStakeTime[user];
        uint256 userRewards = (stakedAmount[user] * timeElapsed * pools[poolId].rewardRate) / 1e18;
        
        rewards[user] += userRewards;
        lastStakeTime[user] = block.timestamp;
        
        return userRewards;
    }

    function getTotalRewards(address user) external view returns (uint256) {
        uint256 totalRewards = rewards[user];
        for (uint256 i = 0; i < pools.length; i++) {
            if (stakedAmount[user] > 0) {
                uint256 timeElapsed = block.timestamp - lastStakeTime[user];
                totalRewards += (stakedAmount[user] * timeElapsed * pools[i].rewardRate) / 1e18;
            }
        }
        return totalRewards;
    }
}
