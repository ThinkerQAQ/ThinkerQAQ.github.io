## 1. fcitx安装

```sh
yay -S fcitx5 fcitx5-rime   fcitx5-qt  fcitx5-gtk
```

## 2. fcitx配置

vim ~/.pam_environment
```conf
GTK_IM_MODULE DEFAULT=fcitx
QT_IM_MODULE  DEFAULT=fcitx
XMODIFIERS    DEFAULT=\@im=fcitx
INPUT_METHOD  DEFAULT=fcitx
SDL_IM_MODULE DEFAULT=fcitx
```
问题诊断
```sh
fcitx5-diagnose
```
## 3. 参考
- [Fcitx5 (简体中文) - ArchWiki](https://wiki.archlinux.org/title/Fcitx5_(%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87))