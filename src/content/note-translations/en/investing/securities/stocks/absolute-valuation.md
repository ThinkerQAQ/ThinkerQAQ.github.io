---
title: "Absolute Valuation"
description: "English translation of the original VNote “Absolute Valuation”, preserving its structure with only necessary small corrections."
translationOf: "investing/securities/stocks/absolute-valuation"
language: "en"
updatedAt: "2026-09-15T10:15:00Z"
---

> Note: The original VNote structure and historical views are preserved. Product rules, returns, policies, and specific assets are time-sensitive; only clear errors or changed institutional rules are corrected minimally. This is not investment advice.

## 1. What Is Absolute Valuation?
- Also called a discounting method.
- It asks how much future dividends or free cash flow the company can provide after you buy it.

## 2. Discounted Cash Flow
### 2.1. What Is Discounting?
- Discounting converts future money into present-value terms.

### 2.2. Why Discount?
- Time value of money:
    - One yuan today is not the same as one yuan tomorrow; money received earlier can be more valuable.
    - Time gives capital an opportunity to earn additional returns.
- Because money has time value, cash flows occurring at different times are not directly comparable. To add or subtract them, they need to be converted to a common point in time.

### 2.3. Discounting Formula
#### 2.3.1. Net Present Value
- Relationship between present and future value:
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1606920671_20201202225022592_21850.png)
    - PV is present value, Fn is money received in future period n, and i is the discount rate.
- Net present value:
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1607227099_20201206115313523_6140.png)
    - I0 is the initial investment, t is the period, i is the discount rate, and Ct is cash flow in period t.
    - If a project's NPV is greater than 0, the discounted value of expected future cash flows exceeds the initial investment under the assumptions used, so the project may be economically acceptable.
    - If NPV is below 0, the discounted future cash flows are below the required investment under those assumptions.

#### 2.3.2. Perpetuity
- A cash flow that begins in a certain year and then remains constant or grows at a stable rate indefinitely is a perpetuity.
- If annual earnings are constant:
    - `E/(1+r) + E/(1+r)^2 + E/(1+r)^3 + ... = E/r`
- If annual earnings grow at a stable rate:
    - `E/(1+r) + E×(1+g)/(1+r)^2 + E×(1+g)^2/(1+r)^3 + ... = E/(r-g)`

## 3. Absolute-Valuation Methods

### 3.1. Dividend Discount Model (DDM)
- A stock's value is modeled as the present value of future dividends.

#### 3.1.1. Calculation

#### 3.1.2. Characteristics
- Forecasting dividends infinitely far into the future is unrealistic.
- The original note observed that many A-share companies historically paid limited dividends and that minority shareholders had little influence over payout decisions, limiting the practical use of DDM in those cases.

### 3.2. Discounted Cash Flow Model (DCF)
Use free cash flow instead of dividends in the discounting framework above.

#### 3.2.1. Characteristics
- The original note says DCF is more suitable for "value stocks" because their profits are more stable:
    - Growth below ROE was labeled "value," while growth above ROE was labeled "growth."
    - An ROE of 15% was suggested.
    - Small-fix note: comparing growth directly with ROE and using "ROE 15%" are historical heuristics from the note, not universal definitions or hard thresholds for value vs. growth stocks.
- Limitations:
    - Forecasting future free cash flow is difficult.
    - There is no single universally correct estimate for the weighted average cost of capital.

#### 3.2.2. Three Elements

##### 3.2.2.1. Operating Life
First consider how long the company can continue operating—that is, how long n in the DCF framework can extend.

##### 3.2.2.2. Cash-Flow Creation Ability
Next consider the factors that affect future cash generation.

###### 3.2.2.2.1. Capital Requirements in Investment
Startups require capital, and expansion also requires capital.

###### 3.2.2.2.2. Cash Content of Sales
Cash earned by the company needs to circulate through the business rather than remaining idle.

###### 3.2.2.2.3. Capital Structure in Operations
A company purchases raw materials from upstream suppliers and sells products or services to downstream customers.

Analyzing **accounts receivable / total assets** and **accounts payable / total assets** can provide information about the company's bargaining position in its supply chain.

##### 3.2.2.3. Position in the Business Life Cycle
Company life-cycle stages:
1. Initial growth
2. Mid-to-late growth
3. Maturity and decline

