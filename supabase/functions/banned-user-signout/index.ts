// banned-user-signout Edge Function
// 管理者がユーザーを凍結した時に呼び出され、対象ユーザーのセッションを即時破棄する。
//
// セキュリティ:
// - 呼び出し元の JWT を検証
// - JWT から取得した user_id が profiles.is_admin = true であることを確認
// - 確認後、service_role クライアントで auth.admin.signOut(target_user_id) を実行
//
// 環境変数 (Supabase Function secret):
// - SUPABASE_URL              (自動セット)
// - SUPABASE_ANON_KEY         (自動セット、JWT検証用)
// - SERVICE_ROLE_KEY          (手動セット必要、auth.admin 用)
//   ※ "SUPABASE_" 接頭辞は Supabase secrets set でブロックされる予約名のため、
//      接頭辞なしの SERVICE_ROLE_KEY として登録する。

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  user_id: string;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // ===== 1. 入力 parse =====
    const body: RequestBody = await req.json();
    if (!body.user_id || typeof body.user_id !== "string") {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== 2. 環境変数取得 =====
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("Missing env vars", {
        hasUrl: !!supabaseUrl,
        hasAnon: !!anonKey,
        hasService: !!serviceRoleKey,
      });
      return new Response(
        JSON.stringify({ error: "Server misconfigured: missing env vars" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== 3. 呼び出し元 JWT を検証 =====
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // anon クライアントで getUser() (JWT検証兼ねる)
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: callerErr,
    } = await callerClient.auth.getUser();

    if (callerErr || !caller) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== 4. 呼び出し元が管理者か確認 (is_admin RPC) =====
    const { data: isAdminData, error: isAdminErr } = await callerClient.rpc(
      "is_admin",
      { _user_id: caller.id }
    );

    if (isAdminErr || isAdminData !== true) {
      console.warn("Non-admin attempted signout", {
        caller: caller.id,
        target: body.user_id,
      });
      return new Response(
        JSON.stringify({ error: "Forbidden: admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== 5. service_role でセッション破棄 =====
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: signOutErr } = await adminClient.auth.admin.signOut(
      body.user_id
    );

    if (signOutErr) {
      console.error("signOut failed", {
        target: body.user_id,
        error: signOutErr.message,
      });
      return new Response(
        JSON.stringify({
          error: `signOut failed: ${signOutErr.message}`,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User session revoked", {
      caller: caller.id,
      target: body.user_id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Session revoked",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Unexpected error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
