/**
 * TuneWell Neuro-Mood Selector Component
 * 
 * A neuropsychology-based mood selection component.
 * Features:
 * - 9 mood options based on brain science
 * - Minimal, flat, neutral design
 * - Max 3 selections
 * - Info modal with science details
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// ============================================================================
// MOOD DATA - Neuropsychology-based mood categories
// ============================================================================

export interface MoodDetails {
  science: string;
  useCase: string;
  keywords: string;
}

export interface MoodItem {
  id: string;
  label: string;
  shortCaption: string;
  icon: string;
  details: MoodDetails;
}

export const NEURO_MOOD_DATA: MoodItem[] = [
  {
    id: 'mood_happy',
    label: 'Happy / Joyful',
    shortCaption: 'Upbeat, Good Vibes, Dopamine',
    icon: 'emoticon-happy-outline',
    details: {
      science: 'Activates the Nucleus Accumbens (Reward System) and releases Dopamine.',
      useCase: 'Mood boosting, driving, parties.',
      keywords: 'Major key, lively, catchy, bright.',
    },
  },
  {
    id: 'mood_sad',
    label: 'Sad / Melancholic',
    shortCaption: 'Deep, Reflective, Cathartic',
    icon: 'emoticon-sad-outline',
    details: {
      science: "Engages the Amygdala for emotional processing; provides 'safe' pain.",
      useCase: 'Grieving, rainy days, emotional processing.',
      keywords: 'Minor key, slow tempo, acoustic, raw vocals.',
    },
  },
  {
    id: 'mood_energy',
    label: 'Energetic / Pumped',
    shortCaption: 'Workout, Cardio, High BPM',
    icon: 'lightning-bolt-outline',
    details: {
      science: 'Stimulates the Sympathetic Nervous System; increases adrenaline and heart rate.',
      useCase: 'Gym, running, waking up, cleaning.',
      keywords: 'Fast tempo, strong beat, loud, intense.',
    },
  },
  {
    id: 'mood_calm',
    label: 'Calm / Relaxed',
    shortCaption: 'Chill, Sleep, Stress Relief',
    icon: 'tea-outline',
    details: {
      science: 'Activates the Parasympathetic Nervous System; lowers cortisol.',
      useCase: 'Meditation, sleeping, reading, anxiety relief.',
      keywords: 'Slow, ambient, soft, acoustic.',
    },
  },
  {
    id: 'mood_focus',
    label: 'Focus / Flow',
    shortCaption: 'Work, Study, Instrumental',
    icon: 'bullseye-arrow',
    details: {
      science: 'Low cognitive load allows the Prefrontal Cortex to function without distraction.',
      useCase: 'Deep work, coding, studying, reading.',
      keywords: 'Repetitive, instrumental, minimal dynamic range.',
    },
  },
  {
    id: 'mood_angry',
    label: 'Angry / Intense',
    shortCaption: 'Venting, Heavy, Aggressive',
    icon: 'fire',
    details: {
      science: 'Allows for emotional regulation and venting of frustration (Fight response).',
      useCase: 'Heavy lifting, releasing anger, gaming.',
      keywords: 'Distorted, loud, heavy metal, dissonance.',
    },
  },
  {
    id: 'mood_romantic',
    label: 'Romantic / Loving',
    shortCaption: 'Intimate, Warm, Sentimental',
    icon: 'heart-outline',
    details: {
      science: 'Linked to Oxytocin release; enhances feelings of bonding and warmth.',
      useCase: 'Date night, intimate moments, self-love.',
      keywords: 'Soft vocals, slow jams, melodic, warm.',
    },
  },
  {
    id: 'mood_dreamy',
    label: 'Dreamy / Ethereal',
    shortCaption: 'Imagination, Lo-Fi, Spaced-out',
    icon: 'cloud-outline',
    details: {
      science: 'Activates the Default Mode Network (DMN) for wandering thought.',
      useCase: 'Daydreaming, creative thinking, dissociation.',
      keywords: 'Reverb, psychedelic, washed out, spacious.',
    },
  },
  {
    id: 'mood_nostalgic',
    label: 'Nostalgic / Retro',
    shortCaption: 'Memories, Oldies, Flashback',
    icon: 'cassette',
    details: {
      science: 'Heavily engages the Hippocampus to retrieve autobiographical memories.',
      useCase: 'Reminiscing, connecting with the past.',
      keywords: 'Classic hits, specific eras (80s/90s), lo-fi crackle.',
    },
  },
];

// ============================================================================
// INFO MODAL COMPONENT
// ============================================================================

interface InfoModalProps {
  visible: boolean;
  mood: MoodItem | null;
  onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ visible, mood, onClose }) => {
  if (!mood) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={infoStyles.overlay}>
        <View style={infoStyles.container}>
          {/* Header */}
          <View style={infoStyles.header}>
            <MaterialCommunityIcons name={mood.icon} size={28} color="#FFFFFF" />
            <Text style={infoStyles.title}>{mood.label}</Text>
          </View>

          {/* Content */}
          <ScrollView style={infoStyles.content}>
            <View style={infoStyles.section}>
              <View style={infoStyles.sectionHeader}>
                <MaterialCommunityIcons name="brain" size={18} color="#888888" />
                <Text style={infoStyles.sectionTitle}>Neuroscience</Text>
              </View>
              <Text style={infoStyles.sectionText}>{mood.details.science}</Text>
            </View>

            <View style={infoStyles.section}>
              <View style={infoStyles.sectionHeader}>
                <MaterialCommunityIcons name="lightbulb-outline" size={18} color="#888888" />
                <Text style={infoStyles.sectionTitle}>When to Use</Text>
              </View>
              <Text style={infoStyles.sectionText}>{mood.details.useCase}</Text>
            </View>

            <View style={infoStyles.section}>
              <View style={infoStyles.sectionHeader}>
                <MaterialCommunityIcons name="music-note" size={18} color="#888888" />
                <Text style={infoStyles.sectionTitle}>Musical Characteristics</Text>
              </View>
              <Text style={infoStyles.sectionText}>{mood.details.keywords}</Text>
            </View>
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity style={infoStyles.closeButton} onPress={onClose}>
            <Text style={infoStyles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const infoStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionText: {
    fontSize: 15,
    color: '#E5E5E5',
    lineHeight: 22,
  },
  closeButton: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

// ============================================================================
// MOOD ITEM COMPONENT
// ============================================================================

interface MoodItemComponentProps {
  mood: MoodItem;
  isSelected: boolean;
  onToggle: () => void;
  onInfoPress: () => void;
}

const MoodItemComponent: React.FC<MoodItemComponentProps> = ({
  mood,
  isSelected,
  onToggle,
  onInfoPress,
}) => {
  return (
    <View style={[itemStyles.container, isSelected && itemStyles.containerSelected]}>
      {/* Main Touchable Area */}
      <TouchableOpacity
        style={itemStyles.mainArea}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        {/* Icon */}
        <View style={itemStyles.iconContainer}>
          <MaterialCommunityIcons
            name={mood.icon}
            size={24}
            color={isSelected ? '#000000' : '#FFFFFF'}
          />
        </View>

        {/* Text Content */}
        <View style={itemStyles.textContainer}>
          <Text style={[itemStyles.label, isSelected && itemStyles.labelSelected]}>
            {mood.label}
          </Text>
          <Text style={[itemStyles.caption, isSelected && itemStyles.captionSelected]}>
            {mood.shortCaption}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Info Button */}
      <TouchableOpacity
        style={itemStyles.infoButton}
        onPress={onInfoPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialCommunityIcons
          name="information-outline"
          size={22}
          color={isSelected ? '#000000' : '#666666'}
        />
      </TouchableOpacity>
    </View>
  );
};

const itemStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    marginBottom: 8,
    paddingRight: 12,
  },
  containerSelected: {
    backgroundColor: '#F5F5F5',
  },
  mainArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  labelSelected: {
    color: '#000000',
  },
  caption: {
    fontSize: 13,
    color: '#888888',
  },
  captionSelected: {
    color: '#555555',
  },
  infoButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ============================================================================
