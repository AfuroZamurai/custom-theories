import { ExponentialCost, FreeCost, LinearCost } from "./api/Costs";
import { Localization } from "./api/Localization";
import { BigNumber } from "./api/BigNumber";
import { theory } from "./api/Theory";
import { Utils } from "./api/Utils";
import {log} from "../../TheorySDK.Win.1.4.41/api/Utils";
import {QuaternaryEntry} from "../../TheorySDK.Win.1.4.41/api/Theory";
import {FirstFreeCost} from "../../TheorySDK.Win.1.4.41/api/Costs";

var id = "series_theory";
var name = "Series Theory";
var description = "A serious theory to explore different series";
var authors = "AfuroZamurai";
var version = 1;

var currency;
var quaternaryEntries;
var n, a, s;

var lastR, lastZ;

var tauMultiplier = 1;
var publicationMultiplierExponent = 0.1;

var init = () => {
    currency = theory.createCurrency();

    quaternaryEntries = [];
    lastR = 0;
    lastZ = 0;

    theory.primaryEquationHeight = 60;
    theory.primaryEquationScale = 1;
    
    theory.secondaryEquationHeight = 80;
    theory.secondaryEquationScale = 1;

    ///////////////////
    // Regular Upgrades

    // n
    {
        let getDesc = (level) => "n=" + getN(level).toString();
        n = theory.createUpgrade(1, currency, new FirstFreeCost(new ExponentialCost(10, 8)));
        n.getDescription = (_) => Utils.getMath(getDesc(n.level));
        n.getInfo = (amount) => Utils.getMathTo(getDesc(n.level), getDesc(n.level + amount));
    }
    
    // a
    {
        let getDesc = (level) => "a=" + getA(level).toString();
        a = theory.createUpgrade(2, currency, new FirstFreeCost(new ExponentialCost(10, 4)));
        a.getDescription = (_) => Utils.getMath(getDesc(a.level));
        a.getInfo = (amount) => Utils.getMathTo(getDesc(a.level), getDesc(a.level + amount));
    }

    // s
    {
        let getDesc = (level) => "s=" + getS(level).toString();
        s = theory.createUpgrade(3, currency,  new ExponentialCost(15, 10));
        s.getDescription = (_) => Utils.getMath(getDesc(s.level));
        s.getInfo = (amount) => Utils.getMathTo(getDesc(s.level), getDesc(s.level + amount));
    }

    /////////////////////
    // Permanent Upgrades
    theory.createPublicationUpgrade(0, currency, 1e10);
    theory.createBuyAllUpgrade(1, currency, 1e15);
    theory.createAutoBuyerUpgrade(2, currency, 1e30);

    ///////////////////////
    //// Milestone Upgrades

    /////////////////
    //// Achievements

    ///////////////////
    //// Story chapters

    updateAvailability();
}

var updateAvailability = () => {

}

var postPublish = () => {
    lastR = 0;
    lastZ = 0;
}

var tick = (elapsedTime, multiplier) => {
    let dt = BigNumber.from(elapsedTime * multiplier);
    let bonus = theory.publicationMultiplier;
    
    var va = getA(a.level);
    
    var k = BigNumber.from(getN(n.level));
    log("k=" + k);
    var exponentialSum = k === BigNumber.ZERO ? BigNumber.ONE : BigNumber.from(Math.pow(1 + (1 / k), k));
    lastR = exponentialSum;
    
    var geometricSum = k === BigNumber.ZERO ? BigNumber.ONE : (va * (BigNumber.ONE - exponentialSum.pow(k + 1))) / (BigNumber.ONE - exponentialSum);
    log("S_n=" + geometricSum);

    var z = BigNumber.from(Math.pow(-1, k - 1) * (k / (k + 1)));
    lastZ = z;
    var polyLogarithm = k === BigNumber.ZERO ? BigNumber.ONE : z.abs().pow(k) / (k.pow(getS(s.level)));
    var inversePolyLogarithm = BigNumber.ONE / polyLogarithm;
    log("Li_s(z)=" + inversePolyLogarithm);

    var tickSum = bonus * dt * geometricSum * inversePolyLogarithm;
    currency.value += tickSum;

    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
    theory.invalidateTertiaryEquation();
    theory.invalidateQuaternaryValues();
}

var getPrimaryEquation = () => {
    let rhodot = "\\dot{\\rho} = ";
    let geometricSeries = "\\sum_{k = 0}^{n}ar^k";
    let polyLogarithm = "\\frac{1}{\\text{Li}_s(z)}";
    
    return rhodot + geometricSeries + " \\times " + polyLogarithm;
}

var getSecondaryEquation = () => {
    let polyLogarithm = "\\text{Li}_s(z) = \\sum_{k = 1}^{n}\\frac{z^k}{k^s}";
    let r = "r = \\sum_{k = 1}^{n}\\left(1+\\frac{1}{k}\\right)^k";
    return polyLogarithm + "\\ \\ \\ \\ \\ \\ \\ \\ \\ " + r;
}

var getTertiaryEquation = () => "z = \\left| \\sum_{k = 1}^{n}\\left(-1\\right)^{k-1}\\left(2-\\frac{1}{k}-\\frac{1}{k+1}\\right)\\right|";

var getQuaternaryEntries = () => {
    quaternaryEntries = [];
    quaternaryEntries.push(new QuaternaryEntry("r", lastR));
    quaternaryEntries.push(new QuaternaryEntry("z", lastZ));

    return quaternaryEntries;
}

var getPublicationMultiplier = (tau) => tauMultiplier * tau.pow(publicationMultiplierExponent);
var getPublicationMultiplierFormula = (symbol) => symbol + "^" + "{" + publicationMultiplierExponent + "}";
var getTau = () => tauMultiplier * currency.value;
var get2DGraphValue = () => currency.value.sign * (BigNumber.ONE + currency.value.abs()).log10().toNumber();


var getN = (level) => level;

var getA = (level) => BigNumber.TWO.pow(level);

var getS = (level) => Utils.getStepwisePowerSum(level, 2, 10, 0);

init();