import { ExponentialCost, FreeCost, LinearCost } from "./api/Costs";
import { Localization } from "./api/Localization";
import { BigNumber } from "./api/BigNumber";
import { theory } from "./api/Theory";
import { Utils } from "./api/Utils";

var id = "exponential_limit_series_custom_theory";
var name = "Exponential Limit Series";
var description = "A theory to explore the beloved main formula from a different angle";
var authors = "AfuroZamurai";
var version = 1;

var currency;
var k, n;

//DEBUG
var printLog;

var init = () => {
    currency = theory.createCurrency();

    theory.primaryEquationHeight = 70;
    theory.primaryEquationScale = 1.2;

    printLog = true;

    ///////////////////
    // Regular Upgrades

    // n
    {
        let getDesc = (level) => "n=" + getN(level).toString();
        n = theory.createUpgrade(0, currency, new FirstFreeCost(new ExponentialCost(15, Math.log2(1.618))));
        n.getDescription = (_) => Utils.getMath(getDesc(n.level));
        n.getInfo = (amount) => Utils.getMathTo(getDesc(n.level), getDesc(n.level + amount));
    }

    // k
    {
        let getDesc = (level) => "k=" + getK(level).toString();
        k = theory.createUpgrade(1, currency, new ExponentialCost(100, Math.log2(BigNumber.E)));
        k.getDescription = (_) => Utils.getMath(getDesc(k.level));
        k.getInfo = (amount) => Utils.getMathTo(getDesc(k.level), getDesc(k.level + amount));
    }

    /////////////////////
    // Permanent Upgrades
    theory.createPublicationUpgrade(0, currency, 1e10);
    theory.createBuyAllUpgrade(1, currency, 1e20);
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

var tick = (elapsedTime, multiplier) => {
    let dt = BigNumber.from(elapsedTime * multiplier);
    let bonus = theory.publicationMultiplier;
    var exponentialSum = getSum(n.level);
    var tickSum = bonus * dt * exponentialSum;
    currency.value += tickSum;
    //printLog = true;
    debugLog("added " + bonus + " * " + dt + " * " + exponentialSum + " = " + tickSum);
    theory.invalidateSecondaryEquation();
    printLog = false;
}

var getPrimaryEquation = () => {
    let result = "\\dot{\\rho} = \\sum_{x = 1}^{n}\\left(1+\\frac{k}{x}\\right)^x";
    return result;
}

var getSecondaryEquation = () => "k = " + getK(k.level) + "\\qquad n = " + getN(n.level);
var getTertiaryEquation = () => theory.latexSymbol + "=\\max\\rho";
var getPublicationMultiplier = (tau) => tau.pow(0.164) / BigNumber.THREE;
var getPublicationMultiplierFormula = (symbol) => "\\frac{{" + symbol + "}^{0.164}}{3}";
var getTau = () => currency.value;
var get2DGraphValue = () => currency.value.sign * (BigNumber.ONE + currency.value.abs()).log10().toNumber();

var getK = (level) => level;
var getN = (level) => level;
var getSum = (limit) => {
    var sum = 0;
    for (var i = 1; i <= limit; i++) {
        var res = BigNumber.from(1 + (getK(k.level)/i)).pow(i);
        sum += res;
    }
    return sum;
}

var debugLog = (message) => {
    if(printLog)
        log(message)
}

init();