"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/serverClient";

export async function updateProfileAction(formData: FormData) {
  const fullName = String(formData.get("fullName") || "").trim();
  const organisation = String(formData.get("organisation") || "").trim();
  const bio = String(formData.get("bio") || "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/signin");
  }

  await supabase.auth.updateUser({
    data: {
      full_name: fullName || null,
      organisation: organisation || null,
      bio: bio || null,
    },
  });

  return redirect("/account?status=profile-saved");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/signin");
}
