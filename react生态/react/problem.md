
1. 单纯的输入框：reactType='input'  eg：姓名标签
2. 范围输入框：reactType = 'range'  eg：转化率等
3. 穿梭框：reactType= 'transfer'    eg：省份、城市，车商等级等
4. 多选框：reactType= 'checkbox'    eg：门店数量
5. 单选框：reactType='radio'        eg：是否使用SAAS


现有问题：
1. 关于operate的
是不是如果提供了可多选的，，operate是”eq“，现阶段只有穿梭框和多选框有多选
范围输入的operate 是不是还是为 between 
单纯的输入框，如姓名，是不是为 in 
其他的operate 全部为 eq，如单选框，？？？？？？

2. 关于渠道细查的
一开始在获取这部分选择值时，也是要请求 getLabelByDomain 接口？能否根据url 你解析出domain ,然后一开始就注入值



