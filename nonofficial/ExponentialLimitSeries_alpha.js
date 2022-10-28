import { ExponentialCost, FreeCost, LinearCost } from "./api/Costs";
import { Localization } from "./api/Localization";
import { BigNumber } from "./api/BigNumber";
import { theory } from "./api/Theory";
import { Utils } from "./api/Utils";

/////////////////////////////////////////
// Metadata

var id = "exponential_limit_series_alpha";
var name = "Exponential Limit Series (Alpha)";
var description = "A theory to explore the beloved main formula from a different angle. Beware: this is an alpha version, so it is neither balanced nor complete." +
" It might get breaking changes all the time.";
var authors = "AfuroZamurai";
var version = 1;

/////////////////////////////////////////
// Constants

const GOLDEN_RATIO =  1.61803398874989484820458683436563811772030917980576286213544862270526046281890244970720720418939113748475408807538689175212663386222353693179318006076672635443338908659593958290563832266131992829026788067520876689250171169620703222104;
const q1Exp = 0.15;
const q2Exp = 0.15;
const lExp = 0.1;
const rootExp = 0.1;
const jExp = 0.01;
const kExp = 0.05;

/////////////////////////////////////////
// Theory Variables

var currency;
var q1, q2, k, n, f, l; // buyable variables
var m_q1Exp, m_q2Exp, m_fUnlock, m_lExp, m_rootExp, m_jExp, m_kExp; // milestones
var numPublications = 0; // publications done so far

/////////////////////////////////////////
// Helpers

var prevK, prevN, cachedSummation;

/////////////////////////////////////////
// DEBUG

var printLog;

/////////////////////////////////////////
// Initializations & Definitions

