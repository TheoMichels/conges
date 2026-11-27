import { useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { MONTH_LABELS, SHORT_MONTH_LABELS } from "../types/yearPlan";
import { colors, fonts, popShadow, tabular } from "../theme/colors";
import { formatDayNumber } from "../utils/format";
import { cumulativeDays } from "../utils/leaveStats";

type Props = {
  // Jours posés par mois (12 valeurs).
  months: number[];
  // Droits totaux de l'année : ligne horizontale de référence.
  total: number;
  // Mois en cours (0-11) si l'année affichée est l'année courante : la suite est en pointillés.
  currentMonth?: number;
};

const HEIGHT = 150;
const PAD = { top: 18, right: 10, bottom: 24, left: 30 };

// Cumul des jours posés sur l'année, comparé aux droits totaux.
export function CumulativeChart({ months, total, currentMonth }: Props) {
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const points = cumulativeDays(months);
  const maxValue = Math.max(total, points[12], 1) * 1.08;
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (boundary: number) => PAD.left + (boundary / 12) * plotW;
  const y = (value: number) => PAD.top + plotH - (value / maxValue) * plotH;
  const split = currentMonth === undefined ? 12 : currentMonth;
  const pathOf = (from: number, to: number) => points.slice(from, to + 1).map((value, i) => `${i === 0 ? "M" : "L"}${x(from + i).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  const solid = pathOf(0, split);
  const dashed = split < 12 ? pathOf(split, 12) : "";
  const area = `${solid} L${x(split).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;
  const over = points[12] > total;
  const ticks = [...new Set([0, Math.round(total / 2), total])];
  const summary = `Cumul des jours posés : ${months.map((_, i) => `${MONTH_LABELS[i]} ${formatDayNumber(points[i + 1])}`).join(", ")}. Droits totaux ${formatDayNumber(total)} jours.`;

  const hovered = hover === null ? null : { boundary: hover + 1, value: points[hover + 1], added: months[hover] };
  // Infobulle à côté du repère (jamais sur le point survolé).
  const TIP_W = 180;
  const anchor = hovered ? x(hovered.boundary) : 0;
  const tipLeft = !hovered ? 0 : anchor + 12 + TIP_W <= width ? anchor + 12 : Math.max(0, anchor - 12 - TIP_W);

  return (
    <View testID="cumulative-chart" style={styles.wrap} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)} accessibilityRole="image" accessibilityLabel={summary}>
      <View style={styles.head}>
        <Text style={styles.title}>Cumul des jours posés</Text>
        <View style={styles.key}><View style={styles.keyLine} /><Text style={styles.keyText}>Posés</Text></View>
        {split < 12 && <View style={styles.key}><View style={[styles.keyLine, styles.keyDashed]} /><Text style={styles.keyText}>À venir</Text></View>}
        <View style={styles.key}><View style={[styles.keyLine, styles.keyRef]} /><Text style={styles.keyText}>Droits totaux</Text></View>
      </View>
      <View style={styles.plot}>
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            {ticks.map((tick) => (
              <Line key={tick} x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} stroke={colors.divider} strokeWidth={1} />
            ))}
            <Line x1={PAD.left} x2={width - PAD.right} y1={y(total)} y2={y(total)} stroke={over ? colors.danger : colors.textFaint} strokeWidth={1.5} strokeDasharray="5 4" />
            {split > 0 && <Path d={area} fill={colors.primary} fillOpacity={0.08} />}
            {split > 0 && <Path d={solid} stroke={colors.primary} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />}
            {dashed ? <Path d={dashed} stroke={colors.primaryLight} strokeWidth={2} strokeDasharray="4 4" fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
            {split > 0 && split < 12 && <Circle cx={x(split)} cy={y(points[split])} r={4.5} fill={colors.primary} stroke={colors.panel} strokeWidth={2} />}
            {hovered && (
              <>
                <Line x1={x(hovered.boundary)} x2={x(hovered.boundary)} y1={PAD.top} y2={y(0)} stroke={colors.borderStrong} strokeWidth={1} />
                <Circle cx={x(hovered.boundary)} cy={y(hovered.value)} r={5} fill={hovered.boundary > split ? colors.primaryLight : colors.primary} stroke={colors.panel} strokeWidth={2} />
              </>
            )}
          </Svg>
        )}
        {ticks.map((tick) => (
          <Text key={tick} style={[styles.tick, { top: y(tick) - 7 }]}>{formatDayNumber(tick)}</Text>
        ))}
        {width > 0 && <Text style={[styles.refLabel, over && styles.refLabelOver, { top: y(total) - 16, right: PAD.right }]}>{formatDayNumber(total)} j de droits</Text>}
        <View style={[styles.months, { left: PAD.left, right: PAD.right }]}>
          {months.map((_, index) => (
            <Pressable
              key={index}
              accessibilityLabel={`${MONTH_LABELS[index]} : ${formatDayNumber(points[index + 1])} jours cumulés`}
              onHoverIn={() => setHover(index)}
              onHoverOut={() => setHover((current) => (current === index ? null : current))}
              onPress={() => setHover((current) => (current === index ? null : index))}
              style={styles.band}
            >
              <Text style={[styles.monthLabel, index === currentMonth && styles.monthNow]}>{SHORT_MONTH_LABELS[index].charAt(0).toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
        {hovered && hover !== null && (
          <View pointerEvents="none" style={[styles.tooltip, popShadow, { left: tipLeft }]}>
            <Text style={styles.tipTitle}>Fin {MONTH_LABELS[hover].toLowerCase()}</Text>
            <Text style={styles.tipValue}>{formatDayNumber(hovered.value)} j cumulés</Text>
            <Text style={styles.tipMeta}>{hovered.added > 0 ? `+${formatDayNumber(hovered.added)} j ce mois` : "Aucun congé ce mois"} · reste {formatDayNumber(total - hovered.value)} j</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.divider },
  head: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", columnGap: 14, rowGap: 4, marginBottom: 6 },
  title: { flex: 1, minWidth: 160, fontFamily: fonts.base, fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  key: { flexDirection: "row", alignItems: "center", gap: 6 },
  keyLine: { width: 16, height: 2, borderRadius: 1, backgroundColor: colors.primary },
  keyDashed: { backgroundColor: colors.primaryLight, width: 12 },
  keyRef: { backgroundColor: colors.textFaint },
  keyText: { fontFamily: fonts.base, fontSize: 12, color: colors.textSecondary },
  plot: { height: HEIGHT, position: "relative" },
  tick: { position: "absolute", left: 0, width: PAD.left - 6, textAlign: "right", fontFamily: fonts.base, fontSize: 10.5, color: colors.textSecondary, ...tabular },
  refLabel: { position: "absolute", fontFamily: fonts.base, fontSize: 11, fontWeight: "600", color: colors.textSecondary, ...tabular },
  refLabelOver: { color: colors.danger },
  months: { position: "absolute", top: 0, bottom: 0, flexDirection: "row" },
  band: { flex: 1, justifyContent: "flex-end", alignItems: "center", paddingBottom: 3 },
  monthLabel: { fontFamily: fonts.base, fontSize: 11, fontWeight: "600", color: colors.textSecondary },
  monthNow: { color: colors.ctaText },
  tooltip: { position: "absolute", top: 0, width: 180, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  tipTitle: { fontFamily: fonts.base, fontSize: 11.5, fontWeight: "600", color: colors.textSecondary },
  tipValue: { fontFamily: fonts.base, fontSize: 14, fontWeight: "700", color: colors.textPrimary, ...tabular },
  tipMeta: { fontFamily: fonts.base, fontSize: 11.5, color: colors.textSecondary, ...tabular },
});
