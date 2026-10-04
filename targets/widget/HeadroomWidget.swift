// Headroom's iOS widget: steps against the daily goal, and the latest VO2 max with its trend.
//
// It can't open the app's database, so after every sync the app writes a small JSON snapshot to
// the App Group they share (src/sync/iosWidget.ts) and asks WidgetKit to redraw. All the maths,
// including the VO2 max trend, happens in the app; this file only lays the numbers out.

import SwiftUI
import WidgetKit

private let appGroup = "group.com.manasmehrotra.headroom"
private let snapshotKey = "widget"

// MARK: - Data

struct Snapshot: Decodable {
  let steps: Int?
  let stepGoal: Int
  let vo2: Double?
  let vo2Change: Double?
  let vo2Trend: String
  /// Epoch milliseconds.
  let updatedAt: Double

  static func load() -> Snapshot? {
    guard
      let json = UserDefaults(suiteName: appGroup)?.string(forKey: snapshotKey),
      let data = json.data(using: .utf8)
    else { return nil }
    return try? JSONDecoder().decode(Snapshot.self, from: data)
  }

  /// Shown in the widget gallery before the app has synced anything.
  static let sample = Snapshot(
    steps: 6_420, stepGoal: 8_000, vo2: 45.3, vo2Change: 0.8, vo2Trend: "rising",
    updatedAt: Date().timeIntervalSince1970 * 1000)

  var progress: Double {
    guard let steps, stepGoal > 0 else { return 0 }
    return min(1, Double(steps) / Double(stepGoal))
  }

  var goalHit: Bool { (steps ?? 0) >= stepGoal }

  var stepsText: String { steps.map { $0.formatted(.number) } ?? "—" }

  /// 9684 -> "9.7k", 812 -> "812"
  var stepsCompact: String {
    guard let steps else { return "—" }
    if steps < 1000 { return "\(steps)" }
    let thousands = Double(steps) / 1000
    let text = steps >= 10_000 ? String(format: "%.0f", thousands) : String(format: "%.1f", thousands)
    return (text.hasSuffix(".0") ? String(text.dropLast(2)) : text) + "k"
  }

  var remainingText: String {
    guard let steps else { return "Open Headroom to sync" }
    return steps >= stepGoal ? "Goal hit" : "\((stepGoal - steps).formatted(.number)) to go"
  }

  var updatedText: String {
    Date(timeIntervalSince1970: updatedAt / 1000).formatted(date: .omitted, time: .shortened)
  }

  var vo2Text: String { vo2.map { String(format: "%.1f", $0) } ?? "—" }

  var trendText: String {
    guard vo2 != nil else { return "no reading" }
    guard let change = vo2Change else { return "first reading" }
    let arrow = vo2Trend == "rising" ? "▲" : vo2Trend == "falling" ? "▼" : "→"
    return "\(arrow) \(change > 0 ? "+" : "")\(String(format: "%.1f", change))"
  }
}

// MARK: - Timeline

struct StatsEntry: TimelineEntry {
  let date: Date
  let snapshot: Snapshot?
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> StatsEntry {
    StatsEntry(date: .now, snapshot: .sample)
  }

  func getSnapshot(in context: Context, completion: @escaping (StatsEntry) -> Void) {
    completion(StatsEntry(date: .now, snapshot: Snapshot.load() ?? (context.isPreview ? .sample : nil)))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<StatsEntry>) -> Void) {
    // The app reloads the widget after each sync; this later refresh is only a fallback.
    let entry = StatsEntry(date: .now, snapshot: Snapshot.load())
    completion(Timeline(entries: [entry], policy: .after(.now.addingTimeInterval(30 * 60))))
  }
}

// MARK: - Look

/// The app's colours, from src/ui/theme.ts.
private enum Palette {
  static let accent = Color(red: 74 / 255, green: 222 / 255, blue: 128 / 255)
  static let accentDim = Color(red: 60 / 255, green: 154 / 255, blue: 105 / 255)
  static let dim = Color(red: 160 / 255, green: 157 / 255, blue: 171 / 255)
  static let warning = Color(red: 251 / 255, green: 191 / 255, blue: 36 / 255)
  /// Slate into plum into near-black, like the backdrop behind every app screen.
  static let backdrop = LinearGradient(
    colors: [
      Color(red: 58 / 255, green: 69 / 255, blue: 86 / 255),
      Color(red: 44 / 255, green: 36 / 255, blue: 51 / 255),
      Color(red: 11 / 255, green: 10 / 255, blue: 16 / 255),
    ],
    startPoint: .topLeading, endPoint: .bottomTrailing)
}

