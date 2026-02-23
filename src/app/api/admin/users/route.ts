import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface CreateUserBody {
  email?: string;
  password?: string;
  role?: "admin" | "user";
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as CreateUserBody;
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    const role = body.role === "admin" ? "admin" : "user";

    if (!email || password.length < 6) {
      return NextResponse.json(
        { error: "Email wajib dan password minimal 6 karakter." },
        { status: 400 },
      );
    }

    const adminClient = getSupabaseAdminClient();
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role },
    });

    if (createError || !created.user) {
      return NextResponse.json(
        { error: createError?.message ?? "Gagal membuat user." },
        { status: 400 },
      );
    }

    const { error: profileUpsertError } = await adminClient.from("user_profiles").upsert(
      {
        id: created.user.id,
        email,
        role,
      },
      { onConflict: "id" },
    );

    if (profileUpsertError) {
      return NextResponse.json({ error: profileUpsertError.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: created.user.id,
        email,
        role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
