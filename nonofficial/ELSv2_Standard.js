import { ExponentialCost, FreeCost, LinearCost } from "./api/Costs";
import { Localization } from "./api/Localization";
import { BigNumber } from "./api/BigNumber";
import { theory } from "./api/Theory";
import { Utils } from "./api/Utils";

var id = "exponential_limit_series_custom_theory";
var name = "Exponential Limit Series";
var description = "A theory to explore the beloved main formula from a different angle";
var authors = "AfuroZamurai";
var version = 2;

let GOLDEN_RATIO = 1.618;
let q1Exp = 0.1;

var currency;
var q1, q2, k, n;
var m_q1Exp;

var prevK, prevN, cachedSummation;

//DEBUG
var printLog;

var init = () => {
    currency = theory.createCurrency();

    theory.primaryEquationHeight = 100;
    theory.primaryEquationScale = 1.2;

    printLog = true;
    prevK = 0;
    prevN = 0;
    cachedSummation = 0;

    ///////////////////
    // Regular Upgrades

    // q1
    {
        let getDesc = (level) => "q_1=" + getQ1(level).toString(0);
        let getInfo = (level) => "q_1=" + getQ1(level).toString(0);
        q1 = theory.createUpgrade(0, currency, new FirstFreeCost(new ExponentialCost(10, Math.log2(1.61328))));
        q1.getDescription = (amount) => Utils.getMath(getDesc(q1.level));
        q1.getInfo = (amount) => Utils.getMathTo(getInfo(q1.level), getInfo(q1.level + amount));
    }
    
    // q2
    {
        let getDesc = (level) => "q_2=2^{" + level + "}";
        let getInfo = (level) => "q_2=" + getQ2(level).toString(0);
        q2 = theory.createUpgrade(1, currency, new ExponentialCost(15, Math.log2(32)));
        q2.getDescription = (amount) => Utils.getMath(getDesc(q2.level));
        q2.getInfo = (amount) => Utils.getMathTo(getInfo(q2.level), getInfo(q2.level + amount));
    }

    // n
    {
        let getDesc = (level) => "n=" + getN(level).toString();
        n = theory.createUpgrade(2, currency, new FirstFreeCost(new ExponentialCost(10, Math.log2(GOLDEN_RATIO))));
        n.getDescription = (_) => Utils.getMath(getDesc(n.level));
        n.getInfo = (amount) => Utils.getMathTo(getDesc(n.level), getDesc(n.level + amount));
    }

    // k
    {
        let getDesc = (level) => "k=" + getK(level).toString();
        k = theory.createUpgrade(3, currency, new ExponentialCost(15, Math.log2(BigNumber.E)));
        k.getDescription = (_) => Utils.getMath(getDesc(k.level));
        k.getInfo = (amount) => Utils.getMathTo(getDesc(k.level), getDesc(k.level + amount));
    }

    /////////////////////
    // Permanent Upgrades
    theory.createPublicationUpgrade(0, currency, 1e10);
    theory.createBuyAllUpgrade(1, currency, 1e15);
    theory.createAutoBuyerUpgrade(2, currency, 1e30);

    ///////////////////////
    //// Milestone Upgrades
    
    theory.setMilestoneCost(new LinearCost(20, 20));

    {
        m_q1Exp = theory.createMilestoneUpgrade(0, 5);
        m_q1Exp.description = Localization.getUpgradeIncCustomExpDesc("q_1", `${q1Exp}`);
        m_q1Exp.info = Localization.getUpgradeIncCustomExpInfo("q_1", `${q1Exp}`);
        m_q1Exp.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation();
    }

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
    let vq1 = getQ1(q1.level).pow(getQ1Exp(m_q1Exp.level));
    let vq2 = getQ2(q2.level);
    var exponentialSum = getSummation(n.level);
    var tickSum = bonus * dt * vq1 * vq2 * exponentialSum;
    currency.value += tickSum;
    //printLog = true;
    debugLog("added " + bonus + " * " + dt + " * " + vq1 + " * " + vq2 + " * " + exponentialSum + " = " + tickSum);
    theory.invalidateSecondaryEquation();
    printLog = false;
}

var getPrimaryEquation = () => {
    let result = "\\dot{\\rho} = q_1";
    if (m_q1Exp.level > 0) 
        result += `^{${1 + m_q1Exp.level * q1Exp}}`;
    
    result += "q_2\\sqrt{s} \\qquad s=\\sum_{j = 1}^{n}\\left(1+\\frac{k}{j}\\right)^j";
    return result;
}

var getSecondaryEquation = () => {
    let q1q2 = "q_1";
    if (m_q1Exp.level > 0) 
        q1q2 += `^{${1 + m_q1Exp.level * q1Exp}}`;
    q1q2 += "q_2 = " + getQ1(q1.level).pow(getQ1Exp(m_q1Exp.level)) * getQ2(q2.level);
    return q1q2;
}
var getTertiaryEquation = () => theory.latexSymbol + "=\\max\\rho";
var getPublicationMultiplier = (tau) => tau.pow(0.164) / BigNumber.THREE;
var getPublicationMultiplierFormula = (symbol) => "\\frac{{" + symbol + "}^{0.164}}{3}";
var getTau = () => currency.value;
var get2DGraphValue = () => currency.value.sign * (BigNumber.ONE + currency.value.abs()).log10().toNumber();

var getQ1 = (level) => Utils.getStepwisePowerSum(level, 2, 10, 0);
var getQ1Exp = (level) => BigNumber.from(1 + level * q1Exp);

var getQ2 = (level) => BigNumber.TWO.pow(level);

var getK = (level) => level;
var getN = (level) => level;

var computeSummation = (limit, prevLimit, all) => {
    var sum = all ? 0 : cachedSummation;
    var startIndex = all ? 1 : prevLimit + 1;

    for (var i = startIndex; i <= limit; i++) {
        var res = BigNumber.from(1 + (getK(k.level)/i)).pow(i);
        sum += res;
    }

    return sum;
}

var getSummation = (limit) => {
    var sum = cachedSummation;

    debugLog(cachedSummation + " " + prevK + " " + prevN);

    if(k.level > prevK) {
        sum = computeSummation(limit, prevN, true);
        cachedSummation = sum;
        prevK = k.level;
        prevN = limit;
        return BigNumber.from(sum).sqrt();
    }

    if(limit > prevN) {
        sum += computeSummation(limit, prevN, false);
        cachedSummation = sum;
        prevN = limit;
    }

    return BigNumber.from(sum).sqrt();
}

var debugLog = (message) => {
    if(printLog)
        log(message)
}

init();