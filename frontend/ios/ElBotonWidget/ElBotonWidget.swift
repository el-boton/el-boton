import WidgetKit
import SwiftUI

struct ElBotonWidget: Widget {
    let kind: String = "ElBotonWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            ElBotonWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("El Boton")
        .description("Quick emergency alert button")
        .supportedFamilies([.systemSmall])
    }
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), isAuthenticated: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(
            date: Date(),
            isAuthenticated: SharedCredentials.isAuthenticated()
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> ()) {
        let entry = SimpleEntry(
            date: Date(),
            isAuthenticated: SharedCredentials.isAuthenticated()
        )
        // Update timeline every hour to check auth status
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let isAuthenticated: Bool
}

struct ElBotonWidgetEntryView: View {
    var entry: Provider.Entry

    var body: some View {
        if entry.isAuthenticated {
            Button(intent: TriggerAlertIntent()) {
                ZStack {
                    // Outer glow effect
                    Circle()
                        .fill(
                            RadialGradient(
                                gradient: Gradient(colors: [
                                    Color.red.opacity(0.3),
                                    Color.clear
                                ]),
                                center: .center,
                                startRadius: 30,
                                endRadius: 60
                            )
                        )

                    // Main button circle
                    Circle()
                        .fill(
                            RadialGradient(
                                gradient: Gradient(colors: [
                                    Color(red: 0.9, green: 0.2, blue: 0.2),
                                    Color(red: 0.7, green: 0.1, blue: 0.1)
                                ]),
                                center: .center,
                                startRadius: 0,
                                endRadius: 45
                            )
                        )
                        .frame(width: 90, height: 90)
                        .shadow(color: Color.red.opacity(0.5), radius: 8, x: 0, y: 4)

                    // Inner circle for depth
                    Circle()
                        .stroke(Color.white.opacity(0.2), lineWidth: 2)
                        .frame(width: 85, height: 85)

                    // Button content
                    VStack(spacing: 2) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 24, weight: .bold))
                            .foregroundColor(.white)

                        Text("HELP")
                            .font(.system(size: 14, weight: .black))
                            .foregroundColor(.white)

                        Text("Hold 3s")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundColor(.white.opacity(0.8))
                    }
                }
            }
            .buttonStyle(.plain)
        } else {
            // Not authenticated view
            VStack(spacing: 8) {
                Image(systemName: "lock.fill")
                    .font(.system(size: 28))
                    .foregroundColor(.gray)

                Text("Open app")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.gray)

                Text("to sign in")
                    .font(.system(size: 10))
                    .foregroundColor(.gray.opacity(0.8))
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

#Preview(as: .systemSmall) {
    ElBotonWidget()
} timeline: {
    SimpleEntry(date: .now, isAuthenticated: true)
    SimpleEntry(date: .now, isAuthenticated: false)
}
