const { expectRevert } = require("@openzeppelin/test-helpers");
const { expectRevertCustomError } = require("custom-error-test-helper");

const TokenDistribution = artifacts.require('TokenDistribution');
const TestERC = artifacts.require('TestToken');

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

contract("TokenDistribution", async (accounts) => {
    before(async function () {
        mintAmount = 100000;
        this.testERC20 = await TestERC.new(mintAmount);
        await this.testERC20.transfer(accounts[0], mintAmount);
    });

    it("test renounceOwnership disabled", async function () {
        TDC = await TokenDistribution.new();
        await TDC.renounceOwnership();
        assert.equal(accounts[0], await TDC.owner());
    });

    it("test successfully registerTokenDistribution", async function () {
        TDC = await TokenDistribution.new();
        await this.testERC20.transfer(TDC.address, 100);

        initialized = await TDC.initialized(this.testERC20.address);
        assert.equal(false, initialized);
        await TDC.registerTokenDistribution(
            this.testERC20.address,
            [accounts[1], accounts[2]],
            [70, 30],
            100
        );
        tds = await TDC.destinationAddresses(this.testERC20.address);
        assert.equal(true, await TDC.initialized(this.testERC20.address));
        assert.equal(accounts[1], tds[0]);
        assert.equal(accounts[2], tds[1]);
        assert.equal(70, await TDC.distributionShare(this.testERC20.address, accounts[1]));
        assert.equal(30, await TDC.distributionShare(this.testERC20.address, accounts[2]));
    });

    it("test failed registerTokenDistribution: OwnableUnauthorizedAccount", async function () {
        TDC = await TokenDistribution.new();
        await expectRevertCustomError(TDC, TDC.registerTokenDistribution(
            this.testERC20.address,
            [accounts[3], accounts[4]],
            [70, 30],
            100,
            { from: accounts[1] }),
            "OwnableUnauthorizedAccount",
        );
    });

    it("test failed registerTokenDistribution: TokenDistribution has been registered", async function () {
        TDC = await TokenDistribution.new();
        await this.testERC20.transfer(TDC.address, 100);
        await TDC.registerTokenDistribution(
            this.testERC20.address,
            [accounts[1], accounts[2]],
            [70, 30],
            100
        );

        await expectRevert(TDC.registerTokenDistribution(
            this.testERC20.address,
            [accounts[3], accounts[4]],
            [70, 30],
            100),
            "TokenDistribution: TokenDistribution has been registered"
        );
    });

    it("test failed registerTokenDistribution: destinationAddresses.length is different from destinationShare.length", async function () {
        TDC = await TokenDistribution.new();
        await this.testERC20.transfer(TDC.address, 100);
        await expectRevert(
            TDC.registerTokenDistribution(
                this.testERC20.address,
                [accounts[3], accounts[4]],
                [100],
                100
            ),
            "TokenDistribution: destinationAddresses.length is different from destinationShare.length"
        );
    });

    it("test failed registerTokenDistribution: destinationAddr is point to zero address", async function () {
        TDC = await TokenDistribution.new();
        await this.testERC20.transfer(TDC.address, 100);
        await expectRevert(TDC.registerTokenDistribution(
            this.testERC20.address,
            [accounts[3], ZERO_ADDRESS],
            [70, 30],
            100),
            "TokenDistribution: destinationAddr is point to zero address"
        );
    });

    it("test failed registerTokenDistribution: destinationShare is set to zero", async function () {
        TDC = await TokenDistribution.new();
        await this.testERC20.transfer(TDC.address, 100);
        await expectRevert(TDC.registerTokenDistribution(
            this.testERC20.address,
            [accounts[3], accounts[4]],
            [0, 100],
            100),
            "TokenDistribution: destinationShare is set to zero"
        );
    });

    it("test failed registerTokenDistribution: destinationShare already set", async function () {
        TDC = await TokenDistribution.new();
        await this.testERC20.transfer(TDC.address, 100);
        await expectRevert(TDC.registerTokenDistribution(
            this.testERC20.address,
            [accounts[3], accounts[3]],
            [70, 30],
            100),
            "TokenDistribution: destinationShare already set"
        );
    });

    it("test failed registerTokenDistribution: totalShare is different from baseShare setting", async function () {
        TDC = await TokenDistribution.new();
        await this.testERC20.transfer(TDC.address, 100);
        await expectRevert(TDC.registerTokenDistribution(
            this.testERC20.address,
            [accounts[3], accounts[4]],
            [10, 100],
            100),
            "TokenDistribution: totalShare is different from baseShare setting"
        );
    });

    it("test successfully withdrawAll", async function () {
        TDC = await TokenDistribution.new();
        await this.testERC20.transfer(TDC.address, 100);

        originalBalance = await this.testERC20.balanceOf(accounts[0]);
        await TDC.withdrawAll(this.testERC20.address);

        assert.equal(100, await this.testERC20.balanceOf(accounts[0]) - originalBalance);
    });

    it("test failed withdrawAll: OwnableUnauthorizedAccount", async function () {
        TDC = await TokenDistribution.new();
        await expectRevertCustomError(TDC, TDC.withdrawAll(
            this.testERC20.address,
            { from: accounts[1] }),
            "OwnableUnauthorizedAccount",
        );
    });

    it("test failed withdrawAll: withdrawing 0 balance token", async function () {
        TDC = await TokenDistribution.new();
        await expectRevert(TDC.withdrawAll(this.testERC20.address),
            "TokenDistribution: withdrawing 0 balance token"
        );
    });

    it("test successfully distribute", async function () {
        originalBalanceAcc1 = await this.testERC20.balanceOf(accounts[1])
        originalBalanceAcc2 = await this.testERC20.balanceOf(accounts[2])
        TDC = await TokenDistribution.new();
        await this.testERC20.transfer(TDC.address, 100);

        await TDC.registerTokenDistribution(
            this.testERC20.address,
            [accounts[1], accounts[2]],
            [70, 30],
            100
        );
        await TDC.distribute(this.testERC20.address);

        assert.equal(70, await this.testERC20.balanceOf(accounts[1]) - originalBalanceAcc1);
        assert.equal(30, await this.testERC20.balanceOf(accounts[2]) - originalBalanceAcc2);
    });

    it("test failed distribute: TokenDistribution not registered yet", async function () {
        TDC = await TokenDistribution.new();
        await this.testERC20.transfer(TDC.address, 100);

        await expectRevert(TDC.distribute(this.testERC20.address),
            "TokenDistribution: TokenDistribution not registered yet"
        );
    });

    it("test failed distribute: distributing 0 balance token", async function () {
        TDC = await TokenDistribution.new();

        await TDC.registerTokenDistribution(
            this.testERC20.address,
            [accounts[1], accounts[2]],
            [70, 30],
            100
        );

        await expectRevert(TDC.distribute(this.testERC20.address),
            "TokenDistribution: distributing 0 balance token"
        );
    });
});
