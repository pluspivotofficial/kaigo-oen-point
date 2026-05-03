// send-campaign-email Edge Function
// 一斉メール配信のエンジン。同期送信。テスト送信 + 本番送信(31名想定)。
//
// セキュリティ:
// - 呼び出し元 JWT 検証 + is_admin(auth.uid()) チェック
// - service_role で recipients 取得 + 配信ログ書き込み
// - acquire_campaign_send_lock RPC で二重送信防止 (atomic)
//
// 環境変数 (Function Secret):
// - SUPABASE_URL              (自動)
// - SUPABASE_ANON_KEY         (自動)
// - SERVICE_ROLE_KEY          (banned-user-signout と共有)
// - RESEND_API_KEY            (新規、ユーザーが secrets set)
// - APP_BASE_URL              (任意、デフォルト https://kaigopoint.com)
//
// 入力 body:
// - { mode: 'test', campaign_id: uuid, test_recipient: string }
// - { mode: 'mass', campaign_id: uuid }
//   (mass mode は既存 sent ログをスキップして再送可能)

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  mode: "test" | "mass";
  campaign_id: string;
  test_recipient?: string;
}

interface Campaign {
  id: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  target_filter: { type: string };
}

interface Recipient {
  email: string;
  user_id: string;
  display_name: string | null;
}

interface ResendResponse {
  id?: string;
  message?: string;
}

