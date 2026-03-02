import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminRole = "admin" | "user";

interface CreateUserBody {
  email?: string;
  password?: string;
  role?: AdminRole;
}

interface UpdateUserBody {
  id?: string;
  email?: string;
  role?: AdminRole;
  password?: string;
}

interface UserProfileRow {
  id: string;
  email: string;
  role: AdminRole;
  created_at: string | null;
  updated_at: string | null;
}

interface AuthUserRow {
  id: string;
  email?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
}

const normalizeEmail = (value?: string): string =>
  value?.trim().toLowerCase() ?? "";

const normalizeRole = (value?: string): AdminRole =>
  value === "admin" ? "admin" : "user";

const assertPassword = (value: string): string | null => {
  if (value.length < 6) {
    return "Password minimal 6 karakter.";
  }
  return null;
};

const verifyAdminAccess = async (): Promise<{
  actorId?: string;
  error?: NextResponse;
}> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const metadataRole = user.user_metadata?.role;
  if (metadataRole === "admin") {
    return { actorId: user.id };
  }

  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).maybeSingle();

  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { actorId: user.id };
};

export async function GET() {
  try {
    const access = await verifyAdminAccess();
    if (access.error) {
      return access.error;
    }

    const adminClient = getSupabaseAdminClient();
    const [{ data: profileRows, error: profileError }, listResult] = await Promise.all([
      adminClient
        .from("user_profiles")
        .select("id, email, role, created_at, updated_at")
        .order("created_at", { ascending: false }),
      adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }
    if (listResult.error) {
      return NextResponse.json({ error: listResult.error.message }, { status: 400 });
    }

    const authMap = new Map<string, AuthUserRow>();
    for (const authUser of (listResult.data?.users ?? []) as AuthUserRow[]) {
      authMap.set(authUser.id, authUser);
    }

    const users = ((profileRows ?? []) as UserProfileRow[]).map((row) => {
      const authUser = authMap.get(row.id);
      return {
        id: row.id,
        email: authUser?.email ?? row.email,
        role: normalizeRole(row.role),
        createdAt: row.created_at ?? authUser?.created_at ?? null,
        updatedAt: row.updated_at ?? null,
        lastSignInAt: authUser?.last_sign_in_at ?? null,
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const access = await verifyAdminAccess();
    if (access.error) {
      return access.error;
    }

    const body = (await request.json()) as CreateUserBody;
    const email = normalizeEmail(body.email);
    const password = body.password ?? "";
    const role = normalizeRole(body.role);

    if (!email) {
      return NextResponse.json({ error: "Email wajib diisi." }, { status: 400 });
    }

    const passwordError = assertPassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
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

export async function PATCH(request: Request) {
  try {
    const access = await verifyAdminAccess();
    if (access.error) {
      return access.error;
    }

    const body = (await request.json()) as UpdateUserBody;
    const id = body.id?.trim();
    if (!id) {
      return NextResponse.json({ error: "ID user wajib diisi." }, { status: 400 });
    }

    const nextEmail = body.email ? normalizeEmail(body.email) : undefined;
    const nextRole = body.role ? normalizeRole(body.role) : undefined;
    const nextPassword = body.password ?? "";

    if (!nextEmail && !nextRole && !nextPassword) {
      return NextResponse.json({ error: "Tidak ada perubahan yang dikirim." }, { status: 400 });
    }

    if (nextPassword) {
      const passwordError = assertPassword(nextPassword);
      if (passwordError) {
        return NextResponse.json({ error: passwordError }, { status: 400 });
      }
    }

    const adminClient = getSupabaseAdminClient();
    const updatePayload: {
      email?: string;
      password?: string;
      user_metadata?: Record<string, unknown>;
    } = {};

    if (nextEmail) {
      updatePayload.email = nextEmail;
    }
    if (nextPassword) {
      updatePayload.password = nextPassword;
    }
    if (nextRole) {
      updatePayload.user_metadata = { role: nextRole };
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await adminClient.auth.admin.updateUserById(id, updatePayload);
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
    }

    if (nextEmail || nextRole) {
      const profilePayload: {
        id: string;
        email?: string;
        role?: AdminRole;
      } = { id };

      if (nextEmail) {
        profilePayload.email = nextEmail;
      }
      if (nextRole) {
        profilePayload.role = nextRole;
      }

      const { error: profileUpdateError } = await adminClient
        .from("user_profiles")
        .upsert(profilePayload, { onConflict: "id" });

      if (profileUpdateError) {
        return NextResponse.json({ error: profileUpdateError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const access = await verifyAdminAccess();
    if (access.error) {
      return access.error;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json({ error: "ID user wajib diisi." }, { status: 400 });
    }

    if (id === access.actorId) {
      return NextResponse.json(
        { error: "Tidak bisa menghapus akun admin yang sedang login." },
        { status: 400 },
      );
    }

    const adminClient = getSupabaseAdminClient();
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(id);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
