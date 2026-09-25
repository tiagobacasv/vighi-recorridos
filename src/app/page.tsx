"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, getUser } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (!token || !user) {
      router.replace("/login/");
      return;
    }
    router.replace(user.rol === "CADETE" ? "/cadete/" : "/dashboard/");
  }, [router]);

  return null;
}
