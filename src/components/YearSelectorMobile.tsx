import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native';
import { YearPlan } from '../types/yearPlan';
import { colors, fonts } from '../theme/colors';
import { cursorPointer } from '../theme/webCursor';
import { sortPlansChronologically } from '../utils/yearPlanUtils';

type Props = {
  plans: YearPlan[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onAdd: (year: string) => void;
};

export function YearSelectorMobile({ plans, selectedId, onSelect, onAdd }: Props) {
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
        <Pressable
          style={[styles.chip, styles.chipAdd, cursorPointer]}
          onPress={() => {
            const nextYear = new Date().getFullYear() + 1;
            onAdd(String(nextYear));
          }}
        >
          <Text style={styles.chipTextAdd}>+ Ajouter</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#EDF2F5',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  chipText: {
    fontFamily: fonts.base,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.textOnBrand,
  },
  chipAdd: {
    backgroundColor: 'transparent',
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
  },
  chipTextAdd: {
    fontFamily: fonts.base,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
