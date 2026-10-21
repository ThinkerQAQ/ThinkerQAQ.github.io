# BlogCTL v0.1.185

Medium 更新任务失败后，先核对同一篇文章已保存的图片和完整正文；内容一致时直接继续 Canonical 设置，不重传图片或再次覆盖正文。

Canonical 检查失败的单目标更新同样支持从已保存内容继续，仅允许对应的 Medium 文章。保持手动发布限制，不执行 Save and publish。

版本：`0.1.185`
