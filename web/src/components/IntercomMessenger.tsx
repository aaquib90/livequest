"use client";

import { useEffect, useRef } from "react";
import Intercom from "@intercom/messenger-js-sdk";

const DEFAULT_APP_ID = "bbrbwgix";

export default function IntercomMessenger() {
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    const appId = process.env.NEXT_PUBLIC_INTERCOM_APP_ID || DEFAULT_APP_ID;
    if (!appId) return;
    try {
      Intercom({ app_id: appId });
      initRef.current = true;
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to initialise Intercom messenger", error);
      }
    }
  }, []);

  return null;
}
