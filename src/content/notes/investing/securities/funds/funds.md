---
title: "基金"
description: "原始 VNote《基金》，保留原有结构，仅做必要的小幅校正。"
sourcePath: "Others/经济/投资学/证券投资/基金/基金.md"
category: "investing"
categoryLabel: "Investing"
topic: "funds"
topicLabel: "3.2.Funds"
order: 11
tags: ["Investing"]
updatedAt: "2026-09-15T10:15:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

> 说明：保留原始 VNote 结构与历史观点。涉及产品规则、收益率、政策或具体标的的内容具有时效性；仅对明确错误或已经变化的制度做少量校正，不构成投资建议。

## 1. 什么是基金
- 通过发售基金份额将资金集中起来，进行投资组合（债券+股票）
- 资金由基金托管人（一般是银行）托管，基金管理人（一般是基金公司）管理
- 基金生命周期
    ![](https://raw.githubusercontent.com/TDoct/images/master/1603522909_20201024144948870_9138.png)
- 基金名称：公司名+特征+种类+后缀字母
### 1.1. 术语
- 认购：买新基金
- 申购：买老基金
- 赎回：卖出基金
- 估值：估算基金资产净值和基金份额净值的过程
- 净值：收盘价计算出的基金总资产价值-基金当日各类成本和费用
- 单位净值：一份基金值多少钱
- 累计单位净值：单位净值+分红
- 未知价原则：交易日15：00之前发生的视为今天的交易，但是当天的净值是晚上或者隔天才发布
- T日：交易日，周末和法定节假日不算
- 一级市场、二级市场：区别在于是否一手交易。有点类似ToB和ToC的区别
    - 股票的一级市场是公司初步发售的股票，二级市场是证券所交易
    - 基金的一级市场是基金公司发售的份额，二级市场是证券所交易
- 大盘、中盘、小盘：可以按市值区分。原笔记用“总市值超1000亿/不到100亿”作为经验阈值；这不是固定的统一标准，会随市场和指数编制规则变化。
- 无风险投资收益：~~在中国为1年期银行定期存款收益~~短期国债收益率
- 业绩评价基准：通俗叫大盘指数
    - 一般是指沪市的“上证综合指数”和深市的“深证成份股指数”
    - 如股票的整体涨跌或股票价格走势等。如果大盘指数逐渐上涨，即可判断多数的股票都在上涨，相反，如果指数逐渐下降，即大多数股票都在下跌。
- 标准差：
    - 基金每月的总回报率相对于平均月回报率的偏差程度
    - 用来衡量基金表现是否稳定。**越小越稳定**
- 贝塔系数：
    - 用来反映基金业绩相对市场的波动性。**越小波动性越小**
        - 如果β为1 ，则市场上涨10％，基金上涨10％；市场下滑10％，基金相应下滑10％。
        - 如果β为 1.1,市场上涨10％时，基金上涨11%, ；市场下滑10％时，基金下滑11% 。
        - 如果β为 0.9, 市场上涨10％时，基金上涨9% ；市场下滑10％时，基金下滑9% 。
    - β描述相对基准的系统性波动暴露，不等同于“高/低就一定更好”；高β通常意味着对基准涨跌更敏感。
- 阿尔法系数：
    - 超额收益和期望收益的差额即α系数
        - 超额收益是基金的收益减去无风险投资收益
        - 期望收益是贝塔系数β和市场收益的乘积，反映基金由于市场整体变动而获得的收益
    - 在熊市中，低α基金比高α基金好!，因为它比较抗跌。而在牛市里，高α基金收益就要好于低α
- R平方系数：
    - 用来反映市场的变动对基金表现的影响。**越低受市场影响越小**
        - 如果R平方值等于100 ，表示基金回报的变动完全由业绩基准的变动所致；
        - 若R平方值等于35，即35%的基金回报可归因于业绩基准的变动
    - 用来衡量贝塔系数和阿尔法系数的准确性。**R平方值越高，系数的准确性便越高**
- 夏普比率
    - `夏普比率=(组合收益率-无风险收益率)/收益波动率`；若从日频数据年化，通常对均值与波动率分别按一致口径年化，而不是简单把整个比率乘以250。
    - 表示每承担一单位的总风险，可以产生多少超额收益，数值越大越好
    - 基金承担单位风险所获得的超额回报率，即基金总回报率高于同期无风险收益率的部分
    - 用来反映基金能多大程度上跑赢市场。**越大跑赢市场几率越大**
- 左侧交易和右侧交易：
    - 左：阶段性高峰，左边进行交易
    - 右：阶段性高峰，右边进行交易
- A类和C类：
    - 指数基金A、C类是一起运作的，两者只是费率结构不同。
    - A/C 类份额通常采用不同收费结构；具体申购费、赎回费和销售服务费以对应基金最新招募说明书/产品资料概要为准，不能用固定费率概括所有基金。
    - 原笔记经验是“短期偏C、长期偏A”；实际应按具体费率结构和预计持有期计算。
- 逆向投资：
    - 买进过去表现差的股票而卖出过去表现好的股票来进行套利的一种投资方法
    - 原因：主要是建立在过度反应的基础上的,过度反应是指在预测中，投资者过分的注重近期发生的信息，引起股价剧烈波动，超过其应有水平，而后又反向修正，会转到应有价值，它是逆向投资策略的主要理论依据。
    - 方法
        - (1)低P／E(即低市盈率)策略
        - (2)低P／CF(CF表示每股现金量)策略
        - (3)低P／BV (BV表示每股账面净值)策略
        - (4)低P／D(D表示每股股利分红)策略
 - 央行票据：由中央银行发行的短期债券，商业银行购买。用于调节商业银行超额准备金
 - 商业票据：由金融公司或者信用高的公司发行的短期债券
 - 最大回撤：随便选定一个点，净值走到最低点时收益率降低的幅度
     - ![](https://raw.githubusercontent.com/TDoct/images/master/1604739793_20201107170303825_31491.png)
 - 同业存款：金融机构之间的存款业务，存入方可以包括银行及其他金融机构；对接受存款的一方属于负债。
 - 存放同业：指银行在其他金融同业的存款，属于银行的资产
- 同业拆借：指资金市场上银行同业间短期资金的借贷交易行为，包括拆出和拆入。

## 2. 基金的特点
- 相对于单只股票，可以通过组合持仓实现更广泛的资产配置
- 流动性取决于基金类型、交易/申赎机制和具体产品规则，不能一概而论为“流动性差”

## 3. 基金分类
- [基金分类.md](/notes/investing/securities/funds/fund-classification)

## 4. 基金费用
### 4.1. 交易费

交易时收取

- 认购费
- 申购费
- 赎回费
- 转换费
### 4.2. 运营费

按年收取

- 管理费
- 托管费
- 销售服务费

## 5. 如何投资基金
- [如何投资基金.md](/notes/investing/securities/funds/how-to-invest-in-funds)



## 6. 参考
- 天天基金基金学堂
- [新人应该如何系统地学习基金理财？ \- 知乎](https://www.zhihu.com/question/53743853)
- [基金定投是否真的是骗局？ \- 知乎](https://www.zhihu.com/question/21896324/answer/1297133838?utm_source=com.ideashower.readitlater.pro)
- [场内基金与场外基金各有什么优劣势？ \- 知乎](https://www.zhihu.com/question/30150662)
- [2020年基金公司排行 \- 知乎](https://zhuanlan.zhihu.com/p/110617828)
- [基金公司大全 \- 基金公司排名 \- 好买基金网](https://www.howbuy.com/fund/company/)
- [指数系列 \- 中证指数有限公司](http://www.csindex.com.cn/zh-CN/indices/index)
- [股市的大盘中盘小盘怎么界定？ \- 知乎](https://www.zhihu.com/question/28840284)
- [什么是成长型基金、价值型基金，平衡性基金？ \- 知乎](https://zhuanlan.zhihu.com/p/114440050)
- [基金理财\-\-工具篇 \- 知乎](https://zhuanlan.zhihu.com/p/80143229)
- [基金挑选秘籍之阿尔法α、贝塔β与R平方 \- 知乎](https://zhuanlan.zhihu.com/p/88672439)
- [大盘指数\_百度百科](https://baike.baidu.com/item/%E5%A4%A7%E7%9B%98%E6%8C%87%E6%95%B0#:~:text=%E5%A4%A7%E7%9B%98%E6%8C%87%E6%95%B0%E4%B8%80%E8%88%AC%E6%98%AF%E6%8C%87,%E5%A4%9A%E6%95%B0%E8%82%A1%E7%A5%A8%E9%83%BD%E5%9C%A8%E4%B8%8B%E8%B7%8C%E3%80%82)
- [风险评估](https://cn.morningstar.com/help/data/fundrisk.html)
- [晨星基金分类 Morningstar Category](https://cn.morningstar.com/help/data/fundcategory.html)
- [指数估值\(2020\-10\-23\)](https://danjuanapp.com/djmodule/value-center?channel=1300100141)
- [TopView \- 知乎](https://www.zhihu.com/people/topview_skyfall/columns)
- [基金理财\-\-工具篇 \- 知乎](https://zhuanlan.zhihu.com/p/80143229)
- [定投一个基金十年以上是怎么的体验？ \- 知乎](https://www.zhihu.com/question/365093004/answer/1538570153?utm_source=com.ideashower.readitlater.pro&utm_medium=social&utm_oi=1010072966851362816)
- [基金定投是否真的是骗局？ \- 知乎](https://www.zhihu.com/question/21896324/answer/1297133838?utm_source=com.ideashower.readitlater.pro&utm_medium=social&utm_oi=1010072966851362816)
- [基金定投是每天定投合适，还是每周，还是每月？ \- 知乎](https://www.zhihu.com/question/331698615/answer/1295145324?utm_source=com.ideashower.readitlater.pro&utm_medium=social&utm_oi=1010072966851362816)
- [定投每次投入多少才算合适？（2） \- 知乎](https://zhuanlan.zhihu.com/p/74707489?utm_source=com.ideashower.readitlater.pro&utm_medium=social&utm_oi=1010072966851362816)
- [如何快、准、狠地读懂基金报告，看这篇文章就够了！ \- 知乎](https://zhuanlan.zhihu.com/p/50553920?utm_source=com.ideashower.readitlater.pro&utm_medium=social&utm_oi=1010072966851362816)
- [ETF和LOF一文搞懂 \- 知乎](https://zhuanlan.zhihu.com/p/111728478)
- [课时01 必看导读课 \- 基金投资课 \- 新手入门 \- YouTube](https://www.youtube.com/watch?v=UmApNIQDBFw&list=PLd6ILBzWax4TRBsvD8oGufb8SB1TyPi7n&index=1)
- [左侧交易和右侧交易，哪个适合你？ \- 知乎](https://www.zhihu.com/question/45513809)
- [买基金选A还是选C？有什么区别？ \- 知乎](https://zhuanlan.zhihu.com/p/49908433)
- [逆向投资策略 \- MBA智库百科](https://wiki.mbalib.com/wiki/%E9%80%86%E5%90%91%E6%8A%95%E8%B5%84%E7%AD%96%E7%95%A5)
- [2020基金投资框架 \- 知乎](https://zhuanlan.zhihu.com/p/101662241)
- [行业研究员分析一个公司的流程是什么？ \- 知乎](https://www.zhihu.com/question/21305398)
- [文少的专栏 \- 知乎](https://www.zhihu.com/column/c_1105842587256233984)
- [我们该持有多少支基金 \- 知乎](https://zhuanlan.zhihu.com/p/82547245)
- [地表最强的互联网主题基金（投资价值分析） \- 知乎](https://zhuanlan.zhihu.com/p/145249133)
- [拱卒定投——基金的换手率 \- 知乎](https://zhuanlan.zhihu.com/p/80747175)
- [基金分类——QDII基金 \- 知乎](https://zhuanlan.zhihu.com/p/83329612)
- [基金的最大回撤\|基金经理\_新浪财经\_新浪网](https://finance.sina.com.cn/money/fund/jjzl/2020-11-04/doc-iiznctkc9494474.shtml)
- [中央银行票据\_百度百科](https://baike.baidu.com/item/%E4%B8%AD%E5%A4%AE%E9%93%B6%E8%A1%8C%E7%A5%A8%E6%8D%AE/9785901?fromtitle=%E5%A4%AE%E8%A1%8C%E7%A5%A8%E6%8D%AE&fromid=4728627)
- [商业票据\_百度百科](https://baike.baidu.com/item/%E5%95%86%E4%B8%9A%E7%A5%A8%E6%8D%AE#:~:text=%E5%95%86%E4%B8%9A%E7%A5%A8%E6%8D%AE%EF%BC%8C%E6%98%AF%E6%8C%87%E7%94%B1,%E4%BC%81%E4%B8%9A%E4%BF%A1%E8%AA%89%E5%AE%A1%E6%9F%A5%E5%8D%81%E5%88%86%E4%B8%A5%E6%A0%BC%E3%80%82)
- [同业存款 \- MBA智库百科](https://wiki.mbalib.com/wiki/%E5%90%8C%E4%B8%9A%E5%AD%98%E6%AC%BE#:~:text=%E5%90%8C%E4%B8%9A%E5%AD%98%E6%AC%BE%E4%B8%9A%E5%8A%A1%EF%BC%9A%E6%98%AF%E6%8C%87,%E6%9C%BA%E6%9E%84%E5%BC%80%E5%8A%9E%E7%9A%84%E5%AD%98%E6%AC%BE%E4%B8%9A%E5%8A%A1%E3%80%82)
- [我的投资观 \- 知乎](https://www.zhihu.com/column/c_1106504120059568128)
- [有哪些好的基金经理可以推荐？ \- 知乎](https://www.zhihu.com/question/373427508)
