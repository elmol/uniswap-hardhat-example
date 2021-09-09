import { Token } from "@uniswap/sdk-core";
import { FeeAmount } from "@uniswap/v3-sdk";
import { BigNumber, ethers } from "ethers";
import { abi as ERC20 } from "@uniswap/v3-core/artifacts/contracts/interfaces/IERC20Minimal.sol/IERC20Minimal.json";
import { abi as ISwapRouter } from "@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json";

export const MPH = new Token(1, "0xc79a56af51ec36738e965e88100e4570c5c77a93", 18, "MPH");
export const DAI = new Token(1, "0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea", 18, "DAI");

const routerAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

export class MPHDAISwapper {
  private readonly signer: any;
  private readonly mph: any; //mph contract
  private readonly router: any;

  constructor(signer: any, mph: any, router: any) {
    this.signer = signer;
    this.mph = mph;
    this.router = router;
  }

  //execute swap
  async swap(mphAmout: string) {
    const amount = ethers.utils.parseEther(mphAmout) as BigNumber;

    await this.approve(amount);

    const parameters = [
      MPH.address,
      DAI.address,
      FeeAmount.MEDIUM,
      this.signer.address,
      Math.floor(Date.now() / 1000) + 60 * 20, //20 minutes
      amount,
      0,
      0,
    ];
    const tx = await this.router.connect(this.signer).exactInputSingle(parameters);
    return await tx.wait();
  }

  //approve router to spend
  async approve(amount: any) {
    const tx = await this.mph.connect(this.signer).approve(this.router.address, amount.mul(2));
    return await tx.wait();
  }

  static async create(signer: any, provider: any) {
    const router = new ethers.Contract(routerAddress, ISwapRouter, provider);
    const mph = new ethers.Contract(MPH.address, ERC20, provider);
    return new MPHDAISwapper(signer, mph, router);
  }

}