# 特別営業時間マネージャー

Googleビジネスプロフィールの特別営業時間を、日付ごとに追加・変更・削除するWebアプリです。

- 分は00／30、時刻はam／pm表記
- 休業日、同日の複数時間帯、翌日までの営業に対応
- 削除した日は通常営業時間に戻る
- Google APIへの保存前に確認し、保存後に読み直して検証
- 読み込み後に他の画面で変更された場合は保存を停止

## 接続設定

APIアクセスが承認済みのGoogle Cloudプロジェクトで、ウェブアプリケーション用OAuthクライアントを作成します。承認済みJavaScript生成元にGitHub Pagesのオリジン（パスなし）を登録し、画面の「初回の接続設定」へクライアントIDを入力してください。OAuthがテスト中の場合は管理用Googleアカウントをテストユーザーに登録します。

Account Management APIとBusiness Information APIの有効化、`business.manage` スコープへの同意が必要です。OAuthクライアントIDは秘密ではなく、端末上の設定として保存します。クライアントシークレットは使いません。アクセストークンはメモリだけに保持し、更新・期限切れ時に再接続します。

変更するAPIフィールドは `specialHours` のみです。通常営業時間や他の日付の登録を保持します。Google APIは特別営業時間リスト全体を置き換えるため、保存直前に最新データを取得し変更を検出します。APIは原子的な比較更新に対応していないため、他の管理画面で同時編集しないでください。

## 開発・検証

依存パッケージ不要の静的HTML／JavaScript。`npm test` で日付・営業時間・重複・既存登録保持を検証します。外部APIの実接続には初回OAuth設定が必要です。

公式仕様: [Googleのトークンモデル](https://developers.google.com/identity/oauth2/web/guides/use-token-model)、[locations.patch](https://developers.google.com/my-business/reference/businessinformation/rest/v1/locations/patch)、[SpecialHourPeriod](https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations#SpecialHourPeriod)。
