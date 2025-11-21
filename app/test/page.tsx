"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestPage() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchTest() {
      const { data, error } = await supabase.from("subject").select("*");
      if (error) console.log(error);
      setData(data);
    }
    fetchTest();
  }, []);

  return (
    <div>
      <h1>Supabase Test</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
