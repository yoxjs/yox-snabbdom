# yox-snabbdom

改造 snabbdom 的原因：

1. 精简代码
2. snabbdom 写的太丑了

希望能跟 snabbdom 兼容，不排除为了 yox 的需要，做出一点点不兼容。

1. `elm` 改成 `el`
2. `init(modules, api)` 删除第二个 `api` 参数