var init = () => {
    /////////////////////////////////////////
    // Setup and initialization
    currency = theory.createCurrency();

    theory.primaryEquationHeight = 70;
    theory.primaryEquationScale = 1.2;
    theory.secondaryEquationHeight = 70;
    theory.secondaryEquationScale = 1.2;

    printLog = true;
    prevK = 0;
    prevN = 0;
    cachedSummation = 0;

    /////////////////////////////////////////
    // Regular Upgrades

    // q1
    {
        let getDesc = (level) => "q_1=" + getQ1(level).toString(0);
        let getInfo = (level) => "q_1=" + getQ1(level).toString(0);
        q1 = theory.createUpgrade(0, currency, new FirstFreeCost(new ExponentialCost(10, 3.38/4 + 0.1)));
        q1.getDescription = (amount) => Utils.getMath(getDesc(q1.level));
        q1.getInfo = (amount) => Utils.getMathTo(getInfo(q1.level), getInfo(q1.level + amount));
    }
    
    // q2
    {
        let getDesc = (level) => "q_2=2^{" + level + "}";
        let getInfo = (level) => "q_2=" + getQ2(level).toString(0);
        q2 = theory.createUpgrade(1, currency, new ExponentialCost(1000, 3.38*3 + 1));
        q2.getDescription = (amount) => Utils.getMath(getDesc(q2.level));
        q2.getInfo = (amount) => Utils.getMathTo(getInfo(q2.level), getInfo(q2.level + amount));
    }

    // n
    {
        let getDesc = (level) => "n=" + getN(level).toString();
        n = theory.createUpgrade(2, currency, new FirstFreeCost(new ExponentialCost(15, Math.log2(GOLDEN_RATIO + 0.4))));
        n.getDescription = (_) => Utils.getMath(getDesc(n.level));
        n.getInfo = (amount) => Utils.getMathTo(getDesc(n.level), getDesc(n.level + amount));
    }

    // k
    {
        let getDesc = (level) => "k=" + getK(level).toString();
        k = theory.createUpgrade(3, currency, new ExponentialCost(1500, Math.log2(BigNumber.E + 0.3)));
        k.getDescription = (_) => Utils.getMath(getDesc(k.level));
        k.getInfo = (amount) => Utils.getMathTo(getDesc(k.level), getDesc(k.level + amount));
    }
    
    // f
    {
        let getDesc = (level) => "f_t=" + getF(level).toString();
        f = theory.createUpgrade(4, currency, new ExponentialCost(1000, Math.log2(4)));
        f.getDescription = (_) => Utils.getMath(getDesc(f.level));
        f.getInfo = (amount) => Utils.getMathTo(getDesc(f.level), getDesc(f.level + amount));
        fPrev = 1;
    }

    // l
    {
        let getDesc = (level) => "l=" + getL(level).toString();
        l = theory.createUpgrade(5, currency, new ExponentialCost(1500, Math.log2(BigNumber.E + 0.3)));
        l.getDescription = (_) => Utils.getMath(getDesc(l.level));
        l.getInfo = (amount) => Utils.getMathTo(getDesc(l.level), getDesc(l.level + amount));
    }

    /////////////////////////////////////////
    // Permanent Upgrades

    theory.createPublicationUpgrade(0, currency, 1e1);
    theory.createBuyAllUpgrade(1, currency, 1e2);
    theory.createAutoBuyerUpgrade(2, currency, 1e3);

    /////////////////////////////////////////
    // Milestone Upgrades

    theory.setMilestoneCost(new LinearCost(1, 1)); // c = 25*x + 25, i.e rewards a milestone every 25 log10(tau)

    // Milestone q1 exponent
    {
        m_q1Exp = theory.createMilestoneUpgrade(0, 2);
        m_q1Exp.description = Localization.getUpgradeIncCustomExpDesc("q_1", `${q1Exp}`);
        m_q1Exp.info = Localization.getUpgradeIncCustomExpInfo("q_1", `${q1Exp}`);
        m_q1Exp.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation();
    }

    // Milestone q2 exponent
    {
        m_q2Exp = theory.createMilestoneUpgrade(1, 2);
        m_q2Exp.description = Localization.getUpgradeIncCustomExpDesc("q_2", `${q2Exp}`);
        m_q2Exp.info = Localization.getUpgradeIncCustomExpInfo("q_2", `${q2Exp}`);
        m_q2Exp.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation();
    }

    // Milestone f unlock
    {
        m_fUnlock = theory.createMilestoneUpgrade(2, 1);
        m_fUnlock.description = Localization.getUpgradeUnlockDesc("f");
        m_fUnlock.info = Localization.getUpgradeUnlockInfo("f");
        m_fUnlock.boughtOrRefunded = (_) => {
            updateAvailability();
            theory.invalidatePrimaryEquation();
            theory.invalidateSecondaryEquation();
        }
    }

    // Milestone l exponent
    {
        m_lExp = theory.createMilestoneUpgrade(3, 2);
        m_lExp.description = Localization.getUpgradeIncCustomExpDesc("l", `${lExp}`);
        m_lExp.info = Localization.getUpgradeIncCustomExpInfo("l", `${lExp}`);
        m_lExp.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation();
    }

    // Milestone root exponent decrease
    {
        m_rootExp = theory.createMilestoneUpgrade(4, 2);
        m_rootExp.description = Localization.getUpgradeDecCustomDesc("root\\ exponent", `${rootExp}`);
        m_rootExp.info = Localization.getUpgradeDecCustomInfo("root\\ exponent", `${rootExp}`);
        m_rootExp.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation();
    }

    // Milestone j exponent
    {
        m_jExp = theory.createMilestoneUpgrade(5, 2);
        m_jExp.description = Localization.getUpgradeIncCustomExpDesc("j\\ exponent", `${jExp}`);
        m_jExp.info = Localization.getUpgradeIncCustomExpInfo("j\\ exponent", `${jExp}`);
        m_jExp.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation();
    }

    // Milestone k exponent
    {
        m_kExp = theory.createMilestoneUpgrade(6, 2);
        m_kExp.description = Localization.getUpgradeIncCustomExpDesc("k", `${kExp}`);
        m_kExp.info = Localization.getUpgradeIncCustomInfo("k", `${kExp}`);
        m_kExp.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation();
    }

    updateAvailability();

    /////////////////////////////////////////
    // Achievements
    var aCat0 = theory.createAchievementCategory(0, "Miscellaneous");
    var aCat1 = theory.createAchievementCategory(1, "Progress");
    var aCat2 = theory.createAchievementCategory(2, "Milestones");
    var aCat3  = theory.createAchievementCategory(3, "Publications");
    var aCat4  = theory.createAchievementCategory(4, "Approximation");

    // Miscellaneous
    misc1 = theory.createAchievement(0, aCat0, "Back from retirement", "Unlock publication", () => theory.isPublicationAvailable);
    misc2 = theory.createAchievement(1, aCat0, "This is useless", "Unlock the \"Buy All\" button", () => theory.isBuyAllAvailable);
    misc3 = theory.createAchievement(2, aCat0, "Time to rest", "Unlock the auto-buyer", () => theory.isAutoBuyerAvailable);

    // Progress
    progress1 = theory.createAchievement(3, aCat1, "Baby steps", "Purchase a level of k", () => k.level > 0);
    progress2 = theory.createAchievement(4, aCat1, "Oh look, a character", "Reach 1e6 rho", () => currency.value >= BigNumber.from("1e6"));
    progress3 = theory.createAchievement(5, aCat1, "If only it was tau", "Reach 1e100 rho", () => currency.value >= BigNumber.from("1e100"));
    progress4 = theory.createAchievement(6, aCat1, "Speedy EF", "Reach 1e300 rho", () => currency.value >= BigNumber.from("1e300"));
    progress5 = theory.createAchievement(7, aCat1, "Halfway there yet?", "Reach 1e500 rho", () => currency.value >= BigNumber.from("1e500"));
    progress6 = theory.createAchievement(8, aCat1, "Devil's mathematician", "Reach 1e666 rho", () => currency.value >= BigNumber.from("1e666"));
    progress7 = theory.createAchievement(9, aCat1, "They had us in the first half", "Reach 1e750 rho", () => currency.value >= BigNumber.from("1e750"));
    progress8 = theory.createAchievement(10, aCat1, "Oh look, a penny", "Reach 1e1000 rho", () => currency.value >= BigNumber.from("1e1000"));
    progress9 = theory.createAchievement(11, aCat1, "Any moment now", "Reach 1e1250 rho", () => currency.value >= BigNumber.from("1e1250"));
    progress10 = theory.createAchievement(12, aCat1, "Wait, there is no limit?", "Reach 1e1500 rho", () => currency.value >= BigNumber.from("1e1500"));

    // Milestones
    milestone1 = theory.createAchievement(13, aCat2, "I know that one", "Add an exponent to q1", () => m_q1Exp.level > 0);
    //milestone2 = theory.createAchievement(14, aCat2, "Anything new yet?", "Add an exponent to q2", () => m_q2Exp.level > 0);
    //milestone3 = theory.createAchievement(15, aCat2, "Need more approximation", "Unlock the Fibonacci sequence", () => m_fUnlock.level > 0);
    //milestone4 = theory.createAchievement(16, aCat2, "Shallow roots", "Reduce the root exponent", () => m_rootExp.level > 0);
    //milestone5 = theory.createAchievement(17, aCat2, "Ruining the formula", "Change the main summation formula", () => m_oneAdd.level > 0);
    milestone6 = theory.createAchievement(18, aCat2, "Power the original", "Add an exponent to k", () => m_kExp.level > 0);
    milestone7 = theory.createAchievement(19, aCat2, "That's it?", "Get all milestones", () => allMilestonesUnlocked());

    // Publications
    pub1 = theory.createAchievement(20, aCat3, "Publicity!", "Publish for the first time", () => numPublications >= 1);
    pub2 = theory.createAchievement(21, aCat3, "All good things come in threes", "Publish 3 times", () => numPublications >= 3);
    pub3 = theory.createAchievement(22, aCat3, "Double digits", "Publish 10 times", () => numPublications >= 10);
    pub4 = theory.createAchievement(23, aCat3, "Why am I doing this?", "Publish 20 times", () => numPublications >= 20);
    pub5 = theory.createAchievement(24, aCat3, "How can there be another paper?", "Publish 50 times", () => numPublications >= 50);
    pub6 = theory.createAchievement(25, aCat3, "This is madness", "Publish 100 times", () => numPublications >= 100);

    // Approximation
    approx1 = theory.createAchievement(26, aCat4, "Close enough", "Reach 3 digits of precision for the golden ratio", () => f.level >= 9);
    approx2 = theory.createAchievement(27, aCat4, "How many do I need?", "Reach 7 digits of precision for the golden ratio", () => f.level >= 18);
    approx3 = theory.createAchievement(28, aCat4, "Out of space", "Reach 15 digits of precision for the golden ratio", () => f.level >= 36);
    //approx4 = theory.createAchievement(29, aCat4, "Only infinite more", "Reach 30 digits of precision for the golden ratio", () => f.level >= );
    //approx5 = theory.createAchievement(30, aCat4, "Can't see the difference", "Reach 50 digits of precision for the golden ratio", () => f.level >= );
    approx6 = theory.createAchievement(31, aCat4, "You need to be stopped", "Reach the final level of f_t", () => f.level == f.maxLevel);

    /////////////////////////////////////////
    // Secret Achievements
    
    // You wish to see them, right? :) Not yet!

    /////////////////////////////////////////
    // Story chapters
    chapter1 = theory.createStoryChapter(0, "Expand your limits", "Got n", () => n.level >= 1);
    chapter2 = theory.createStoryChapter(1, "Must go faster", "Got k", () => k.level >= 1);
    chapter3 = theory.createStoryChapter(2, "Retirement is not enough", "Published", () => numPublications >= 1);
    chapter4 = theory.createStoryChapter(3, "Déjà-vu", "Reached e50 rho", () => currency.value >= BigNumber.From("1e50"));
    chapter5 = theory.createStoryChapter(4, "Golden idea", "Unlock Fibonacci", () => f.isAvailable);
    chapter6 = theory.createStoryChapter(5, "Aided growth", "Decreased root exponent", () => m_rootExp.level >= 1);
    //chapter7 = theory.createStoryChapter(6, "Impatience", "Increased 1", () => m_oneAdd.level >= 1);
    chapter8 = theory.createStoryChapter(7, "Satisfaction", "Reached e1000 rho", () => currency.value >= BigNumber.From("1e1000"));
    chapter9 = theory.createStoryChapter(8, "Letting it go", "Got all milestones", () => allMilestonesUnlocked());
    chapter10 = theory.createStoryChapter(9, "Finale", "Reached e1500 rho", () => currency.value >= BigNumber.From("1e1500"));
}