private struct Caption: View {
  let text: String
  init(_ text: String) { self.text = text }
  var body: some View {
    Text(text).font(.system(size: 10, weight: .semibold)).tracking(0.8).foregroundStyle(Palette.dim)
  }
}

private struct BigNumber: View {
  let text: String
  var body: some View {
    Text(text)
      .font(.system(size: 26, weight: .bold, design: .rounded))
      .foregroundStyle(.white)
      .minimumScaleFactor(0.6)
      .lineLimit(1)
  }
}

private func trendColor(_ s: Snapshot) -> Color {
  s.vo2Trend == "rising" ? Palette.accent : s.vo2Trend == "falling" ? Palette.warning : Palette.dim
}

private struct StepsBar: View {
  let snapshot: Snapshot
  var body: some View {
    ProgressView(value: snapshot.progress)
      .tint(snapshot.goalHit ? Palette.accent : Palette.accentDim)
  }
}

// Home screen, medium: steps on the left, VO2 max on the right, like the Android widget.
private struct MediumView: View {
  let s: Snapshot
  var body: some View {
    HStack(alignment: .center, spacing: 16) {
      VStack(alignment: .leading, spacing: 4) {
        Caption("STEPS")
        HStack(alignment: .firstTextBaseline, spacing: 6) {
          BigNumber(text: s.stepsText)
          Text("of \(s.stepGoal.formatted(.number))").font(.caption).foregroundStyle(Palette.dim)
        }
        StepsBar(snapshot: s)
        Text("\(s.remainingText) · \(s.updatedText)").font(.caption2).foregroundStyle(Palette.dim).lineLimit(1)
      }
      VStack(alignment: .leading, spacing: 4) {
        Caption("VO2 MAX")
        BigNumber(text: s.vo2Text)
        Text(s.trendText).font(.caption2).foregroundStyle(trendColor(s)).lineLimit(1)
      }
      .frame(minWidth: 72, alignment: .leading)
    }
  }
}

// Home screen, small: steps up top, VO2 max underneath.
private struct SmallView: View {
  let s: Snapshot
  var body: some View {
    VStack(alignment: .leading, spacing: 5) {
      Caption("STEPS")
      BigNumber(text: s.stepsText)
      StepsBar(snapshot: s)
      Text(s.remainingText).font(.caption2).foregroundStyle(Palette.dim).lineLimit(1)
      Spacer(minLength: 0)
      HStack(alignment: .firstTextBaseline, spacing: 4) {
        Caption("VO2")
        Text(s.vo2Text).font(.system(size: 15, weight: .bold, design: .rounded)).foregroundStyle(.white)
        Text(s.trendText).font(.caption2).foregroundStyle(trendColor(s)).lineLimit(1)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

// Lock screen: a ring filling toward the goal.
private struct CircularView: View {
  let s: Snapshot
  var body: some View {
    Gauge(value: s.progress) {
      Image(systemName: "figure.walk")
    } currentValueLabel: {
      Text(s.stepsCompact)
    }
    .gaugeStyle(.accessoryCircularCapacity)
  }
}

// Lock screen: both numbers with a bar.
private struct RectangularView: View {
  let s: Snapshot
  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text("\(s.stepsText) steps").font(.headline).widgetAccentable()
      Gauge(value: s.progress) { EmptyView() }.gaugeStyle(.accessoryLinearCapacity)
      Text("VO2 max \(s.vo2Text)  \(s.trendText)").font(.caption).lineLimit(1)
    }
  }
}

struct StatsWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: StatsEntry

  var body: some View {
    content.containerBackground(for: .widget) { Palette.backdrop }
  }

  @ViewBuilder private var content: some View {
    if let s = entry.snapshot {
      switch family {
      case .accessoryCircular: CircularView(s: s)
      case .accessoryRectangular: RectangularView(s: s)
      case .accessoryInline: Text("\(s.stepsCompact) steps · VO2 \(s.vo2Text)")
      case .systemSmall: SmallView(s: s)
      default: MediumView(s: s)
      }
    } else if family == .accessoryInline || family == .accessoryCircular || family == .accessoryRectangular {
      Text("Open Headroom")
    } else {
      VStack(alignment: .leading, spacing: 4) {
        Caption("HEADROOM")
        Text("Open the app to sync your steps and VO2 max.").font(.caption).foregroundStyle(.white)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
  }
}

// MARK: - Widget

struct HeadroomStatsWidget: Widget {
  let kind = "HeadroomStats"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      StatsWidgetView(entry: entry)
    }
    .configurationDisplayName("Steps and VO2 max")
    .description("Steps today against your goal, and your latest VO2 max.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
  }
}

@main
struct HeadroomWidgets: WidgetBundle {
  var body: some Widget {
    HeadroomStatsWidget()
  }
}
