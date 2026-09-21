import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts } from '../theme/colors';
import { formatDayNumber } from '../utils/format';

type Props = {
  taken: number;
  remaining: number;
  total: number;
};

export function ProgressRing({ taken, remaining, total }: Props) {
  const size = 140;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  // Cap percent to 1 for the ring
  const safeTotal = total > 0 ? total : 1;
  const percent = Math.min(Math.max(taken / safeTotal, 0), 1);
  const strokeDashoffset = circumference - percent * circumference;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Circle
          stroke="#EDF2F5"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={colors.brand}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.centerText}>
        <Text style={[styles.remainingValue, remaining < 0 && styles.negative]}>
          {formatDayNumber(remaining)}
        </Text>
        <Text style={styles.remainingLabel}>jours restants</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remainingValue: {
    fontFamily: fonts.base,
    fontSize: 28,
    fontWeight: '800',
    color: colors.brand,
  },
  negative: {
    color: colors.danger,
  },
  remainingLabel: {
    fontFamily: fonts.base,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: -2,
  },
});
