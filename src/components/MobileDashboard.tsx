import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, glassStyle, radius, shadows } from '../theme/colors';
import { formatDayNumber } from '../utils/format';
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
  const isNegative = remaining < 0;

  return (
    <View testID="mobile-dashboard" style={styles.card}>
      <View testID="mobile-dashboard-totals" style={styles.totalsContainer}>
        <View
          testID="mobile-total-remaining"
          style={[
            styles.totalCard,
            isNegative ? styles.totalCardDanger : styles.totalCardPositive,
          ]}
        >
          <Text style={styles.totalLabel}>Restant</Text>
          <Text
            style={[
              styles.totalValue,
              isNegative ? styles.totalValueDanger : styles.totalValuePositive,
            ]}
          >
            {formatDayNumber(remaining)} j
          </Text>
        </View>

        <View testID="mobile-total-taken" style={styles.totalCard}>
          <Text style={styles.totalLabel}>Pris</Text>
          <Text style={[styles.totalValue, styles.totalValuePrimary]}>
            {formatDayNumber(taken)} j
          </Text>
        </View>

        <View testID="mobile-total-entitlement" style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={[styles.totalValue, styles.totalValueBrand]}>
            {formatDayNumber(total)} j
          </Text>
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
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 20,
    ...glassStyle,
    ...shadows.sm,
  },
  totalsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  totalCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalCardPositive: {
    borderLeftWidth: 3,
    borderLeftColor: colors.positive,
  },
  totalCardDanger: {
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  totalLabel: {
    fontFamily: fonts.base,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  totalValue: {
    fontFamily: fonts.base,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  totalValuePositive: {
    color: colors.positive,
  },
  totalValueDanger: {
    color: colors.danger,
  },
  totalValuePrimary: {
    color: colors.primary,
  },
  totalValueBrand: {
    color: colors.brand,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
    backgroundColor: colors.surfaceActive,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  readOnlyValue: {
    fontFamily: fonts.base,
    fontSize: 16,
    fontWeight: '700',
    color: colors.brand,
  },
});
