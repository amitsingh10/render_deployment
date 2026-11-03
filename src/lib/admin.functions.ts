import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loginToEmail, normalizeUsername } from "@/lib/username";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Only admin can do this");
}

export const createStallUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { username: string; password: string; fullName: string; stallIds: string[] }) => {
      const u = normalizeUsername(input.username ?? "");
      if (!/^[a-z0-9._-]{3,30}$/.test(u)) throw new Error("Login ID 3-30 letters/numbers ka ho (space nahi)");
      if (!input.password || input.password.length < 6) throw new Error("Password min 6 characters");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: loginToEmail(data.username),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user)
      throw new Error(error?.message?.includes("already") ? "Ye Login ID pehle se hai" : error?.message ?? "Could not create user");
    await supabaseAdmin.from("profiles").update({ username: normalizeUsername(data.username) }).eq("id", created.user.id);
    if (data.stallIds.length) {
      await supabaseAdmin
        .from("user_stalls")
        .insert(data.stallIds.map((s) => ({ user_id: created.user!.id, stall_id: s })));
    }
    return { id: created.user.id };
  });

export const deleteStallUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("You cannot delete yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_stalls").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
