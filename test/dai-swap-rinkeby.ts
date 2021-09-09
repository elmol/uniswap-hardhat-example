import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";
import { Token } from "@uniswap/sdk-core";
import { abi as ERC20 } from "@uniswap/v3-core/artifacts/contracts/interfaces/IERC20Minimal.sol/IERC20Minimal.json";
import { abi as NonfungiblePositionManager } from "@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";
import { MPHDAISwapper } from "../scripts/mph-dai-swapper";

export const MPH = new Token(1, "0xc79a56af51ec36738e965e88100e4570c5c77a93", 18, "MPH");
export const DAI = new Token(1, "0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea", 18, "DAI");

describe("DAISwap", function () {
  it("Should swap DAI/MPH after add liquidity in Rinkeby", async function () {
    console.log("-------------> Aprovisioning + Liquidity <--------------");

    //erc20 contracts
    const mph = new ethers.Contract(MPH.address, ERC20, hre.ethers.provider);
    const dai = new ethers.Contract(DAI.address, ERC20, hre.ethers.provider);

    const [user] = await ethers.getSigners(); //provider

    await logBalance("Before", user, DAI, dai);
    await logBalance("Before", user, MPH, mph);

    const fromMPH = "0xcef852aeabc2eab4f07150c6ef25a3defdfe45ef"; //address with mph
    await transferFromImpersonate(fromMPH, user, mph, "1000");

    const fromDAI = "0xdceb7c885ddb13152d13fd2e85590e63b394c160"; //address with dai
    await transferFromImpersonate(fromDAI, user, dai, "1000");

    // increse 100 dais
    const tokenId = 5573;
    const routerAddress = "0xc36442b4a4522e871399cd717abdd847ab11fe88";
    const nft = new ethers.Contract(routerAddress, NonfungiblePositionManager, hre.ethers.provider);
    await increaseLiquidity(tokenId, nft, 100, user);

    await logBalance("After", user, DAI, dai);
    await logBalance("After", user, MPH, mph);

    console.log("-------------<  Aprovisioning + Liquidity >--------------");

    console.log("======================> SWAP <=======================");
    await logBalance("Before", user, DAI, dai);
    await logBalance("Before", user, MPH, mph);

    const swapper = await MPHDAISwapper.create(user, hre.ethers.provider);
    const amountMPH = "10";
    await swapper.swap(amountMPH);

    const qDai = await logBalance("After", user, DAI, dai);
    const qUsdc = await logBalance("After", user, MPH, mph);
    console.log("======================< SWAP >=======================");

    expect(qDai).to.equal("1003.893025383122970651");
    expect(qUsdc).to.equal("988.388642755952132818");
  });
});

async function increaseLiquidity(tokenId: any, nft: any, dais: number, signer: any) {
  const relation = 0.0201516; // mph x dai
  const slippage = 0.995; // slippage 0.05%
  const amount = ethers.utils.parseUnits(dais.toString(), 18); //DAI
  const amount2 = ethers.utils.parseUnits((dais * relation).toString(), 18);
  const amount3 = ethers.utils.parseUnits((dais * slippage).toString(), 18);
  const amount4 = ethers.utils.parseUnits((dais * relation * slippage).toString(), 18);
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const tx = await nft.connect(signer).increaseLiquidity([tokenId, amount, amount2, amount3, amount4, deadline]);
  return await tx.wait();
}

function logDecimal(text: any, value: any, decimal: any) {
  const eth = ethers.utils.formatUnits(value, decimal).toString();
  console.log(text, ": ", eth);
  return eth;
}

async function logBalance(text: string, other: any, token: Token, contract: any) {
  return logDecimal(text + " " + other.address + " " + token.symbol, await contract.balanceOf(other.address), token.decimals);
}

async function transferFromImpersonate(from: any, to: any, tokenContract: any, amount: string) {
  //impersonate a DAI account with tokens
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [from],
  });

  const daiAccount = await ethers.getSigner(from);

  //adding some eth to perform the tx
  await hre.network.provider.send("hardhat_setBalance", [from, "0x87069576000000000"]);

  //tx
  const tx = await tokenContract.connect(daiAccount).transfer(to.address, ethers.utils.parseEther(amount));
  await tx.wait();

  //stop impersonate
  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [from],
  });
}