const generateToken = (): string => {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const replaceVariables = (
  template: string,
  vars: Record<string, string>
): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body: RequestBody = await req.json();
    if (!body.campaign_id || !body.mode) {
      return new Response(
        JSON.stringify({ error: "campaign_id and mode required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    if (body.mode === "test" && !body.test_recipient) {
      return new Response(
        JSON.stringify({ error: "test_recipient required in test mode" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const appBaseUrl =
      Deno.env.get("APP_BASE_URL") ?? "https://kaigopoint.com";

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !resendKey) {
      console.error("Missing env", {
        hasUrl: !!supabaseUrl,
        hasAnon: !!anonKey,
        hasService: !!serviceRoleKey,
        hasResend: !!resendKey,
      });
      return new Response(
        JSON.stringify({ error: "server misconfigured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "missing authorization" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 呼び出し元クライアント (JWT 経由、is_admin チェック用)
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: callerErr,
    } = await callerClient.auth.getUser();
    if (callerErr || !caller) {
      return new Response(
        JSON.stringify({ error: "invalid token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: isAdminData, error: isAdminErr } = await callerClient.rpc(
      "is_admin",
      { _user_id: caller.id }
    );
    if (isAdminErr || isAdminData !== true) {
      return new Response(
        JSON.stringify({ error: "admin role required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // service_role クライアント (DB操作用)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // campaign 取得
    const { data: campaign, error: cErr } = await adminClient
      .from("email_campaigns")
      .select("id, subject, body_html, body_text, target_filter")
      .eq("id", body.campaign_id)
      .single();
    if (cErr || !campaign) {
      return new Response(
        JSON.stringify({ error: "campaign not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const camp = campaign as unknown as Campaign;

    // ====================================================
    // テスト送信
    // ====================================================
    if (body.mode === "test") {
      const testRecipient = body.test_recipient!;
      // テストではダミー unsubscribe URL を使う (実際には機能しない)
      const testVars = {
        unsubscribe_url: `${appBaseUrl}/unsubscribe?token=TEST_DUMMY`,
        name: "テスト受信者",
        email: testRecipient,
      };
      const html = replaceVariables(camp.body_html, testVars);
      const text = camp.body_text
        ? replaceVariables(camp.body_text, testVars)
        : undefined;

      const sendResult = await sendViaResend(resendKey, {
        from: "noreply@kaigopoint.com",
        to: testRecipient,
        subject: `[テスト] ${camp.subject}`,
        html,
        text,
      });

      // ログ記録 (テスト分は skipped_test、count に含めない)
      await adminClient.from("email_send_logs").upsert(
        {
          campaign_id: camp.id,
          recipient_email: testRecipient,
          status: sendResult.ok ? "skipped_test" : "failed",
          resend_message_id: sendResult.messageId ?? null,
          error_message: sendResult.error ?? null,
          sent_at: new Date().toISOString(),
        },
        { onConflict: "campaign_id,recipient_email" }
      );

      return new Response(
        JSON.stringify({
          mode: "test",
          success: sendResult.ok,
          message_id: sendResult.messageId,
          error: sendResult.error,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ====================================================
    // 本番送信 (mass mode)
    // ====================================================

    // ロック取得 (atomic)
    const { data: lockAcquired, error: lockErr } = await callerClient.rpc(
      "acquire_campaign_send_lock",
      { p_campaign_id: camp.id }
    );
    if (lockErr || lockAcquired !== true) {
      return new Response(
        JSON.stringify({
          error: "lock_failed",
          message:
            "送信中、または送信不可な状態 (status=sent / 既に sending)",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let totalSent = 0;
    let totalFailed = 0;

    try {
      // 受信者を抽出 (target_filter.type='all' のみ MVP)
      // 条件: email IS NOT NULL AND email_opt_out = false
      const { data: profiles, error: pErr } = await adminClient
        .from("profiles")
        .select("user_id, email, display_name")
        .eq("email_opt_out", false)
        .not("email", "is", null);
      if (pErr) throw pErr;

      const recipients: Recipient[] = (profiles ?? [])
        .filter((p: any) => p.email && p.email.trim() !== "")
        .map((p: any) => ({
          email: p.email,
          user_id: p.user_id,
          display_name: p.display_name,
        }));

      // 既に sent 済の log を取得してスキップ
      const { data: existingLogs } = await adminClient
        .from("email_send_logs")
        .select("recipient_email, status")
        .eq("campaign_id", camp.id);
      const alreadySent = new Set(
        (existingLogs ?? [])
          .filter((l: any) => l.status === "sent")
          .map((l: any) => l.recipient_email)
      );
      const toSend = recipients.filter((r) => !alreadySent.has(r.email));

      console.log(
        `[send-campaign-email] mass: total=${recipients.length} alreadySent=${alreadySent.size} toSend=${toSend.length}`
      );

      // 順次送信
      for (const r of toSend) {
        // unsubscribe トークン発行 (受信者ごと、毎回新規)
        const token = generateToken();
        const { error: tokenErr } = await adminClient
          .from("email_unsubscribe_tokens")
          .insert({
            token,
            email: r.email,
            user_id: r.user_id,
            campaign_id: camp.id,
          });
        if (tokenErr) {
          console.error("token insert failed", { email: r.email, tokenErr });
          // トークンなしでは送信しない (法的要件)
          await upsertLog(adminClient, {
            campaign_id: camp.id,
            recipient_email: r.email,
            recipient_user_id: r.user_id,
            status: "failed",
            error_message: `token_generation_failed: ${tokenErr.message}`,
          });
          totalFailed++;
          continue;
        }

        const unsubscribeUrl = `${appBaseUrl}/unsubscribe?token=${token}`;
        const vars = {
          unsubscribe_url: unsubscribeUrl,
          name: r.display_name ?? "",
          email: r.email,
        };
        const html = replaceVariables(camp.body_html, vars);
        const text = camp.body_text
          ? replaceVariables(camp.body_text, vars)
          : undefined;

        const sendResult = await sendViaResend(resendKey, {
          from: "noreply@kaigopoint.com",
          to: r.email,
          subject: camp.subject,
          html,
          text,
          unsubscribeUrl,
        });

        await upsertLog(adminClient, {
          campaign_id: camp.id,
          recipient_email: r.email,
          recipient_user_id: r.user_id,
          status: sendResult.ok ? "sent" : "failed",
          resend_message_id: sendResult.messageId ?? null,
          error_message: sendResult.error ?? null,
        });

        if (sendResult.ok) totalSent++;
        else totalFailed++;
      }

      // skipped_unsubscribed の処理: email_opt_out=true のユーザー
      // (filter で既に除外済み、ログにも残さない)

      // 最終 status 判定
      const totalAttempted = totalSent + totalFailed;
      const finalStatus =
        totalAttempted === 0
          ? "sent" // 既に全員送信済 (再送なし)
          : totalFailed === 0
            ? "sent"
            : totalSent === 0
              ? "failed"
              : "partial_failed";

      // ロック解放 + status 確定
      // 累積 count: 既存 sent + 今回 sent
      const finalSent = alreadySent.size + totalSent;
      await callerClient.rpc("release_campaign_send_lock", {
        p_campaign_id: camp.id,
        p_status: finalStatus,
        p_sent_count: finalSent,
        p_failed_count: totalFailed,
      });

      return new Response(
        JSON.stringify({
          mode: "mass",
          status: finalStatus,
          sent: totalSent,
          failed: totalFailed,
          already_sent: alreadySent.size,
          total_eligible: recipients.length,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (e) {
      console.error("[send-campaign-email] mass error", e);
      // 緊急ロック解放 (failed)
      await callerClient.rpc("release_campaign_send_lock", {
        p_campaign_id: camp.id,
        p_status: "failed",
        p_sent_count: totalSent,
        p_failed_count: totalFailed,
      });
      return new Response(
        JSON.stringify({
          error: e instanceof Error ? e.message : "unknown error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (e) {
    console.error("[send-campaign-email] unexpected", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ===== Helper: Resend API 呼び出し =====
async function sendViaResend(
  apiKey: string,
  args: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
    unsubscribeUrl?: string;
  }
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: args.from,
        to: args.to,
        subject: args.subject,
        html: args.html,
        text: args.text,
        // List-Unsubscribe ヘッダー (Gmail 等の "Unsubscribe" 表示対応、特定電子メール法準拠)
        ...(args.unsubscribeUrl
          ? {
              headers: {
                "List-Unsubscribe": `<${args.unsubscribeUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            }
          : {}),
      }),
    });
    const json: ResendResponse = await resp.json();
    if (resp.ok && json.id) {
      return { ok: true, messageId: json.id };
    }
    return { ok: false, error: json.message ?? `HTTP ${resp.status}` };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "fetch failed",
    };
  }
}

// ===== Helper: ログ upsert =====
async function upsertLog(
  client: ReturnType<typeof createClient>,
  payload: {
    campaign_id: string;
    recipient_email: string;
    recipient_user_id?: string | null;
    status: string;
    resend_message_id?: string | null;
    error_message?: string | null;
  }
) {
  const { error } = await client
    .from("email_send_logs")
    .upsert(
      {
        ...payload,
        sent_at: new Date().toISOString(),
      },
      { onConflict: "campaign_id,recipient_email" }
    );
  if (error) {
    console.error("upsertLog failed", { payload, error });
  }
}