Growth rates differ across stages. In DCF, this relates to separating higher-growth and steady-state periods, although a company cannot always be modeled accurately by simply assigning one average growth rate to two stages.

#### 3.2.3. Free Cash Flow to the Firm (FCFF)

##### 3.2.3.1. Determine the Discount Rate
- The discount rate is the return required by investors, or from the company's perspective, the capital cost paid for using investors' funds.
- It is related to opportunity cost:
    - Opportunity cost is the best alternative value forgone by choosing one option.
    - It is not a sunk cost.
    - Risk needs to be considered.
        - The average expected return of investment opportunities with a similar risk level can be used as a reference.
        - One statistical way to describe uncertainty is variance or standard deviation of possible returns.
        - Risk and return:
            - Risks related to broad macroeconomic factors are commonly called systematic risk.
            - Risks specific to an industry or company are nonsystematic risk.
            - Nonsystematic risk can be reduced through diversification; systematic risk cannot be diversified away in the same way.

###### 3.2.3.1.1. Return for the Entire Enterprise
- Estimate the value created by the main business/operating activities, then derive common-equity value:
    - Future cash flow: free cash flow generated by operations
    - Discount rate: weighted average cost of capital (WACC)
- Enterprise capital comes from debt and equity.
- The enterprise's expected required return reflects the costs of both debt and equity.
- The weighted average capital cost is WACC:
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1607007810_20201203225040998_2057.png)
    - D = total debt, E = shareholders' equity, TD = corporate income-tax rate.

###### 3.2.3.1.2. Shareholders' Equity
- The discount rate is the cost of equity.
- Method 1: use an industry-average required return/profitability reference.
- Method 2: use CAPM:
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1607007811_20201203225914849_31696.png)
    - Economic meaning:
        - In the CAPM framework, higher expected return corresponds to compensation for higher systematic risk; taking risk does not guarantee a high realized return.
        - Idiosyncratic risk is not rewarded in the model; only systematic risk earns a risk premium.

##### 3.2.3.2. Forecast Financial Statements
- ![](https://raw.githubusercontent.com/TDoct/images/master/1607233916_20201206133100803_15040.png)
- Forecast operating activities through "operating revenue":
    - 1-4
- Forecast investing activities through "long-term investment":
    - 5
- Forecast financing activities through the proportions of different financing channels:
    - 6

###### 3.2.3.2.1. Forecast Operating Revenue
- Use historical data to form a rough forecast, for example considering recent 3-5 years of revenue and an assumed organic-growth trajectory.

###### 3.2.3.2.2. Forecast Costs, Taxes, and Expenses
- Use historical gross margins and profit margins to estimate operating costs, taxes, administrative expenses, and selling expenses.

###### 3.2.3.2.3. Forecast Operating Assets
- Estimate turnover ratios for operating assets from historical data. Combined with a revenue forecast, these ratios provide a basis for forecasting operating-asset items.

###### 3.2.3.2.4. Forecast Liabilities and Equity
- Based on historical capital structure, the mix of long- and short-term debt, and expected financing channels, estimate how funding needs may be split among liabilities, equity, and debt maturities.

###### 3.2.3.2.5. Forecast Investment and Profit Distribution, Complete the Income Statement, and Balance the Balance Sheet

###### 3.2.3.2.6. Forecast the Cash Flow Statement
- ![](https://raw.githubusercontent.com/TDoct/images/master/1607233977_20201206134838337_15914.png)

### 3.3. Free Cash Flow to Equity (FCFE)
FCFE and FCFF share the same core idea: an investor values future free cash flows.

The difference is that FCFE directly estimates free cash flow available to equity holders, while FCFF first estimates free cash flow available to both shareholders and creditors and then derives equity value.

The original note explains that debt financing can add cash available to equity holders, while interest and debt repayment belong to creditors' claims.

Thus, in simplified terms, FCFE can be related to FCFF by subtracting creditor-related cash claims such as interest/debt service and adding net new borrowing, with the exact bridge depending on the accounting formulation used.

## 4. References
[Step-by-Step Stock Valuation - Zhihu](https://zhuanlan.zhihu.com/p/153546338)
[Investment Basics II: Absolute Valuation - Zhihu](https://zhuanlan.zhihu.com/p/664556326)
[Personal Interpretation of the Three DCF Elements](http://www.990755.com/stock/5299.html)
