---
title: "Funds"
description: "English translation of the original VNote “Funds”, preserving its structure with only necessary small corrections."
translationOf: "investing/securities/funds/funds"
language: "en"
updatedAt: "2026-09-15T10:15:00Z"
---

> Note: The original VNote structure and historical views are preserved. Product rules, returns, policies, and specific assets are time-sensitive; only clear errors or changed institutional rules are corrected minimally. This is not investment advice.

## 1. What Is a Fund?
- Funds are pooled by issuing fund units and invested as a portfolio (bonds + stocks).
- Assets are held by a fund custodian (commonly a bank), while the fund manager (commonly a fund-management company) manages them.
- Fund life cycle
    ![](https://raw.githubusercontent.com/TDoct/images/master/1603522909_20201024144948870_9138.png)
- Fund name: company name + feature + category + share-class suffix.

### 1.1. Terms
- Initial subscription: buy units during a new fund's offering.
- Subscription: buy units of an existing/open fund.
- Redemption: sell/redeem fund units.
- Valuation: process of estimating fund NAV and NAV per unit.
- NAV: value of total fund assets calculated after market close minus the day's costs and expenses.
- NAV per unit: how much one fund unit is worth.
- Accumulated NAV per unit: NAV per unit + historical distributions in the note's simplified description.
- Unknown-price principle: an order placed before the trading day's cutoff (historically 15:00) is treated as that day's transaction, while that day's NAV is published later.
- T day: trading day; weekends and statutory holidays do not count.
- Primary and secondary markets: distinguished by whether the transaction is with the issuer/fund mechanism or between market participants.
    - In stocks, the primary market is the company's initial issuance; the secondary market is exchange trading.
    - In funds, the primary market is fund issuance/subscription-redemption; exchange-listed fund trading occurs in the secondary market.
- Large-cap, mid-cap, small-cap: can be classified by market capitalization. The original note used "above 100 billion yuan" and "below 10 billion yuan" as rough thresholds; these are not fixed universal standards and vary with the market and index methodology.
- Risk-free investment return: ~~one-year bank term-deposit return in China~~ short-term government-bond yield as a common proxy.
- Performance benchmark: loosely described in the note as a market index.
    - Examples include the Shanghai Composite and Shenzhen Component, though the actual benchmark depends on the fund contract.
    - Market indexes are used to describe broad market price movements.
- Standard deviation
    - Dispersion of monthly fund returns around average monthly return.
    - Used to measure stability of fund performance. **Smaller means less volatility.**
- Beta
    - Reflects the fund's sensitivity to market/benchmark movements. **Smaller beta means lower sensitivity, not necessarily "better."**
        - If β = 1, a 10% market rise/fall corresponds to about a 10% fund movement under the model.
        - If β = 1.1, a 10% market move corresponds to about an 11% fund move.
        - If β = 0.9, a 10% market move corresponds to about a 9% fund move.
    - β describes systematic exposure relative to the benchmark; a higher or lower β is not inherently superior.
- Alpha
    - α is the difference between realized excess performance and model-expected performance in the note's framework.
        - Excess return = fund return - risk-free return.
        - Expected return reflects compensation associated with market exposure in the model.
    - Under the same model and measurement period, a higher α generally indicates stronger relative performance, but interpretation depends on the sample and statistical reliability.
- R-squared
    - Describes how much variation in fund performance is explained by benchmark variation.
        - R² = 100 means variation is fully explained by the benchmark in the regression.
        - R² = 35 means roughly 35% of return variation is explained by the benchmark.
    - Also helps assess how meaningful beta/alpha estimates are in that model; higher R² means the benchmark explains more of the variation.
- Sharpe ratio
    - `Sharpe ratio = (portfolio return - risk-free return) / return volatility`. When annualizing daily data, mean and volatility should be annualized consistently rather than multiplying the whole ratio by 250.
    - Indicates excess return per unit of total volatility; larger is better, other things equal.
- Left-side and right-side trading
    - Left: transact before a perceived stage high/turning point.
    - Right: transact after the turning point has begun to confirm.
- Class A and Class C
    - Index-fund A/C shares are typically managed together but use different fee structures.
    - The exact subscription, redemption, and sales-service fees vary by fund and should be checked in the latest prospectus/product summary.
    - The original heuristic was "short term -> C, long term -> A"; in practice, calculate based on the actual fee structure and expected holding period.
- Contrarian investing
    - Buy past underperformers and sell past outperformers in an attempt to benefit from reversal.
    - The rationale recorded here is investor overreaction followed by correction toward value.
    - Methods
        - (1) Low P/E strategy
        - (2) Low P/CF strategy
        - (3) Low P/BV strategy
        - (4) Low P/D strategy
- Central-bank bills: short-term instruments issued by the central bank, historically used as a liquidity-management tool.
- Commercial paper: short-term debt issued by financial companies or highly rated companies.
- Maximum drawdown: decline from a selected prior peak to a subsequent trough.
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1604739793_20201107170303825_31491.png)
- Interbank deposits: deposits between financial institutions; depositors may include banks and other financial institutions, and they are liabilities of the receiving institution.
- Due from banks/interbank institutions: a bank's deposits with other financial institutions, recorded as assets of the depositing bank.
- Interbank lending: short-term borrowing/lending among financial institutions in the money market.

