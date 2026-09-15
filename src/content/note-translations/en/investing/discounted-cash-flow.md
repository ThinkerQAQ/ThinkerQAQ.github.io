---
title: "5.3 DCF, DDM, FCFF, and FCFE"
description: "Discounted cash flow, terminal value, WACC, cost of equity, and the relationships and model risks of DDM, FCFF, and FCFE."
translationOf: "investing/discounted-cash-flow"
language: "en"
updatedAt: "2026-09-15T04:55:00Z"
---

## 1. The Core Idea of Discounted Cash Flow

A dollar received in the future is not worth the same as a dollar today, so future cash flows must be converted to a common point in time.

A one-period present value can be written as:

`PV = CF_t / (1 + r)^t`

where `CF_t` is the cash flow in period `t` and `r` is a discount rate appropriate for the risk of that cash flow.

## 2. NPV

Project net present value can be written as:

`NPV = -I_0 + Σ CF_t / (1 + r)^t`

Under reasonable assumptions, positive NPV means the present value of expected future cash flows exceeds the initial investment at the stated discount rate.

The difficult part is not the formula. It is forecasting cash flow and choosing a coherent discount rate.

## 3. Perpetual Growth

A stable-growth terminal value is often written as:

`TV = CF_(n+1) / (r - g)`

with `r > g`.

Terminal value can dominate a DCF, so small changes in long-run growth or discount rate can create large valuation changes. Long-run growth cannot plausibly exceed sustainable nominal economic growth forever.

## 4. DDM

The dividend discount model values equity as the present value of future dividends.

It is more suitable when:

- dividend policy is reasonably stable;
- earnings and capital needs are predictable;
- dividends are a useful representation of cash distributable to shareholders.

Its limitation is not simply that some markets pay low dividends; the deeper issue is that actual dividends may differ from economic distributable cash flow.

## 5. FCFF

FCFF represents cash flow available to all providers of capital, both debt and equity.

A common formulation is:

`FCFF = EBIT × (1 - Tax Rate) + D&A - Capex - ΔNWC`

FCFF is typically discounted using WACC to estimate enterprise value. Net debt and other claims are then reconciled to obtain equity value.

## 6. WACC

A simplified form is:

`WACC = E/(D+E) × r_e + D/(D+E) × r_d × (1-T)`

Important caveats include:

- weights are generally based on market values rather than historical book values;
- debt cost should reflect current marginal financing cost;
- cost of equity depends on assumptions and models;
- a fixed WACC can become misleading when risk or capital structure changes.

## 7. FCFE

FCFE represents cash flow available to common shareholders after operating needs, reinvestment, and net debt financing.

It is discounted at the cost of equity to estimate equity value directly.

FCFE is not inherently superior to FCFF. They are different perspectives on the same business and should produce compatible results when assumptions are internally consistent.

## 8. The Role of CAPM

CAPM is often used to estimate the cost of equity:

`r_e = r_f + β × (E[R_m] - r_f)`

Its core idea is that, in a well-diversified portfolio, markets primarily compensate systematic risk.

But beta, the risk-free rate, and the market risk premium all have to be estimated. CAPM therefore produces an estimate, not an objective constant.

## 9. The Most Sensitive DCF Inputs

Typical drivers include:

- revenue growth;
- margins;
- tax rate;
- working-capital needs;
- capital expenditure;
- discount rate;
- terminal growth.

Terminal value and discount rate often have outsized influence on the result.

## 10. Common Errors

### Extrapolating historical growth indefinitely

Growth is eventually constrained by market size, competition, and returns on capital.

### Ignoring reinvestment requirements

High growth often requires capital. Forecasting profit growth without capex and working capital can materially overstate free cash flow.

### Pretending a point estimate is precise

DCF should be accompanied by scenario and sensitivity analysis.

### Using the model instead of understanding the business

More spreadsheet rows do not improve valuation if revenue, margin, and capital-return drivers are not understood.

## 11. The Best Use of DCF

DCF is most valuable when it makes market-implied assumptions explicit.

Instead of asking only “What is the company worth exactly?”, ask:

> What growth, margin, and return-on-capital assumptions are required to justify the current price, and are those assumptions plausible?
