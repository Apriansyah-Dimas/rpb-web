import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;

if (!url || !serviceRoleKey || !email || !password) {
  console.error(
    "Missing env. Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const lowerEmail = email.trim().toLowerCase();

const { data: usersPage, error: listError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

if (listError) {
  console.error("Failed to list users:", listError.message);
  process.exit(1);
}

let existing = usersPage.users.find((user) => user.email?.toLowerCase() === lowerEmail);

if (!existing) {
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: lowerEmail,
    password,
    email_confirm: true,
    user_metadata: { role: "admin" },
  });

  if (createError || !created.user) {
    console.error("Failed to create admin user:", createError?.message);
    process.exit(1);
  }

  existing = created.user;
  console.log("Created admin user:", lowerEmail);
} else {
  const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: { ...(existing.user_metadata ?? {}), role: "admin" },
  });

  if (updateError) {
    console.error("Failed to update admin user:", updateError.message);
    process.exit(1);
  }

  console.log("Updated existing user password/metadata:", lowerEmail);
}

const { error: profileError } = await supabase.from("user_profiles").upsert(
  {
    id: existing.id,
    email: lowerEmail,
    role: "admin",
  },
  { onConflict: "id" },
);

if (profileError) {
  console.error("Failed to upsert user_profiles admin role:", profileError.message);
  process.exit(1);
}

console.log("Admin role ensured in user_profiles for:", lowerEmail);
