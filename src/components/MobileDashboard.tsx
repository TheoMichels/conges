import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, glassStyle, radius, shadows } from '../theme/colors';
import { NumberField } from './NumberField';

type Props = {
  initialLeave: number;
  carriedOver: number;
  csupp: number;
  publicHolidays: number;
  onChangeInitialLeave: (value: number) => void;
  onChangeCarriedOver: (value: number) => void;
  onChangeCsupp: (value: number) => void;
};

export function MobileDashboard({
  initialLeave,
  carriedOver,
  csupp,
  publicHolidays,
  onChangeInitialLeave,
  onChangeCarriedOver,
  onChangeCsupp,
}: Props) {
  return (
    <View testID="mobile-dashboard" style={styles.card}>
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
    fontWeight: '500',
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
    fontWeight: '500',
    color: colors.brand,
  },
});
