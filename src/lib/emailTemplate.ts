// Sakura メールテンプレート
//
// 重要: supabase/functions/send-campaign-email/index.ts 内の同名定数と
// 内容を一致させること(送信時とプレビュー時で見た目を揃えるため)。
// 変更したら両方更新する。
//
// メールクライアント互換性ルール:
// - table-based layout (div は Outlook で崩れる)
// - inline CSS のみ (<style> タグは Gmail で弾かれることがある)
// - max-width: 600px
// - background-color はインライン指定
// - 画像は CDN ホスト (https://kaigopoint.com/icon-512.png)

export const LOGO_URL = "https://kaigopoint.com/icon-512.png";

export const SAKURA_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>介護職応援ポイント</title>
</head>
<body style="margin:0;padding:0;background-color:#fff5f5;font-family:'Hiragino Sans','Yu Gothic',-apple-system,'Helvetica Neue',Arial,sans-serif;color:#3d2c2c;-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fff5f5;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td align="center" style="background-color:#ff8787;padding:28px 16px;">
<img src="${LOGO_URL}" alt="介護職応援ポイント" width="72" height="72" style="display:block;width:72px;height:72px;border-radius:14px;border:0;outline:0;text-decoration:none;">
<p style="margin:14px 0 0 0;color:#ffffff;font-size:14px;font-weight:bold;letter-spacing:0.06em;">
<span style="color:#ffd6d6;">✿</span>&nbsp;介護職応援ポイント&nbsp;<span style="color:#ffd6d6;">✿</span>
</p>
</td></tr>
<tr><td style="padding:32px 28px;font-size:15px;line-height:1.75;color:#3d2c2c;">
{{body}}
</td></tr>
<tr><td style="padding:24px 28px 28px 28px;background-color:#fafafa;border-top:1px solid #f0e0e0;font-size:12px;color:#7a6a6a;line-height:1.7;text-align:center;">
<p style="margin:0 0 10px 0;">介護職応援ポイント運営<br>株式会社プラス・ピボット</p>
<p style="margin:0 0 14px 0;"><a href="{{unsubscribe_url}}" style="color:#7a6a6a;text-decoration:underline;">配信停止はこちら</a></p>
<p style="margin:0;color:#a99a9a;font-size:11px;">&copy; 2026 介護職応援ポイント</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

export const SAKURA_TEXT_FOOTER = `

----------------------------------------
介護職応援ポイント運営
株式会社プラス・ピボット

配信停止: {{unsubscribe_url}}
© 2026 介護職応援ポイント`;

export const wrapWithSakuraTemplate = (innerHtml: string): string =>
  SAKURA_HTML_TEMPLATE.replace("{{body}}", innerHtml);

export const wrapTextWithSakuraTemplate = (innerText: string): string =>
  `${innerText}${SAKURA_TEXT_FOOTER}`;