## 2. Fund Characteristics
- Compared with holding one stock, funds can provide broader portfolio diversification.
- Liquidity depends on fund type, trading/subscription-redemption mechanism, and product rules; it cannot be described universally as "poor liquidity."

## 3. Fund Classification
- [Fund Classification](/en/notes/investing/securities/funds/fund-classification)

## 4. Fund Fees
### 4.1. Transaction Fees
Charged around transactions:
- Initial-subscription fee
- Subscription fee
- Redemption fee
- Conversion fee

### 4.2. Operating Fees
Charged/accrued according to product terms:
- Management fee
- Custody fee
- Sales-service fee

## 5. How to Invest in Funds
- [How to Invest in Funds](/en/notes/investing/securities/funds/how-to-invest-in-funds)

## 6. References
- Eastmoney Fund School
- [How Should Beginners Learn Fund Investing Systematically? - Zhihu](https://www.zhihu.com/question/53743853)
- [Is Regular Fund Investing Really a Scam? - Zhihu](https://www.zhihu.com/question/21896324/answer/1297133838?utm_source=com.ideashower.readitlater.pro)
- [Exchange-Traded vs. Off-Exchange Funds - Zhihu](https://www.zhihu.com/question/30150662)
- [2020 Fund-Company Ranking - Zhihu](https://zhuanlan.zhihu.com/p/110617828)
- [Fund Companies - Howbuy](https://www.howbuy.com/fund/company/)
- [Index Series - China Securities Index](http://www.csindex.com.cn/zh-CN/indices/index)
- [How Are Large/Mid/Small Caps Defined? - Zhihu](https://www.zhihu.com/question/28840284)
- [Growth, Value, and Balanced Funds - Zhihu](https://zhuanlan.zhihu.com/p/114440050)
- [Fund Investing Tools - Zhihu](https://zhuanlan.zhihu.com/p/80143229)
- [Fund Alpha, Beta, and R-Squared - Zhihu](https://zhuanlan.zhihu.com/p/88672439)
- [Market Index - Baidu Baike](https://baike.baidu.com/item/%E5%A4%A7%E7%9B%98%E6%8C%87%E6%95%B0#:~:text=%E5%A4%A7%E7%9B%98%E6%8C%87%E6%95%B0%E4%B8%80%E8%88%AC%E6%98%AF%E6%8C%87,%E5%A4%9A%E6%95%B0%E8%82%A1%E7%A5%A8%E9%83%BD%E5%9C%A8%E4%B8%8B%E8%B7%8C%E3%80%82)
- [Risk Assessment - Morningstar](https://cn.morningstar.com/help/data/fundrisk.html)
- [Morningstar Category](https://cn.morningstar.com/help/data/fundcategory.html)
- [Index Valuation (2020-10-23)](https://danjuanapp.com/djmodule/value-center?channel=1300100141)
- [TopView - Zhihu](https://www.zhihu.com/people/topview_skyfall/columns)
- [ETF and LOF Explained - Zhihu](https://zhuanlan.zhihu.com/p/111728478)
- [Left-Side vs. Right-Side Trading - Zhihu](https://www.zhihu.com/question/45513809)
- [Fund Class A or C? - Zhihu](https://zhuanlan.zhihu.com/p/49908433)
- [Contrarian Investment Strategy - MBA Wiki](https://wiki.mbalib.com/wiki/%E9%80%86%E5%90%91%E6%8A%95%E8%B5%84%E7%AD%96%E7%95%A5)
- [Fund Classification: QDII - Zhihu](https://zhuanlan.zhihu.com/p/83329612)
- [Fund Maximum Drawdown - Sina Finance](https://finance.sina.com.cn/money/fund/jjzl/2020-11-04/doc-iiznctkc9494474.shtml)
- [My Investment View - Zhihu](https://www.zhihu.com/column/c_1106504120059568128)
- [Recommended Fund Managers? - Zhihu](https://www.zhihu.com/question/373427508)
