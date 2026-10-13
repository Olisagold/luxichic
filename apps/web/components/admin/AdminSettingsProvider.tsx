'use client';

import React, { createContext, useContext } from 'react';
import type { AdminNotification, EmailTemplate, LoginEntry, StoreSettings } from '@/types/admin';

export interface AdminSettings {
  settings: StoreSettings;
  email: { senderName: string; senderEmail: string; replyTo: string };
  /** Whether RESEND_API_KEY is set (the key itself never leaves the server). */
  resendConfigured: boolean;
  templates: EmailTemplate[];
  notifications: AdminNotification[];
  telegram: {
    chatId: string;
    notifyOrders: boolean;
    notifyAppointments: boolean;
    orderTemplate: string;
    appointmentTemplate: string;
    /** Bot connection, checked on the server: the bot's username, or why it isn't connected. */
    status: { connected: true; username: string } | { connected: false; reason: string };
    /** TELEGRAM_ADMIN_CHAT_ID, used when no chat is saved here. */
    envChatId: boolean;
  };
  /** Recent sign-ins (Security page only): the admin's own, or everyone's for the owner and `admins.manage`. */
  logins: LoginEntry[];
}

const AdminSettingsContext = createContext<AdminSettings | null>(null);

/** Store settings for the admin operations and settings pages, read on the server by each page (uncached). */
export function AdminSettingsProvider({ value, children }: { value: AdminSettings; children: React.ReactNode }) {
  return <AdminSettingsContext.Provider value={value}>{children}</AdminSettingsContext.Provider>;
}

export function useAdminSettings(): AdminSettings {
  const ctx = useContext(AdminSettingsContext);
  if (!ctx) throw new Error('useAdminSettings must be used inside an admin settings page');
  return ctx;
}
