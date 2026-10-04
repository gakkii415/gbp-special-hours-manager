# Special Hours Manager

Google Business Profileの特別営業時間を日付から追加・変更・削除する管理画面。

同じUIコードを店舗ごとのGoogle Apps Scriptへ配布し、Google認証は店舗アカウントごとに分離します。画面下部の固定タブから店舗を切り替えます。現在はTattoo側が接続済みで、Spa側はGBP API承認後に同じコードを`spa`指定でビルドして接続できます。

- 分は00／30、複数時間帯・休業日・翌日営業に対応
- 保存前の変更検知と検証、保存後の読取確認
- 更新対象はspecialHoursのみ
- 店舗ごとに別のGAS実行環境を使い、別店舗への誤保存を防止

`npm test`で日付・時間帯・店舗切替・GASビルドを検査します。`node scripts/build-gas.mjs <出力先> tattoo`または`node scripts/build-gas.mjs <出力先> spa`で、同じ画面と検証処理を店舗別GAS向けに生成します。

自動操作では初回に許可済みの認証を継続利用し、読み取り・検証・更新結果を返します。認証の失効時には再認証が必要です。管理画面の本人ログインは別です。
