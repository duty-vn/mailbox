// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { Button, Input, Loader, Switch, useKumoToastManager } from "@cloudflare/kumo";
import { PaperPlaneTiltIcon, TelegramLogoIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { useMailbox, useUpdateMailbox } from "~/queries/mailboxes";
import api from "~/services/api";

export default function SettingsRoute() {
	const { mailboxId } = useParams<{ mailboxId: string }>();
	const toastManager = useKumoToastManager();
	const { data: mailbox } = useMailbox(mailboxId);
	const updateMailboxMutation = useUpdateMailbox();

	const [displayName, setDisplayName] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [telegramEnabled, setTelegramEnabled] = useState(false);
	const [telegramBotToken, setTelegramBotToken] = useState("");
	const [telegramChatId, setTelegramChatId] = useState("");
	const [isTestingTelegram, setIsTestingTelegram] = useState(false);

	useEffect(() => {
		if (mailbox) {
			setDisplayName(mailbox.settings?.fromName || mailbox.name || "");
			setTelegramEnabled(mailbox.settings?.telegram?.enabled ?? false);
			setTelegramBotToken(mailbox.settings?.telegram?.botToken || "");
			setTelegramChatId(mailbox.settings?.telegram?.chatId || "");
		}
	}, [mailbox]);

	const handleSave = async () => {
		if (!mailbox || !mailboxId) return;
		if (telegramEnabled && (!telegramBotToken.trim() || !telegramChatId.trim())) {
			toastManager.add({
				title: "Telegram bot token and chat ID are required",
				variant: "error",
			});
			return;
		}
		setIsSaving(true);
		const settings = {
			...mailbox.settings,
			fromName: displayName,
			telegram: {
				enabled: telegramEnabled,
				botToken: telegramBotToken.trim(),
				chatId: telegramChatId.trim(),
			},
		};
		try {
			await updateMailboxMutation.mutateAsync({ mailboxId, settings });
			toastManager.add({ title: "Settings saved!" });
		} catch {
			toastManager.add({
				title: "Failed to save settings",
				variant: "error",
			});
		} finally {
			setIsSaving(false);
		}
	};

	const handleTestTelegram = async () => {
		if (!mailboxId) return;
		setIsTestingTelegram(true);
		try {
			await api.testTelegram(mailboxId, telegramBotToken.trim(), telegramChatId.trim());
			toastManager.add({ title: "Test notification sent!" });
		} catch (e) {
			toastManager.add({
				title: "Failed to send test notification",
				description: (e as Error).message,
				variant: "error",
			});
		} finally {
			setIsTestingTelegram(false);
		}
	};

	if (!mailbox) {
		return (
			<div className="flex justify-center py-20">
				<Loader size="lg" />
			</div>
		);
	}

	return (
		<div className="max-w-2xl px-4 py-4 md:px-8 md:py-6 h-full overflow-y-auto">
			<h1 className="text-lg font-semibold text-kumo-default mb-6">Settings</h1>

			<div className="space-y-6">
				{/* Account */}
				<div className="rounded-lg border border-kumo-line bg-kumo-base p-5">
					<div className="text-sm font-medium text-kumo-default mb-4">
						Account
					</div>
					<div className="space-y-3">
						<Input
							label="Display Name"
							value={displayName}
							onChange={(e) => setDisplayName(e.target.value)}
						/>
						<Input label="Email" type="email" value={mailbox.email} disabled />
					</div>
				</div>

				{/* Telegram notifications */}
				<div className="rounded-lg border border-kumo-line bg-kumo-base p-5">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-2">
							<TelegramLogoIcon size={16} weight="duotone" className="text-kumo-subtle" />
							<span className="text-sm font-medium text-kumo-default">
								Telegram Notifications
							</span>
						</div>
						<Switch
							label="Enabled"
							checked={telegramEnabled}
							onCheckedChange={setTelegramEnabled}
						/>
					</div>
					<p className="text-xs text-kumo-subtle mb-3">
						Post the subject of each new email to a Telegram group. Create a bot
						with @BotFather, add it to the group, then enter the bot token and the
						group's chat ID (usually starts with <code>-100</code>).
					</p>
					<div className="space-y-3">
						<Input
							label="Bot Token"
							type="password"
							autoComplete="off"
							placeholder="123456789:AA..."
							value={telegramBotToken}
							onChange={(e) => setTelegramBotToken(e.target.value)}
						/>
						<Input
							label="Chat ID"
							placeholder="-1001234567890"
							value={telegramChatId}
							onChange={(e) => setTelegramChatId(e.target.value)}
						/>
						<div className="flex justify-end">
							<Button
								variant="secondary"
								size="sm"
								icon={<PaperPlaneTiltIcon size={14} />}
								onClick={handleTestTelegram}
								loading={isTestingTelegram}
								disabled={!telegramBotToken.trim() || !telegramChatId.trim()}
							>
								Send test
							</Button>
						</div>
					</div>
				</div>

				{/* Save */}
				<div className="flex justify-end">
					<Button variant="primary" onClick={handleSave} loading={isSaving}>
						Save Changes
					</Button>
				</div>
			</div>
		</div>
	);
}
