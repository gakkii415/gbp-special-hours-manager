# Special Hours Manager

Google Business Profileの特別営業時間を日付から追加・変更・削除する管理画面。

既存のGoogle Apps Scriptの認証を使用します。公開サイトは本人限定の管理画面への入口です。ブラウザ用OAuthクライアントの作成は不要です。

- 分は00／30、複数時間帯・休業日・翌日営業に対応
- 保存前の変更検知と検証、保存後の読取確認
- 更新対象はspecialHoursのみ

`npm test`で日付と時間帯の検査を実行します。`node scripts/build-gas.mjs <出力先>`で同じ画面と検証処理をGAS向けに生成します。