/////////////////////////////////////////
// Verification helpers

var allMilestonesUnlocked = () =>{
    //log(m_q1Exp.maxLevel);
    return m_q1Exp.level == m_q1Exp.maxLevel && m_q2Exp.level == m_q2Exp.maxLevel && m_fUnlock.level == m_fUnlock.maxLevel &&
    m_lExp.level == m_lExp.maxLevel && m_jExp.level == m_jExp.maxLevel && m_kExp.level == m_kExp.maxLevel && m_rootExp.level == m_rootExp.maxLevel;
}

/////////////////////////////////////////
// Tick - hopefully not to be changed much

var tick = (elapsedTime, multiplier) => {
    let dt = BigNumber.from(elapsedTime * multiplier);
    let bonus = theory.publicationMultiplier;
    let vq1 = getQ1(q1.level).pow(getQ1Exp(m_q1Exp.level));
    let vq2 = getQ2(q2.level).pow(getQ2Exp(m_q2Exp.level));
    let exponentialSum = getSummation(n.level);
    let a = getA();
    let tickSum = bonus * dt * vq1 * vq2 * a * exponentialSum;
    currency.value += tickSum;
    printLog = true;
    //debugLog("dt: " + dt + ", q1: " + vq1 + ", q2: " + vq2 + ", a: " + a + ", summation: " + exponentialSum);
    //debugLog("Currency increased by " + bonus + " * " + dt + " * " + vq1 + " * " + vq2 + " * " + a + " * " + exponentialSum + " = " + tickSum);
    theory.invalidateSecondaryEquation();
    theory.invalidateTertiaryEquation();
    printLog = false;
}

