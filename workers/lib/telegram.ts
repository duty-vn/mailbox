// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

/**
 * Telegram Bot API helpers for new-email notifications.
 */

export interface TelegramSettings {
	enabled: boolean;
	botToken: string;
	chatId: string;
}

/** Bot tokens look like `123456789:AA...`; validating also keeps the URL path safe. */
const BOT_TOKEN_RE = /^\d+:[A-Za-z0-9_-]+$/;

export class TelegramError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "TelegramError";
	}
}

/**
 * Send a plain-text message via the Bot API `sendMessage` method.
 * Throws a TelegramError carrying Telegram's error description on failure.
 */
export async function sendTelegramMessage(
	botToken: string,
	chatId: string,
	text: string,
): Promise<void> {
	if (!BOT_TOKEN_RE.test(botToken)) throw new TelegramError("Invalid bot token format");
	const res = await fetch(
		`https://api.telegram.org/bot${botToken}/sendMessage`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4096) }),
		},
	);
	if (!res.ok) {
		const body = (await res.json().catch(() => ({}))) as { description?: string };
		throw new TelegramError(body.description || `Telegram API error: ${res.status}`);
	}
}

export function formatNewEmailNotification(mailboxId: string, subject: string): string {
	return `📧 New email in ${mailboxId}\n${subject || "(no subject)"}`;
}

/** Returns the Telegram settings if notifications are enabled and fully configured. */
export function getActiveTelegramSettings(
	settings: { telegram?: Partial<TelegramSettings> } | null | undefined,
): TelegramSettings | null {
	const tg = settings?.telegram;
	if (!tg?.enabled || !tg.botToken?.trim() || !tg.chatId?.trim()) return null;
	return { enabled: true, botToken: tg.botToken.trim(), chatId: tg.chatId.trim() };
}
