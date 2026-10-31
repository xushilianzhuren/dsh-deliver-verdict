# dsh-deliver-verdict · 不合格令

不合格令：AI交付的质量终审闸——视觉/体验类交付前必对标全帧审阅（0.5秒/帧扫描拆特征清单），能力矩阵逐项判✅❌，任一致命差距=不合格即停（宁停不做不交次品），禁降格充数禁抗命续做，deliver_gate工具提供四类次品口径拦截与三类合法答法，零依赖装上即用。（Host 插件，零依赖、无构建）。

## 闸
- gate · 口径检：4类违禁口径，命中即返回正判。
- gate · 合法答法：3类问题合法答法模板。

## 配置
```yaml
- id: dsh-deliver-verdict
  config:
    enabled: true
    tool: true
```

## 许可
MIT
