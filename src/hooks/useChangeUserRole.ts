import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type UserRole = "admin" | "user";

interface ChangeRoleVars {
  userId: string;
  role: UserRole;
}

/**
 * 管理者がユーザーの権限を変更する RPC ラッパー。
 *
 * サーバー側 (change_user_role RPC) で以下のガードを実施:
 * - 呼び出し元が is_admin であること
 * - 自分自身の権限変更は禁止
 * - new_role の値検証 ('admin' | 'user')
 *
 * クライアント側はそれを呼ぶだけ。失敗時は toast 表示。
 */
export const useChangeUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: ChangeRoleVars) => {
      const { error } = await supabase.rpc("change_user_role", {
        target_user_id: userId,
        new_role: role,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({
        title:
          vars.role === "admin"
            ? "管理者に昇格しました"
            : "管理者を解除しました",
      });
      // useQuery を使う画面 (UserDetailModal) のキャッシュを invalidate
      queryClient.invalidateQueries({ queryKey: ["adminUserDetail"] });
    },
    onError: (error: Error) => {
      toast({
        title: "権限変更に失敗しました",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
