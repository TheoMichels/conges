import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme/colors';
import { ProgressRing } from './ProgressRing';
import { NumberField } from './NumberField';

type Props = {
  year: string;
  initialLeave: number;
  carriedOver: number;
  csupp: number;
  publicHolidays: number;
  taken: number;
  remaining: number;
  onChangeInitialLeave: (value: number) => void;
  onChangeCarriedOver: (value: number) => void;
  onChangeCsupp: (value: number) => void;
};

export function MobileDashboard({
  year,
  initialLeave,
  carriedOver,
  csupp,
  publicHolidays,
  taken,
  remaining,
  onChangeInitialLeave,
  onChangeCarriedOver,
  onChangeCsupp,
}: Props) {
  const total = initialLeave + carriedOver + csupp + publicHolidays;

  return (
    <View style={styles.card}>
      <View style={styles.ringSection}>
        <ProgressRing taken={taken} remaining={remaining} total={total} />
        <View style={styles.ringStats}>
          <View style={styles.statRow}>
            <View style={[styles.dot, { backgroundColor: colors.brand }]} />
            <Text style={styles.statLabel}>Pris</Text>
            <Text style={styles.statValue}>{taken} j</Text>
          </View>
          <View style={styles.statRow}>
            <View style={[styles.dot, { backgroundColor: '#EDF2F5' }]} />
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{total} j</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <NumberField label="Congés" value={initialLeave} onChange={onChangeInitialLeave} />
        </View>
        <View style={styles.gridItem}>
          <NumberField label="Report" value={carriedOver} onChange={onChangeCarriedOver} />
        </View>
        <View style={styles.gridItem}>
          <NumberField label="Csupp" value={csupp} onChange={onChangeCsupp} />
        </View>
        <View style={styles.gridItem}>
          <View style={styles.readOnlyContainer}>
            <Text style={styles.readOnlyLabel}>Fériés (auto)</Text>
            <View style={styles.readOnlyBox}>
              <Text style={styles.readOnlyValue}>{publicHolidays}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#0B1D33',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
  },
  ringSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 20,
  },
  ringStats: {
    justifyContent: 'center',
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statLabel: {
    fontFamily: fonts.base,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 40,
  },
  statValue: {
    fontFamily: fonts.base,
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  gridItem: {
    flex: 1,
    minWidth: '45%',
  },
  readOnlyContainer: {
    flex: 1,
  },
  readOnlyLabel: {
    fontFamily: fonts.base,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  readOnlyBox: {
    backgroundColor: '#EDF2F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 42,
    justifyContent: 'center',
  },
  readOnlyValue: {
    fontFamily: fonts.base,
    fontSize: 16,
    fontWeight: '700',
    color: colors.brand,
  },
});
