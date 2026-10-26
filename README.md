# Kawaii Gakujo for Safari

![version](https://img.shields.io/badge/version-1.13.0-green)

静岡大学の学情を使いやすくするユーザースクリプトです．
woody-1227さんの [Comfortable-Gakujo](https://github.com/woody-1227/Comfortable-Gakujo) を，Safariでも使えるようにしました．実行には [Userscripts](https://github.com/quoid/userscripts) を使っています．

## 使い方

1. [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) をインストールし，一度アプリを開きます．
2. Safariの設定でUserscriptsを有効にします．
   - macOS：「Safari」→「設定」→「機能拡張」
   - iOS・iPadOS：「設定」→「アプリ」→「Safari」→「機能拡張」（旧OSでは「設定」→「Safari」）
3. Safariで [スクリプト](https://raw.githubusercontent.com/meidon-jp/kawaii-gakujo-safari/main/src/Kawaii_Gakujo.user.js) を開き，Userscriptsのポップアップから登録します．
4. 学情を開き，Userscriptsによる `gakujo.shizuoka.ac.jp` へのアクセスを「常に許可」にします．SSOの自動同意を使う場合は `idp.shizuoka.ac.jp` も許可してください．
5. Userscriptsの `Enable Injection` と `Kawaii Gakujo (Safari Userscripts)` をONにし，ページを再読み込みします．

登録できない場合は，[.user.js](src/Kawaii_Gakujo.user.js) をUserscriptsの保存先へ**コピー**してください．コピー後はポップアップを一度開いてから，学情を再読み込みします．元版を登録済みの場合は，重複しないようOFFにしてください．

旧名の `Comfortable Gakujo (Safari Userscripts)` を使っている場合は，新しいスクリプトを登録し，旧名の方をOFFにしてください．同じブラウザの背景画像や設定は引き継ぎます．

## 機能

- 課題の締め切り順ソート，残り時間の表示，提出済み課題の色分け・非表示
- 成績更新通知，年度・学期での絞り込み，授業の曜日・コマ順表示
- ホームのスケジュールを1〜5コマの位置に揃え，時限・時間，教科名，教室だけを同じ大きさのカードに表示
- サイドバー，課題の一覧・提出画面とお知らせの半透明表示，添付ファイルのプレビュー，背景画像の変更など

詳しくは [機能一覧](docs/features.md) を参照してください．

背景画像は画面右下の鉛筆から，通常時・n日未満・1日未満の3種類を選べます．画像を選ぶと，切り取り画面を挟まず保存容量に合わせて縮小・圧縮して保存します．nは初期値3日で，2以上の整数に変更できます．画像は半透明の上部メニュー・左のバーの背後まで，ウインドウ全体に表示します．縦横比を保ち，ウインドウに余白が出ない大きさへ自動で変わります．ホームで確認した締め切りに応じて，他のページでも背景を切り替えます．各画像の「元に戻す」で標準の背景に戻ります．

## 更新

Userscriptsの `Available Updates` から更新します．macOSではエディタの `Update` ボタンも使えます．
手動で更新する場合は，[スクリプト](https://raw.githubusercontent.com/meidon-jp/kawaii-gakujo-safari/main/src/Kawaii_Gakujo.user.js) をもう一度開いて登録してください．更新後は学情を再読み込みします．

更新先はこのリポジトリです．移植元の更新は自動では取り込みません．[更新履歴](docs/changelog.md)

## 注意事項

- 非公式です．学情の画面変更などで動かなくなることがあります．無保証での提供です．
- 生成AIによって生成されたソースコードを含みます．
- SSOの自動同意を有効にすると，既定の属性のまま同意ボタンを押します．
- 設定や非表示課題はCookie，背景画像はlocalStorage，提出取消後の復帰先はsessionStorageに保存します．端末間では同期しません．
- 締め切りまでn日未満・1日未満では，それぞれに設定した背景を表示します．画像が未設定の場合はオレンジ・赤の警告柄になります．
- macOSで基本動作を確認しています．iOS・iPadOSは未確認です．各機能の確認状況やテスト方法は [検証メモ](docs/compatibility.md) にまとめています．

## ライセンス

このスクリプトは，woody-1227さんがMITライセンスで公開されている [Comfortable-Gakujo](https://github.com/woody-1227/Comfortable-Gakujo) を元にしています．元作者の著作権表示とライセンスを引き継ぎ，この移植版も [MITライセンス](LICENSE) で公開しています．

Copyright (c) 2026 woody-1227
