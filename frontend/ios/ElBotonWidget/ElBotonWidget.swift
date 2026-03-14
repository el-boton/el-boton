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
        .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryRectangular, .accessoryInline])
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
    @Environment(\.widgetFamily) private var family
    var entry: Provider.Entry

    var body: some View {
        Button(intent: TriggerAlertIntent()) {
            switch family {
            case .accessoryCircular:
                circularWidget
            case .accessoryRectangular:
                rectangularWidget
            case .accessoryInline:
                inlineWidget
            default:
                smallWidget
            }
        }
        .buttonStyle(.plain)
    }

    private var smallWidget: some View {
        Group {
            if entry.isAuthenticated {
                ZStack {
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

                    Circle()
                        .stroke(Color.white.opacity(0.2), lineWidth: 2)
                        .frame(width: 85, height: 85)

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
            } else {
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

    private var circularWidget: some View {
        ZStack {
            AccessoryWidgetBackground()

            Circle()
                .fill(entry.isAuthenticated ? Color.red : Color.gray.opacity(0.45))
                .overlay(
                    Image(systemName: entry.isAuthenticated ? "exclamationmark.triangle.fill" : "lock.fill")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                )
                .padding(8)
        }
    }

    private var rectangularWidget: some View {
        HStack(spacing: 10) {
            ZStack {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(entry.isAuthenticated ? Color.red : Color.gray.opacity(0.35))
                    .frame(width: 34, height: 34)

                Image(systemName: entry.isAuthenticated ? "exclamationmark.triangle.fill" : "lock.fill")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(entry.isAuthenticated ? "Send Alert" : "Open El Boton")
                    .font(.system(size: 13, weight: .semibold))
                    .lineLimit(1)

                Text(entry.isAuthenticated ? "Emergency shortcut" : "Sign in to enable")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer(minLength: 0)
        }
    }

    private var inlineWidget: some View {
        HStack(spacing: 4) {
            Image(systemName: entry.isAuthenticated ? "exclamationmark.triangle.fill" : "lock.fill")
            Text(entry.isAuthenticated ? "El Boton Alert" : "Open El Boton")
        }
    }
}

#Preview(as: .systemSmall) {
    ElBotonWidget()
} timeline: {
    SimpleEntry(date: .now, isAuthenticated: true)
    SimpleEntry(date: .now, isAuthenticated: false)
}

#Preview(as: .accessoryRectangular) {
    ElBotonWidget()
} timeline: {
    SimpleEntry(date: .now, isAuthenticated: true)
}
