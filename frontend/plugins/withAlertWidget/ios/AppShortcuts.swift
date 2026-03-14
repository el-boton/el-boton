import AppIntents

@available(iOS 17.0, *)
struct ElBotonAppShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        [
            AppShortcut(
                intent: TriggerAlertIntent(),
                phrases: [
                    "Send alert with \(.applicationName)",
                    "Trigger alert with \(.applicationName)",
                    "Get help with \(.applicationName)"
                ],
                shortTitle: "Send Alert",
                systemImageName: "exclamationmark.triangle.fill"
            )
        ]
    }

    static var shortcutTileColor: ShortcutTileColor = .red
}