var updateAvailability = () => {
    f.IsAvailable = m_fUnlock.level > 0;
    l.isAvailable = m_fUnlock.level > 0;
}

/////////////////////////////////////////
// Equations

var getPrimaryEquation = () => {
    let result = "\\dot{\\rho} = q_1";
    if (m_q1Exp.level > 0) 
        result += `^{${getQ1Exp(m_q1Exp.level)}}`;
    
    result += "q_2";
    if (m_q2Exp.level > 0) 
        result += `^{${getQ2Exp(m_q2Exp.level)}}`;
    
    if(m_fUnlock.level > 0)
        result += "a";

    result += "\\sqrt[";
    result += `${getRootExp(m_rootExp.level)}`;
    result += "]{s}";
    
    result += "\\qquad s = \\sum_{j = 1}^{n}\\left(1+\\frac{k";

    if (m_kExp.level > 0) 
        result += `^{${getKExp(m_kExp.level)}}`;

    result += "}{j}\\right)^{j";
    
    if (m_jExp.level > 0) 
        result += `^{${getjExp(m_jExp.level)}}`;
    
    result += "}";

    if(m_fUnlock.level > 0){
        result += "\\qquad a = \\frac{l";
        if (m_lExp.level > 0) 
            result += `^{${getLExp(m_lExp.level)}}`;
        
        result += "}{\\Delta}";
    }
    
    return result;
}

