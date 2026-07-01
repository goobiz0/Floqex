"use server";

import { revalidatePath } from "next/cache";

// Since DB push fails without DIRECT_URL, we'll mock the notifications in memory.
export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

let mockNotifications: NotificationItem[] = [
  {
    id: "notif_1",
    title: "System Update",
    message: "Trading engine v2.1 deployed successfully.",
    isRead: false,
    createdAt: new Date().toISOString(),
  }
];

export async function getMockNotifications() {
  return mockNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function generateTestAlert() {
  const newNotif: NotificationItem = {
    id: `notif_${Date.now()}`,
    title: "Risk Alert",
    message: `High volatility detected at ${new Date().toLocaleTimeString()}`,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  mockNotifications.push(newNotif);
  revalidatePath("/dashboard");
}

export async function markAsRead(id: string) {
  const notif = mockNotifications.find(n => n.id === id);
  if (notif) {
    notif.isRead = true;
  }
  revalidatePath("/dashboard");
}

export async function markAllAsRead() {
  mockNotifications.forEach(n => {
    n.isRead = true;
  });
  revalidatePath("/dashboard");
}

export async function deleteNotification(id: string) {
  mockNotifications = mockNotifications.filter(n => n.id !== id);
  revalidatePath("/dashboard");
}

export async function clearAllNotifications() {
  mockNotifications = [];
  revalidatePath("/dashboard");
}

