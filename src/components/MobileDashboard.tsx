import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, shape } from '../theme/colors';
import { NumberField } from './NumberField';
import { formatDayNumber } from '../utils/format';

type Props = {
  readOnly?: boolean;
  holidayIsManual: boolean;
  initialLeave: number;
  carriedOver: number;
  csupp: number;
  publicHolidays: number;
  onChangeInitialLeave: (value: number) => void;
  onChangeCarriedOver: (value: number) => void;
  onChangeCsupp: (value: number) => void;
};

export function MobileDashboard({
  readOnly = false,
  holidayIsManual,
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
          <NumberField readOnly={readOnly} label="Congés" value={initialLeave} onChange={onChangeInitialLeave} />
        </View>
        <View style={styles.gridItem}>
          <NumberField readOnly={readOnly} label="Report" value={carriedOver} onChange={onChangeCarriedOver} />
        </View>
        <View style={styles.gridItem}>
          <NumberField readOnly={readOnly} label="Csupp" value={csupp} onChange={onChangeCsupp} />
        </View>
        <View style={styles.gridItem}>
          <View style={styles.readOnlyContainer}>
            <Text style={styles.readOnlyLabel}>Fériés ({holidayIsManual ? 'manuel' : 'auto'})</Text>
            <View style={styles.readOnlyBox}>
              <Text style={styles.readOnlyValue}>{formatDayNumber(publicHolidays)}</Text>
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
    borderRadius: shape.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
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
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  readOnlyBox: {
    backgroundColor: colors.panelSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 46,
    justifyContent: 'center',
  },
  readOnlyValue: {
    fontFamily: fonts.base,
    fontSize: 16,
    color: colors.textPrimary,
  },
});
