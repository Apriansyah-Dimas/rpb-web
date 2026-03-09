import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface ResolveBody {
  identifier?: string;
}

const isEmailLike = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const normalizeUsername = (value: string): string =>
  `${value.charAt(0).toUpperCase()}${value.slice(1).toLowerCase()}`;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResolveBody;
    const identifier = body.identifier?.trim() ?? "";

    if (!identifier) {
      return NextResponse.json({ error: "Identifier wajib diisi." }, { status: 400 });
    }

    if (isEmailLike(identifier)) {
      return NextResponse.json({ email: identifier.toLowerCase() });
    }
    if (/\s/.test(identifier)) {
      return NextResponse.json({ error: "Kredensial tidak valid." }, { status: 401 });
    }

    const normalizedUsername = normalizeUsername(identifier);

    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("user_profiles")
      .select("email")
      .eq("username", normalizedUsername)
      .limit(2);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data || data.length !== 1) {
      return NextResponse.json({ error: "Kredensial tidak valid." }, { status: 401 });
    }

    const email = String(data[0].email ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Kredensial tidak valid." }, { status: 401 });
    }

    return NextResponse.json({ email });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