var getSecondaryEquation = () => {
    if(m_fUnlock.level == 0)
        return "";

    let result = "\\Delta = \\mid\\phi - \\frac{f_{t + 1}}{f_{t}}\\mid";
    result += "\\qquad \\Delta = " + getDelta();
    return  result;
}

var getTertiaryEquation = () => {
    let result = theory.latexSymbol + "=\\max\\rho";
    return result;
}

/////////////////////////////////////////
// General Theory Definitions

var getPublicationMultiplier = (tau) => tau.pow(0.164) / BigNumber.THREE;
var getPublicationMultiplierFormula = (symbol) => "\\frac{{" + symbol + "}^{0.164}}{3}";
var getTau = () => currency.value;
var get2DGraphValue = () => currency.value.sign * (BigNumber.ONE + currency.value.abs()).log10().toNumber();

/////////////////////////////////////////
// Variable & Milestone Value Definitions

var getQ1 = (level) => Utils.getStepwisePowerSum(level, 2, 10, 0);
var getQ1Exp = (level) => 1 + level * q1Exp;

var getQ2 = (level) => BigNumber.TWO.pow(BigNumber.from(level));
var getQ2Exp = (level) => 1 + level * q2Exp;

var getRootExp = (level) => 2 - level * rootExp;

var getK = (level) => level;
var getKExp = (level) => 1 + level * kExp;

var getN = (level) => level;
var getjExp = (level) => 1 + level * jExp;

var getF = (level) => {
    if(level == 0 || level == 1)
        return 1;

    var nthFib = FastDoubling(level + 1);
    return nthFib;
}

var getL = (level) => {
    if(level == 0)
        return 2;

    if(level == 1)
        return 1;

    var nthLucas = FastDoubling(level - 1) + FastDoubling(level + 1);
    return nthLucas;
}
var getLExp = (level) => 1 + level * lExp;

/////////////////////////////////////////
// Main Summation Computation

var computeSummation = (limit, prevLimit, all) => {
    var sum = all ? 0 : cachedSummation;
    var startIndex = all ? 1 : prevLimit + 1;

    for (var i = startIndex; i <= limit; i++) {
        var kNumerator = BigNumber.from(getK(k.level)).pow(getKExp(m_kExp.level));
        var iexp = BigNumber.from(i).pow(getjExp(m_jExp.level));
        var res = BigNumber.from(1 + (kNumerator/i)).pow(iexp);
        sum += res;
    }

    return sum;
}

// without caching this will not work fast enough
var getSummation = (limit) => {
    var sum = cachedSummation;

    // TODO: cache pre-computed values in an array
    if(k.level > prevK) {
        sum = computeSummation(limit, prevN, true);
        cachedSummation = sum;
        prevK = k.level;
        prevN = limit;
        return BigNumber.from(sum).pow(1/getRootExp(m_rootExp.level));
    }

    if(limit > prevN) {
        sum += computeSummation(limit, prevN, false);
        cachedSummation = sum;
        prevN = limit;
    }

    return BigNumber.from(sum).sqrt();
}

var getApproximation = () => {
    if(f.level == 0)
        return 1;

    return getF(f.level) / getF(f.level - 1);
}

var getDelta = () => {
    if(f.level == 0)
        return 1;

    return Math.abs(GOLDEN_RATIO - getApproximation());
}

var getA = () => {
    if(!f.isAvailable)
        return 1;

    let lNumerator = BigNumber.from(getL(l.level)).pow(getLExp(m_lExp.level));
    return BigNumber.from(lNumerator / getDelta());
}

/////////////////////////////////////////
// Theory Utility & Helpers

// Fibonacci Sequence

function FastDoubling(n){
    let a = 0;
    let b = 1;
    for (let i = 31; i >= 0; i--) {
        let d = a * (b * 2 - a);
        let e = a * a + b * b;
        a = d;
        b = e;
        if (((n >> i) & 1) != 0) {
            let c = a + b;
            a = b;
            b = c;
        }
    }
    return a;
}

function FastDoublingWithBigNumber(n){
    let a = BigNumber.ZERO;
    let b = BigNumber.ONE;
    for (let i = 31; i >= 0; i--) {
        let d = BigNumber.from(a * (b * 2 - a));
        let e = BigNumber.from(a * a + b * b);
        a = d;
        b = e;
        if (((n >> i) & 1) != 0) {
            let c = BigNumber.from(a + b);
            a = b;
            b = c;
        }
    }
    return a;
}

/////////////////////////////////////////
// DEBUG Utility

var debugLog = (message) => {
    if(printLog)
        log(message)
}

init();