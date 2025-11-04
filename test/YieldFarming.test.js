const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("YieldFarming", function () {
  let yieldFarming;
  let owner;
  let addr1;
  let addr2;
  let mockToken;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const YieldFarming = await ethers.getContractFactory("YieldFarming");
    yieldFarming = await YieldFarming.deploy();
    await yieldFarming.deployed();

    // Deploy a mock ERC20 token for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("MockToken", "MTK");
    await mockToken.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await yieldFarming.owner()).to.equal(owner.address);
    });

    it("Should have the correct name and symbol", async function () {
      expect(await yieldFarming.name()).to.equal("YieldToken");
      expect(await yieldFarming.symbol()).to.equal("YIELD");
    });

    it("Should mint initial tokens to owner", async function () {
      expect(await yieldFarming.balanceOf(owner.address)).to.equal(
        ethers.utils.parseEther("1000000")
      );
    });
  });

  describe("Pool Creation", function () {
    it("Should allow owner to create pools", async function () {
      await yieldFarming.createPool(mockToken.address, ethers.utils.parseEther("1"));
      
      const pool = await yieldFarming.pools(0);
      expect(pool.tokenAddress).to.equal(mockToken.address);
      expect(pool.rewardRate).to.equal(ethers.utils.parseEther("1"));
      expect(pool.isActive).to.be.true;
    });

    it("Should not allow non-owner to create pools", async function () {
      await expect(
        yieldFarming.connect(addr1).createPool(mockToken.address, ethers.utils.parseEther("1"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Staking", function () {
    beforeEach(async function () {
      await yieldFarming.createPool(mockToken.address, ethers.utils.parseEther("1"));
      await mockToken.approve(yieldFarming.address, ethers.utils.parseEther("100"));
    });

    it("Should allow users to stake tokens", async function () {
      await yieldFarming.connect(addr1).stake(0, ethers.utils.parseEther("10"));
      
      expect(await yieldFarming.stakedAmount(addr1.address)).to.equal(ethers.utils.parseEther("10"));
      expect(await yieldFarming.pools(0)).to.have.property("totalStaked");
    });

    it("Should not allow staking more than balance", async function () {
      await expect(
        yieldFarming.connect(addr1).stake(0, ethers.utils.parseEther("1000"))
      ).to.be.reverted;
    });
  });
});

// Mock ERC20 contract for testing
contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    string public name = "MockToken";
    string public symbol = "MTK";
    uint8 public decimals = 18;
    uint256 public totalSupply = 1000000 * 10**18;
    
    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
        balanceOf[msg.sender] = totalSupply;
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        return true;
    }
    
    function transfer(address to, uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        return true;
    }
}
