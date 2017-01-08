# yox-snabbdom

改造 snabbdom 的原因：

1. 精简代码
2. snabbdom 写的太丑了

## 改动

1. `elm` 改成 `el`
2. `vnode` 改成 `Vnode`，并且实现为类
3. `htmldomapi` 改成 jQuery 版本，减少字符
