import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native';
import { YearPlan } from '../types/yearPlan';
import { colors, fonts, shape } from '../theme/colors';
import { cursorPointer } from '../theme/webCursor';
import { sortPlansChronologically } from '../utils/yearPlanUtils';

type Props = {
  readOnly?: boolean;
  plans: YearPlan[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onAdd: (year: string) => void;
};

export function YearSelectorMobile({ plans, selectedId, onSelect, onAdd, readOnly = false }: Props) {
  const sortedPlans = sortPlansChronologically(plans);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sortedPlans.map((plan) => {
          const selected = plan.id === selectedId;
          return (
            <Pressable
              key={plan.id}
              style={[styles.chip, selected && styles.chipSelected, cursorPointer]}
              onPress={() => onSelect(plan.id)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {plan.year}
              </Text>
            </Pressable>
          );
        })}
        {!readOnly && <Pressable
          style={[styles.chip, styles.chipAdd, cursorPointer]}
          onPress={() => {
            const nextYear = new Date().getFullYear() + 1;
            onAdd(String(nextYear));
          }}
        >
          <Text style={styles.chipTextAdd}>+ Ajouter</Text>
        </Pressable>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.panel,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: shape.pill,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fonts.base,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  chipTextSelected: {
    color: colors.textOnBrand,
  },
  chipAdd: {
    backgroundColor: 'transparent',
    borderColor: colors.borderDashed,
    borderStyle: 'dashed',
  },
  chipTextAdd: {
    fontFamily: fonts.base,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
