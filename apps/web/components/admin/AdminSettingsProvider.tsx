'use client';

import React, { createContext, useContext } from 'react';
import type { AdminNotification, EmailTemplate, LoginEntry, StoreSettings } from '@/types/admin';

export interface TelegramSpecialist {
  id: string;
  name: string;
  title: string;
  status: 'active' | 'on_leave' | 'archived';
  /** Who they are in Telegram, when connected. */
  telegram: { name: string; connectedAt: string } | null;
  /** The admin login linked to them (set under Admin users). */
  adminName: string | null;
}

export interface AdminSettings {
  settings: StoreSettings;
  email: { senderName: string; senderEmail: string; replyTo: string };
  /** Whether RESEND_API_KEY is set (the key itself never leaves the server). */
  resendConfigured: boolean;
  templates: EmailTemplate[];
  notifications: AdminNotification[];
  telegram: {
    chatId: string;
    chatTitle: string;
    ordersChatId: string;
    ordersChatTitle: string;
    notifyOrders: boolean;
    notifyAppointments: boolean;
    notifySpecialists: boolean;
    orderTemplate: string;
    appointmentTemplate: string;
    /** Each specialist's private Telegram and the admin login linked to them (Telegram page only). */
    specialists: TelegramSpecialist[];
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