// NEURO MOOD SELECTOR COMPONENT
// ============================================================================

interface NeuroMoodSelectorProps {
  selectedMoods: string[];
  onMoodsChange: (moods: string[]) => void;
  maxSelections?: number;
}

export const NeuroMoodSelector: React.FC<NeuroMoodSelectorProps> = ({
  selectedMoods,
  onMoodsChange,
  maxSelections = 3,
}) => {
  const [infoModalMood, setInfoModalMood] = useState<MoodItem | null>(null);

  const handleToggle = useCallback(
    (moodId: string) => {
      const isCurrentlySelected = selectedMoods.includes(moodId);

      if (isCurrentlySelected) {
        // Remove from selection
        onMoodsChange(selectedMoods.filter((id) => id !== moodId));
      } else {
        // Check max limit
        if (selectedMoods.length >= maxSelections) {
          Alert.alert(
            'Maximum Reached',
            `You can only select up to ${maxSelections} moods per track.`,
            [{ text: 'OK' }]
          );
          return;
        }
        // Add to selection
        onMoodsChange([...selectedMoods, moodId]);
      }
    },
    [selectedMoods, onMoodsChange, maxSelections]
  );

  const handleInfoPress = useCallback((mood: MoodItem) => {
    setInfoModalMood(mood);
  }, []);

  const closeInfoModal = useCallback(() => {
    setInfoModalMood(null);
  }, []);

  return (
    <View style={selectorStyles.container}>
      {/* Header */}
      <View style={selectorStyles.header}>
        <Text style={selectorStyles.title}>Set Mood</Text>
        <Text style={selectorStyles.subtitle}>
          {selectedMoods.length === 0 
            ? 'Tap to select moods for this track' 
            : `${selectedMoods.length} mood${selectedMoods.length > 1 ? 's' : ''} selected`}
        </Text>
      </View>

      {/* Mood List */}
      <ScrollView
        style={selectorStyles.list}
        contentContainerStyle={selectorStyles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {NEURO_MOOD_DATA.map((mood) => (
          <MoodItemComponent
            key={mood.id}
            mood={mood}
            isSelected={selectedMoods.includes(mood.id)}
            onToggle={() => handleToggle(mood.id)}
            onInfoPress={() => handleInfoPress(mood)}
          />
        ))}
      </ScrollView>

      {/* Info Modal */}
      <InfoModal
        visible={infoModalMood !== null}
        mood={infoModalMood}
        onClose={closeInfoModal}
      />
    </View>
  );
};

const selectorStyles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
  },
  header: {
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
  },
  list: {
    minHeight: 400,
    maxHeight: 500,
  },
  listContent: {
    paddingBottom: 20,
  },
});

export default NeuroMoodSelector;
